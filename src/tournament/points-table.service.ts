import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../common/database/database.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Prisma } from '@prisma/client';
import { InvitationStatus, MatchStatus } from '@prisma/client';

@Injectable()
export class PointsTableService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async getPointsTable(tournamentId: string) {
    const tournament = await this.prisma.tournament.findFirst({
      where: {
        id: tournamentId,
        deletedAt: null,
      },
      include: {
        pointsTable: {
          include: {
            entries: {
              include: {
                team: {
                  include: {
                    club: true,
                  },
                },
              },
              orderBy: [
                { points: 'desc' },
                { netRunRate: 'desc' },
              ],
            },
          },
        },
      },
    });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    if (!tournament.pointsTable) {
      throw new NotFoundException('Points table not found for tournament');
    }

    return {
      message: 'Points table retrieved successfully',
      data: {
        tournament: {
          id: tournament.id,
          name: tournament.name,
        },
        entries: tournament.pointsTable.entries,
      },
    };
  }

  async calculatePointsTable(tournamentId: string) {
    const tournament = await this.prisma.tournament.findFirst({
      where: {
        id: tournamentId,
        deletedAt: null,
      },
      include: {
        pointsTable: {
          include: {
            entries: true,
          },
        },
        teams: {
          where: {
            status: InvitationStatus.ACCEPTED,
          },
          include: {
            team: true,
          },
        },
      },
    });

    if (!tournament || !tournament.pointsTable) {
      throw new NotFoundException('Tournament or points table not found');
    }

    // Get all completed matches for this tournament
    const matches = await this.prisma.match.findMany({
      where: {
        tournamentId,
        status: MatchStatus.COMPLETED,
        deletedAt: null,
      },
      include: {
        result: true,
      },
    });

    // Reset all entries
    await this.prisma.pointsTableEntry.updateMany({
      where: {
        pointsTableId: tournament.pointsTable.id,
      },
      data: {
        matchesPlayed: 0,
        matchesWon: 0,
        matchesLost: 0,
        matchesTied: 0,
        points: 0,
        netRunRate: new Prisma.Decimal(0),
        runsScored: 0,
        runsConceded: 0,
        oversFaced: new Prisma.Decimal(0),
        oversBowled: new Prisma.Decimal(0),
      },
    });

    // Calculate points for each match
    for (const match of matches) {
      if (!match.result || match.result.isAbandoned) {
        continue; // Skip abandoned matches
      }

      const team1Id = match.team1Id;
      const team2Id = match.team2Id;

      // Get or create entries for both teams
      const entry1 = await this.ensureEntry(
        tournament.pointsTable.id,
        team1Id,
      );
      const entry2 = await this.ensureEntry(
        tournament.pointsTable.id,
        team2Id,
      );

      // Update matches played
      await this.prisma.pointsTableEntry.update({
        where: { id: entry1.id },
        data: {
          matchesPlayed: { increment: 1 },
          runsScored: { increment: match.result.team1Score },
          runsConceded: { increment: match.result.team2Score },
          oversFaced: {
            increment: new Prisma.Decimal(match.result.team1Overs.toString()),
          },
          oversBowled: {
            increment: new Prisma.Decimal(match.result.team2Overs.toString()),
          },
        },
      });

      await this.prisma.pointsTableEntry.update({
        where: { id: entry2.id },
        data: {
          matchesPlayed: { increment: 1 },
          runsScored: { increment: match.result.team2Score },
          runsConceded: { increment: match.result.team1Score },
          oversFaced: {
            increment: new Prisma.Decimal(match.result.team2Overs.toString()),
          },
          oversBowled: {
            increment: new Prisma.Decimal(match.result.team1Overs.toString()),
          },
        },
      });

      // Update wins/losses/ties
      if (match.result.isTie) {
        await this.prisma.pointsTableEntry.update({
          where: { id: entry1.id },
          data: {
            matchesTied: { increment: 1 },
            points: { increment: 1 },
          },
        });
        await this.prisma.pointsTableEntry.update({
          where: { id: entry2.id },
          data: {
            matchesTied: { increment: 1 },
            points: { increment: 1 },
          },
        });
      } else if (match.result.winningTeamId === team1Id) {
        await this.prisma.pointsTableEntry.update({
          where: { id: entry1.id },
          data: {
            matchesWon: { increment: 1 },
            points: { increment: 2 },
          },
        });
        await this.prisma.pointsTableEntry.update({
          where: { id: entry2.id },
          data: {
            matchesLost: { increment: 1 },
            points: { increment: 0 },
          },
        });
      } else if (match.result.winningTeamId === team2Id) {
        await this.prisma.pointsTableEntry.update({
          where: { id: entry2.id },
          data: {
            matchesWon: { increment: 1 },
            points: { increment: 2 },
          },
        });
        await this.prisma.pointsTableEntry.update({
          where: { id: entry1.id },
          data: {
            matchesLost: { increment: 1 },
            points: { increment: 0 },
          },
        });
      }
    }

    // Calculate NRR for all entries
    const entries = await this.prisma.pointsTableEntry.findMany({
      where: {
        pointsTableId: tournament.pointsTable.id,
      },
    });

    for (const entry of entries) {
      const nrr = this.calculateNRR(
        entry.runsScored,
        entry.runsConceded,
        entry.oversFaced.toNumber(),
        entry.oversBowled.toNumber(),
      );

      await this.prisma.pointsTableEntry.update({
        where: { id: entry.id },
        data: {
          netRunRate: new Prisma.Decimal(nrr),
        },
      });
    }

    this.logger.info('Points table calculated successfully', {
      tournamentId,
      context: PointsTableService.name,
    });

    return {
      message: 'Points table calculated successfully',
    };
  }

  private async ensureEntry(
    pointsTableId: string,
    teamId: string,
  ): Promise<any> {
    const entry = await this.prisma.pointsTableEntry.findUnique({
      where: {
        pointsTableId_teamId: {
          pointsTableId,
          teamId,
        },
      },
    });

    if (entry) {
      return entry;
    }

    return this.prisma.pointsTableEntry.create({
      data: {
        pointsTableId,
        teamId,
      },
    });
  }

  private calculateNRR(
    runsScored: number,
    runsConceded: number,
    oversFaced: number,
    oversBowled: number,
  ): number {
    if (oversFaced === 0 || oversBowled === 0) {
      return 0;
    }

    const runRateFor = runsScored / oversFaced;
    const runRateAgainst = runsConceded / oversBowled;

    return parseFloat((runRateFor - runRateAgainst).toFixed(4));
  }
}

