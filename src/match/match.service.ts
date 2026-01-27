import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../common/database/database.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../common/email/email.service';
import { CreateMatchDto } from './dtos/create-match.dto';
import { UpdateMatchDto } from './dtos/update-match.dto';
import { TossDto } from './dtos/toss.dto';
import { AssignScorerDto } from './dtos/assign-scorer.dto';
import {
  InvitationStatus,
  MatchStatus,
  MatchFormat,
  BallType,
} from '@prisma/client';

@Injectable()
export class MatchService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async create(userId: string, createMatchDto: CreateMatchDto) {
    // Validate teams are different
    if (createMatchDto.team1Id === createMatchDto.team2Id) {
      throw new BadRequestException('Team 1 and Team 2 must be different');
    }

    // Validate custom overs if format is CUSTOM
    if (
      createMatchDto.format === MatchFormat.CUSTOM &&
      !createMatchDto.customOvers
    ) {
      throw new BadRequestException(
        'customOvers is required when format is CUSTOM',
      );
    }

    // Validate overs range
    const minOvers = this.configService.get('match.minOvers') || 2;
    const maxOvers = this.configService.get('match.maxOvers') || 50;

    if (
      createMatchDto.overs < minOvers ||
      createMatchDto.overs > maxOvers
    ) {
      throw new BadRequestException(
        `Overs must be between ${minOvers} and ${maxOvers}`,
      );
    }

    // If tournament match, validate tournament and teams
    if (createMatchDto.tournamentId) {
      const tournament = await this.prisma.tournament.findFirst({
        where: {
          id: createMatchDto.tournamentId,
          creatorId: userId,
          deletedAt: null,
        },
        include: {
          teams: {
            where: {
              status: InvitationStatus.ACCEPTED,
            },
          },
        },
      });

      if (!tournament) {
        throw new NotFoundException(
          'Tournament not found or you do not have permission to create matches',
        );
      }

      const teamIds = tournament.teams.map((tt) => tt.teamId);
      if (
        !teamIds.includes(createMatchDto.team1Id) ||
        !teamIds.includes(createMatchDto.team2Id)
      ) {
        throw new BadRequestException(
          'Both teams must be accepted participants in the tournament',
        );
      }
    }

    // Check if teams exist
    const team1 = await this.prisma.team.findFirst({
      where: {
        id: createMatchDto.team1Id,
        deletedAt: null,
      },
      include: {
        club: {
          include: {
            owner: true,
          },
        },
      },
    });

    const team2 = await this.prisma.team.findFirst({
      where: {
        id: createMatchDto.team2Id,
        deletedAt: null,
      },
      include: {
        club: {
          include: {
            owner: true,
          },
        },
      },
    });

    if (!team1 || !team2) {
      throw new NotFoundException('One or both teams not found');
    }

    const scorerId = createMatchDto.scorerId || userId;
    if (scorerId !== userId) {
      const scorer = await this.prisma.user.findFirst({
        where: {
          id: scorerId,
          deletedAt: null,
        },
      });

      if (!scorer) {
        throw new NotFoundException('Scorer user not found');
      }
    }

    // Create match
    const match = await this.prisma.match.create({
      data: {
        tournamentId: createMatchDto.tournamentId || null,
        team1Id: createMatchDto.team1Id,
        team2Id: createMatchDto.team2Id,
        overs: createMatchDto.overs,
        ballType: createMatchDto.ballType,
        format: createMatchDto.format,
        customOvers:
          createMatchDto.format === MatchFormat.CUSTOM
            ? createMatchDto.customOvers
            : null,
        scheduledDate: new Date(createMatchDto.scheduledDate),
        status: MatchStatus.SCHEDULED,
        scorerId,
        creatorId: userId,
      },
      include: {
        team1: true,
        team2: true,
      },
    });

    // Create match invitations
    const expiryDays =
      this.configService.get('invitations.matchExpiryDays') || 3;
    const invitationExpiresAt = new Date();
    invitationExpiresAt.setDate(invitationExpiresAt.getDate() + expiryDays);

    const team1OwnerId = team1.club.ownerId ?? team1.club.owner?.id;
    const team2OwnerId = team2.club.ownerId ?? team2.club.owner?.id;
    const team1Status =
      team1OwnerId === userId
        ? InvitationStatus.ACCEPTED
        : InvitationStatus.PENDING;
    const team2Status =
      team2OwnerId === userId
        ? InvitationStatus.ACCEPTED
        : InvitationStatus.PENDING;

    await this.prisma.matchInvitation.createMany({
      data: [
        {
          matchId: match.id,
          teamId: createMatchDto.team1Id,
          status: team1Status,
          invitationExpiresAt,
          respondedAt:
            team1Status === InvitationStatus.ACCEPTED ? new Date() : null,
        },
        {
          matchId: match.id,
          teamId: createMatchDto.team2Id,
          status: team2Status,
          invitationExpiresAt,
          respondedAt:
            team2Status === InvitationStatus.ACCEPTED ? new Date() : null,
        },
      ],
    });

    if (scorerId !== userId) {
      await this.prisma.matchScorerInvitation.create({
        data: {
          matchId: match.id,
          scorerId,
          status: InvitationStatus.PENDING,
          invitationExpiresAt,
        },
      });
    }

    this.logger.info('Match created successfully', {
      matchId: match.id,
      creatorId: userId,
      context: MatchService.name,
    });

    return {
      message: 'Match created successfully',
      data: match,
    };
  }

  async findAll(userId: string, tournamentId?: string) {
    const where: any = {
      deletedAt: null,
    };

    if (tournamentId) {
      where.tournamentId = tournamentId;
    }

    const matches = await this.prisma.match.findMany({
      where,
      include: {
        team1: {
          include: {
            club: true,
          },
        },
        team2: {
          include: {
            club: true,
          },
        },
        tournament: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        scheduledDate: 'desc',
      },
    });

    const createdMatches = await this.prisma.match.findMany({
      where: {
        ...where,
        creatorId: userId,
      },
      select: {
        id: true,
        scheduledDate: true,
        status: true,
        team1: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
        team2: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
        scorer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        scorerInvitations: {
          select: {
            id: true,
            matchId: true,
            scorerId: true,
            status: true,
            invitedAt: true,
            invitationExpiresAt: true,
            respondedAt: true,
            createdAt: true,
            updatedAt: true,
            scorer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            invitedAt: 'desc',
          },
        },
      },
      orderBy: {
        scheduledDate: 'desc',
      },
    });

    return {
      message: 'Matches retrieved successfully',
      data: matches,
      createdMatches,
    };
  }

  async findOne(id: string) {
    const match = await this.prisma.match.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        team1: {
          include: {
            club: true,
          },
        },
        team2: {
          include: {
            club: true,
          },
        },
        tournament: {
          select: {
            id: true,
            name: true,
          },
        },
        scorer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        invitations: {
          include: {
            team: true,
          },
        },
        result: true,
      },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    return {
      message: 'Match retrieved successfully',
      data: match,
    };
  }

  async update(id: string, userId: string, updateMatchDto: UpdateMatchDto) {
    // Check if match exists and user is creator
    const match = await this.prisma.match.findFirst({
      where: {
        id,
        creatorId: userId,
        deletedAt: null,
      },
    });

    if (!match) {
      throw new NotFoundException(
        'Match not found or you do not have permission to update it',
      );
    }

    // Cannot update if match has started
    if (match.status !== MatchStatus.SCHEDULED) {
      throw new BadRequestException(
        'Cannot update match after it has started',
      );
    }

    const updateData: any = {};

    if (updateMatchDto.overs !== undefined) updateData.overs = updateMatchDto.overs;
    if (updateMatchDto.ballType !== undefined)
      updateData.ballType = updateMatchDto.ballType;
    if (updateMatchDto.format !== undefined)
      updateData.format = updateMatchDto.format;
    if (updateMatchDto.customOvers !== undefined)
      updateData.customOvers = updateMatchDto.customOvers;
    if (updateMatchDto.scheduledDate !== undefined)
      updateData.scheduledDate = new Date(updateMatchDto.scheduledDate);

    // Update match
    const updatedMatch = await this.prisma.match.update({
      where: { id },
      data: updateData,
      include: {
        team1: true,
        team2: true,
      },
    });

    this.logger.info('Match updated successfully', {
      matchId: id,
      context: MatchService.name,
    });

    return {
      message: 'Match updated successfully',
      data: updatedMatch,
    };
  }

  async remove(id: string, userId: string) {
    // Check if match exists and user is creator
    const match = await this.prisma.match.findFirst({
      where: {
        id,
        creatorId: userId,
        deletedAt: null,
      },
    });

    if (!match) {
      throw new NotFoundException(
        'Match not found or you do not have permission to delete it',
      );
    }

    // Cannot delete if match has started
    if (match.status !== MatchStatus.SCHEDULED) {
      throw new BadRequestException(
        'Cannot delete match after it has started',
      );
    }

    // Soft delete
    await this.prisma.match.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    this.logger.info('Match deleted successfully', {
      matchId: id,
      context: MatchService.name,
    });

    return {
      message: 'Match deleted successfully',
    };
  }

  async assignScorer(
    id: string,
    userId: string,
    assignScorerDto: AssignScorerDto,
  ) {
    // Check if match exists and user is creator
    const match = await this.prisma.match.findFirst({
      where: {
        id,
        creatorId: userId,
        deletedAt: null,
      },
    });

    if (!match) {
      throw new NotFoundException(
        'Match not found or you do not have permission to assign scorer',
      );
    }

    if (match.status !== MatchStatus.SCHEDULED) {
      throw new BadRequestException(
        'Scorer can only be changed before the match starts',
      );
    }

    // Check if scorer user exists
    if (assignScorerDto.scorerId !== userId) {
      const scorer = await this.prisma.user.findFirst({
        where: {
          id: assignScorerDto.scorerId,
          deletedAt: null,
        },
      });

      if (!scorer) {
        throw new NotFoundException('Scorer user not found');
      }
    }

    await this.prisma.matchScorerInvitation.updateMany({
      where: {
        matchId: id,
        status: {
          in: [InvitationStatus.PENDING, InvitationStatus.ACCEPTED],
        },
      },
      data: {
        status: InvitationStatus.WITHDRAWN,
        respondedAt: new Date(),
      },
    });

    const expiryDays =
      this.configService.get('invitations.matchExpiryDays') || 3;
    const invitationExpiresAt = new Date();
    invitationExpiresAt.setDate(invitationExpiresAt.getDate() + expiryDays);

    // Update match
    const updatedMatch = await this.prisma.match.update({
      where: { id },
      data: {
        scorerId: assignScorerDto.scorerId,
      },
    });

    if (assignScorerDto.scorerId !== userId) {
      await this.prisma.matchScorerInvitation.upsert({
        where: {
          matchId_scorerId: {
            matchId: id,
            scorerId: assignScorerDto.scorerId,
          },
        },
        update: {
          status: InvitationStatus.PENDING,
          invitedAt: new Date(),
          invitationExpiresAt,
          respondedAt: null,
        },
        create: {
          matchId: id,
          scorerId: assignScorerDto.scorerId,
          status: InvitationStatus.PENDING,
          invitationExpiresAt,
        },
      });
    }

    this.logger.info('Scorer assigned to match', {
      matchId: id,
      scorerId: assignScorerDto.scorerId,
      context: MatchService.name,
    });

    return {
      message: 'Scorer assigned successfully',
      data: updatedMatch,
    };
  }

  async startMatch(id: string, userId: string) {
    // Check if match exists
    const match = await this.prisma.match.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    // Check if user is scorer
    if (match.scorerId !== userId) {
      throw new ForbiddenException('Only the assigned scorer can start the match');
    }

    // Check if match is in correct status
    if (match.status !== MatchStatus.SCHEDULED) {
      throw new BadRequestException('Match can only be started from SCHEDULED status');
    }

    if (!match.scorerId) {
      throw new BadRequestException('Scorer must be assigned before starting the match');
    }

    if (match.scorerId !== match.creatorId) {
      const scorerInvitation = await this.prisma.matchScorerInvitation.findFirst({
        where: {
          matchId: id,
          scorerId: match.scorerId,
          status: InvitationStatus.ACCEPTED,
        },
      });

      if (!scorerInvitation) {
        throw new BadRequestException(
          'Scorer must accept the invitation before starting the match',
        );
      }
    }

    // Check if both teams have accepted invitations
    const invitations = await this.prisma.matchInvitation.findMany({
      where: {
        matchId: id,
      },
    });

    const acceptedCount = invitations.filter(
      (inv) => inv.status === InvitationStatus.ACCEPTED,
    ).length;

    if (acceptedCount < 2) {
      throw new BadRequestException(
        'Both teams must accept the invitation before starting the match',
      );
    }

    // Update match status to TOSS
    const updatedMatch = await this.prisma.match.update({
      where: { id },
      data: {
        status: MatchStatus.TOSS,
      },
    });

    this.logger.info('Match started (toss phase)', {
      matchId: id,
      context: MatchService.name,
    });

    return {
      message: 'Match started successfully. Please record toss result.',
      data: updatedMatch,
    };
  }

  async recordToss(id: string, userId: string, tossDto: TossDto) {
    // Check if match exists
    const match = await this.prisma.match.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    // Check if user is scorer
    if (match.scorerId !== userId) {
      throw new ForbiddenException(
        'Only the assigned scorer can record toss',
      );
    }

    // Check if match is in TOSS status
    if (match.status !== MatchStatus.TOSS) {
      throw new BadRequestException(
        'Toss can only be recorded when match is in TOSS status',
      );
    }

    // Validate toss winner is one of the teams
    if (tossDto.tossWinnerId !== match.team1Id && tossDto.tossWinnerId !== match.team2Id) {
      throw new BadRequestException('Toss winner must be one of the match teams');
    }

    // Update match
    const updatedMatch = await this.prisma.match.update({
      where: { id },
      data: {
        tossWinnerId: tossDto.tossWinnerId,
        tossDecision: tossDto.tossDecision,
        status: MatchStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
    });

    this.logger.info('Toss recorded', {
      matchId: id,
      tossWinnerId: tossDto.tossWinnerId,
      context: MatchService.name,
    });

    return {
      message: 'Toss recorded successfully',
      data: updatedMatch,
    };
  }

  async getInvitations(matchId: string) {
    const match = await this.prisma.match.findFirst({
      where: {
        id: matchId,
        deletedAt: null,
      },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    const invitations = await this.prisma.matchInvitation.findMany({
      where: {
        matchId,
      },
      include: {
        team: {
          include: {
            club: true,
          },
        },
      },
    });

    return {
      message: 'Match invitations retrieved successfully',
      data: invitations,
    };
  }

  async getScorerInvitations(userId: string) {
    const invitations = await this.prisma.matchScorerInvitation.findMany({
      where: {
        scorerId: userId,
        status: InvitationStatus.PENDING,
        invitationExpiresAt: {
          gt: new Date(),
        },
      },
      include: {
        match: {
          include: {
            team1: true,
            team2: true,
            tournament: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        invitedAt: 'desc',
      },
    });

    return {
      message: 'Scorer invitations retrieved successfully',
      data: invitations,
    };
  }

  async getTeamInvitations(userId: string) {
    const invitations = await this.prisma.matchInvitation.findMany({
      where: {
        status: InvitationStatus.PENDING,
        invitationExpiresAt: {
          gt: new Date(),
        },
        team: {
          club: {
            ownerId: userId,
          },
        },
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            logo: true,
            clubId: true,
          },
        },
        match: {
          include: {
            team1: {
              select: {
                id: true,
                name: true,
                logo: true,
              },
            },
            team2: {
              select: {
                id: true,
                name: true,
                logo: true,
              },
            },
            tournament: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        invitedAt: 'desc',
      },
    });

    return {
      message: 'Team invitations retrieved successfully',
      data: invitations,
    };
  }

  async getMyMatches(userId: string) {
    const matchCardSelect = {
      id: true,
      scheduledDate: true,
      status: true,
      team1: {
        select: {
          id: true,
          name: true,
          logo: true,
        },
      },
      team2: {
        select: {
          id: true,
          name: true,
          logo: true,
        },
      },
      scorer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    };

    const [player, ownedTeams] = await Promise.all([
      this.prisma.player.findUnique({
        where: { userId },
        select: {
          id: true,
          teamMemberships: {
            where: { status: InvitationStatus.ACCEPTED },
            select: { teamId: true },
          },
        },
      }),
      this.prisma.team.findMany({
        where: {
          deletedAt: null,
          club: {
            ownerId: userId,
          },
        },
        select: { id: true },
      }),
    ]);

    const teamIds = player?.teamMemberships.map((m) => m.teamId) ?? [];
    const ownedTeamIds = ownedTeams.map((team) => team.id);

    const [
      createdMatches,
      scorerMatches,
      teamMatches,
      ownerTeamMatches,
      teamInvitations,
      scorerInvitations,
    ] = await Promise.all([
        this.prisma.match.findMany({
          where: {
            creatorId: userId,
            deletedAt: null,
          },
          select: {
            ...matchCardSelect,
            scorerInvitations: {
              select: {
                id: true,
                matchId: true,
                scorerId: true,
                status: true,
                invitedAt: true,
                invitationExpiresAt: true,
                respondedAt: true,
                createdAt: true,
                updatedAt: true,
                scorer: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
              orderBy: {
                invitedAt: 'desc',
              },
            },
          },
          orderBy: {
            scheduledDate: 'desc',
          },
        }),
        this.prisma.match.findMany({
          where: {
            scorerId: userId,
            deletedAt: null,
          },
          select: matchCardSelect,
          orderBy: {
            scheduledDate: 'desc',
          },
        }),
        teamIds.length
          ? this.prisma.match.findMany({
              where: {
                deletedAt: null,
                invitations: {
                  some: {
                    teamId: { in: teamIds },
                    status: InvitationStatus.ACCEPTED,
                  },
                },
              },
              select: matchCardSelect,
              orderBy: {
                scheduledDate: 'desc',
              },
            })
          : Promise.resolve([]),
        ownedTeamIds.length
          ? this.prisma.match.findMany({
              where: {
                deletedAt: null,
                invitations: {
                  some: {
                    teamId: { in: ownedTeamIds },
                    status: InvitationStatus.ACCEPTED,
                  },
                },
              },
              select: matchCardSelect,
              orderBy: {
                scheduledDate: 'desc',
              },
            })
          : Promise.resolve([]),
        this.prisma.matchInvitation.findMany({
          where: {
            status: InvitationStatus.PENDING,
            invitationExpiresAt: {
              gt: new Date(),
            },
            team: {
              club: {
                ownerId: userId,
              },
            },
          },
          include: {
            team: {
              select: {
                id: true,
                name: true,
                logo: true,
                clubId: true,
              },
            },
            match: {
              select: matchCardSelect,
            },
          },
          orderBy: {
            invitedAt: 'desc',
          },
        }),
        this.prisma.matchScorerInvitation.findMany({
          where: {
            scorerId: userId,
            status: InvitationStatus.PENDING,
            invitationExpiresAt: {
              gt: new Date(),
            },
          },
          include: {
            match: {
              select: matchCardSelect,
            },
          },
          orderBy: {
            invitedAt: 'desc',
          },
        }),
      ]);

    return {
      message: 'My matches retrieved successfully',
      data: {
        createdMatches,
        scorerMatches,
        teamMatches,
        ownerTeamMatches,
        teamInvitations,
        scorerInvitations,
      },
    };
  }

  async acceptScorerInvitation(invitationId: string, userId: string) {
    const invitation = await this.prisma.matchScorerInvitation.findFirst({
      where: {
        id: invitationId,
        status: InvitationStatus.PENDING,
        invitationExpiresAt: {
          gt: new Date(),
        },
      },
      include: {
        match: true,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found or has expired');
    }

    if (invitation.scorerId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to accept this invitation',
      );
    }

    if (invitation.match.status !== MatchStatus.SCHEDULED) {
      throw new BadRequestException(
        'Scorer invitation can only be accepted before the match starts',
      );
    }

    const updatedInvitation = await this.prisma.matchScorerInvitation.update({
      where: { id: invitationId },
      data: {
        status: InvitationStatus.ACCEPTED,
        respondedAt: new Date(),
      },
    });

    this.logger.info('Scorer invitation accepted', {
      invitationId,
      matchId: invitation.matchId,
      scorerId: invitation.scorerId,
      context: MatchService.name,
    });

    return {
      message: 'Invitation accepted successfully',
      data: updatedInvitation,
    };
  }

  async rejectScorerInvitation(invitationId: string, userId: string) {
    const invitation = await this.prisma.matchScorerInvitation.findFirst({
      where: {
        id: invitationId,
        status: InvitationStatus.PENDING,
        invitationExpiresAt: {
          gt: new Date(),
        },
      },
      include: {
        match: true,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found or has expired');
    }

    if (invitation.scorerId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to reject this invitation',
      );
    }

    if (invitation.match.status !== MatchStatus.SCHEDULED) {
      throw new BadRequestException(
        'Scorer invitation can only be rejected before the match starts',
      );
    }

    const updatedInvitation = await this.prisma.matchScorerInvitation.update({
      where: { id: invitationId },
      data: {
        status: InvitationStatus.REJECTED,
        respondedAt: new Date(),
      },
    });

    this.logger.info('Scorer invitation rejected', {
      invitationId,
      matchId: invitation.matchId,
      scorerId: invitation.scorerId,
      context: MatchService.name,
    });

    return {
      message: 'Invitation rejected successfully',
      data: updatedInvitation,
    };
  }

  async acceptInvitation(invitationId: string, userId: string) {
    const invitation = await this.prisma.matchInvitation.findFirst({
      where: {
        id: invitationId,
        status: InvitationStatus.PENDING,
        invitationExpiresAt: {
          gt: new Date(),
        },
      },
      include: {
        team: {
          include: {
            club: true,
          },
        },
        match: true,
      },
    });

    if (!invitation) {
      throw new NotFoundException(
        'Invitation not found or has expired',
      );
    }

    // Check if user is club owner
    if (invitation.team.club.ownerId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to accept this invitation',
      );
    }

    // Update invitation status
    const updatedInvitation = await this.prisma.matchInvitation.update({
      where: { id: invitationId },
      data: {
        status: InvitationStatus.ACCEPTED,
        respondedAt: new Date(),
      },
    });

    this.logger.info('Match invitation accepted', {
      invitationId,
      matchId: invitation.matchId,
      teamId: invitation.teamId,
      context: MatchService.name,
    });

    return {
      message: 'Invitation accepted successfully',
      data: updatedInvitation,
    };
  }

  async rejectInvitation(invitationId: string, userId: string) {
    const invitation = await this.prisma.matchInvitation.findFirst({
      where: {
        id: invitationId,
        status: InvitationStatus.PENDING,
        invitationExpiresAt: {
          gt: new Date(),
        },
      },
      include: {
        team: {
          include: {
            club: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException(
        'Invitation not found or has expired',
      );
    }

    // Check if user is club owner
    if (invitation.team.club.ownerId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to reject this invitation',
      );
    }

    // Update invitation status
    const updatedInvitation = await this.prisma.matchInvitation.update({
      where: { id: invitationId },
      data: {
        status: InvitationStatus.REJECTED,
        respondedAt: new Date(),
      },
    });

    this.logger.info('Match invitation rejected', {
      invitationId,
      matchId: invitation.matchId,
      teamId: invitation.teamId,
      context: MatchService.name,
    });

    return {
      message: 'Invitation rejected successfully',
      data: updatedInvitation,
    };
  }

  async getResult(matchId: string) {
    const match = await this.prisma.match.findFirst({
      where: {
        id: matchId,
        deletedAt: null,
      },
      include: {
        result: {
          include: {
            winningTeam: {
              include: {
                club: true,
              },
            },
          },
        },
        team1: {
          include: {
            club: true,
          },
        },
        team2: {
          include: {
            club: true,
          },
        },
      },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    if (!match.result) {
      return {
        message: 'Match result not available yet',
        data: null,
      };
    }

    return {
      message: 'Match result retrieved successfully',
      data: match.result,
    };
  }
}

