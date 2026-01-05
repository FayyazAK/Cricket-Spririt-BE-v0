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
import { CreateTournamentDto } from './dtos/create-tournament.dto';
import { UpdateTournamentDto } from './dtos/update-tournament.dto';
import { AddTeamToTournamentDto } from './dtos/add-team-to-tournament.dto';
import {
  InvitationStatus,
  TournamentStatus,
  MatchFormat,
} from '@prisma/client';

@Injectable()
export class TournamentService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async create(userId: string, createTournamentDto: CreateTournamentDto) {
    // Validate custom overs for CUSTOM format
    if (
      createTournamentDto.format === MatchFormat.CUSTOM &&
      !createTournamentDto.customOvers
    ) {
      throw new BadRequestException(
        'customOvers is required when format is CUSTOM',
      );
    }

    // Validate custom overs range
    if (createTournamentDto.customOvers) {
      const minOvers = this.configService.get('match.minOvers') || 2;
      const maxOvers = this.configService.get('match.maxOvers') || 50;

      if (
        createTournamentDto.customOvers < minOvers ||
        createTournamentDto.customOvers > maxOvers
      ) {
        throw new BadRequestException(
          `customOvers must be between ${minOvers} and ${maxOvers}`,
        );
      }
    }

    // Create tournament
    const tournament = await this.prisma.tournament.create({
      data: {
        name: createTournamentDto.name,
        coverPicture: createTournamentDto.coverPicture,
        profilePicture: createTournamentDto.profilePicture,
        format: createTournamentDto.format,
        customOvers:
          createTournamentDto.format === MatchFormat.CUSTOM
            ? createTournamentDto.customOvers
            : null,
        creatorId: userId,
        status: TournamentStatus.DRAFT,
      },
    });

    // Create points table
    await this.prisma.pointsTable.create({
      data: {
        tournamentId: tournament.id,
      },
    });

    this.logger.info('Tournament created successfully', {
      tournamentId: tournament.id,
      creatorId: userId,
      context: TournamentService.name,
    });

    return {
      message: 'Tournament created successfully',
      data: tournament,
    };
  }

  async findAll() {
    const tournaments = await this.prisma.tournament.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      message: 'Tournaments retrieved successfully',
      data: tournaments,
    };
  }

  async findOne(id: string) {
    const tournament = await this.prisma.tournament.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        teams: {
          where: {
            status: InvitationStatus.ACCEPTED,
          },
          include: {
            team: {
              include: {
                club: true,
              },
            },
          },
        },
      },
    });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    return {
      message: 'Tournament retrieved successfully',
      data: tournament,
    };
  }

  async update(
    id: string,
    userId: string,
    updateTournamentDto: UpdateTournamentDto,
  ) {
    // Check if tournament exists and user is creator
    const tournament = await this.prisma.tournament.findFirst({
      where: {
        id,
        creatorId: userId,
        deletedAt: null,
      },
    });

    if (!tournament) {
      throw new NotFoundException(
        'Tournament not found or you do not have permission to update it',
      );
    }

    // Cannot update if tournament has started
    if (tournament.status !== TournamentStatus.DRAFT) {
      throw new BadRequestException(
        'Cannot update tournament after it has started',
      );
    }

    const updateData: any = {};

    if (updateTournamentDto.name !== undefined)
      updateData.name = updateTournamentDto.name;
    if (updateTournamentDto.coverPicture !== undefined)
      updateData.coverPicture = updateTournamentDto.coverPicture;
    if (updateTournamentDto.profilePicture !== undefined)
      updateData.profilePicture = updateTournamentDto.profilePicture;
    if (updateTournamentDto.format !== undefined)
      updateData.format = updateTournamentDto.format;
    if (updateTournamentDto.customOvers !== undefined)
      updateData.customOvers = updateTournamentDto.customOvers;

    // Update tournament
    const updatedTournament = await this.prisma.tournament.update({
      where: { id },
      data: updateData,
    });

    this.logger.info('Tournament updated successfully', {
      tournamentId: id,
      context: TournamentService.name,
    });

    return {
      message: 'Tournament updated successfully',
      data: updatedTournament,
    };
  }

  async remove(id: string, userId: string) {
    // Check if tournament exists and user is creator
    const tournament = await this.prisma.tournament.findFirst({
      where: {
        id,
        creatorId: userId,
        deletedAt: null,
      },
    });

    if (!tournament) {
      throw new NotFoundException(
        'Tournament not found or you do not have permission to delete it',
      );
    }

    // Cannot delete if tournament has started
    if (tournament.status !== TournamentStatus.DRAFT) {
      throw new BadRequestException(
        'Cannot delete tournament after it has started',
      );
    }

    // Soft delete
    await this.prisma.tournament.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    this.logger.info('Tournament deleted successfully', {
      tournamentId: id,
      context: TournamentService.name,
    });

    return {
      message: 'Tournament deleted successfully',
    };
  }

  async addTeam(
    tournamentId: string,
    userId: string,
    addTeamDto: AddTeamToTournamentDto,
  ) {
    // Check if tournament exists and user is creator
    const tournament = await this.prisma.tournament.findFirst({
      where: {
        id: tournamentId,
        creatorId: userId,
        deletedAt: null,
      },
    });

    if (!tournament) {
      throw new NotFoundException(
        'Tournament not found or you do not have permission to add teams',
      );
    }

    // Check if team exists
    const team = await this.prisma.team.findFirst({
      where: {
        id: addTeamDto.teamId,
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

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Check if invitation already exists
    const existingInvitation = await this.prisma.tournamentTeam.findUnique({
      where: {
        tournamentId_teamId: {
          tournamentId,
          teamId: addTeamDto.teamId,
        },
      },
    });

    if (existingInvitation) {
      if (existingInvitation.status === InvitationStatus.ACCEPTED) {
        throw new BadRequestException('Team is already in this tournament');
      }
      if (
        existingInvitation.status === InvitationStatus.PENDING &&
        existingInvitation.invitationExpiresAt > new Date()
      ) {
        throw new BadRequestException(
          'Invitation already sent and pending',
        );
      }
    }

    // Calculate expiry date
    const expiryDays =
      this.configService.get('invitations.tournamentExpiryDays') || 7;
    const invitationExpiresAt = new Date();
    invitationExpiresAt.setDate(invitationExpiresAt.getDate() + expiryDays);

    // Check if auto-accept is enabled
    const autoAccept = this.configService.get('invitations.autoAccept') || false;
    const initialStatus = autoAccept ? InvitationStatus.ACCEPTED : InvitationStatus.PENDING;

    // Create or update invitation
    const invitation = await this.prisma.tournamentTeam.upsert({
      where: {
        tournamentId_teamId: {
          tournamentId,
          teamId: addTeamDto.teamId,
        },
      },
      update: {
        status: initialStatus,
        invitedAt: new Date(),
        invitationExpiresAt,
        respondedAt: autoAccept ? new Date() : null,
        withdrawnAt: null,
      },
      create: {
        tournamentId,
        teamId: addTeamDto.teamId,
        status: initialStatus,
        invitationExpiresAt,
        respondedAt: autoAccept ? new Date() : null,
      },
    });

    // Auto-create points table entry if auto-accepting
    if (autoAccept && invitation.status === InvitationStatus.ACCEPTED) {
      const pointsTable = await this.prisma.pointsTable.findUnique({
        where: { tournamentId },
      });

      if (pointsTable) {
        await this.prisma.pointsTableEntry.upsert({
          where: {
            pointsTableId_teamId: {
              pointsTableId: pointsTable.id,
              teamId: addTeamDto.teamId,
            },
          },
          update: {},
          create: {
            pointsTableId: pointsTable.id,
            teamId: addTeamDto.teamId,
          },
        });
      }
    }

    // Send invitation email only if not auto-accepting
    if (!autoAccept) {
      const frontendUrl = this.configService.get('app.frontendUrl') || '';
      const invitationLink = `${frontendUrl}/tournaments/${tournamentId}/invitations/${invitation.id}`;

      await this.emailService.sendTournamentInvitation(
        team.club.owner.email,
        team.name,
        tournament.name,
        invitationLink,
        expiryDays,
      );
    }

    this.logger.info(autoAccept ? 'Tournament invitation auto-accepted' : 'Tournament invitation sent', {
      tournamentId,
      teamId: addTeamDto.teamId,
      invitationId: invitation.id,
      autoAccept,
      context: TournamentService.name,
    });

    return {
      message: autoAccept
        ? 'Team added to tournament successfully'
        : 'Team invitation sent successfully',
      data: invitation,
    };
  }

  async getTeams(tournamentId: string) {
    const tournament = await this.prisma.tournament.findFirst({
      where: {
        id: tournamentId,
        deletedAt: null,
      },
    });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    const teams = await this.prisma.tournamentTeam.findMany({
      where: {
        tournamentId,
        status: InvitationStatus.ACCEPTED,
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
      message: 'Tournament teams retrieved successfully',
      data: teams.map((tt) => tt.team),
    };
  }

  async removeTeam(tournamentId: string, teamId: string, userId: string) {
    // Check if tournament exists and user is creator
    const tournament = await this.prisma.tournament.findFirst({
      where: {
        id: tournamentId,
        creatorId: userId,
        deletedAt: null,
      },
    });

    if (!tournament) {
      throw new NotFoundException(
        'Tournament not found or you do not have permission to remove teams',
      );
    }

    // Remove team from tournament
    await this.prisma.tournamentTeam.deleteMany({
      where: {
        tournamentId,
        teamId,
      },
    });

    this.logger.info('Team removed from tournament', {
      tournamentId,
      teamId,
      context: TournamentService.name,
    });

    return {
      message: 'Team removed from tournament successfully',
    };
  }

  async withdrawTeam(tournamentId: string, teamId: string, userId: string) {
    // Check if tournament exists
    const tournament = await this.prisma.tournament.findFirst({
      where: {
        id: tournamentId,
        deletedAt: null,
      },
    });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    // Check if team exists and user is club owner
    const team = await this.prisma.team.findFirst({
      where: {
        id: teamId,
        deletedAt: null,
      },
      include: {
        club: true,
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (team.club.ownerId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to withdraw this team',
      );
    }

    // Check if team is in tournament
    const tournamentTeam = await this.prisma.tournamentTeam.findUnique({
      where: {
        tournamentId_teamId: {
          tournamentId,
          teamId,
        },
      },
    });

    if (!tournamentTeam) {
      throw new NotFoundException('Team is not in this tournament');
    }

    // Update status to WITHDRAWN
    await this.prisma.tournamentTeam.update({
      where: {
        tournamentId_teamId: {
          tournamentId,
          teamId,
        },
      },
      data: {
        status: InvitationStatus.WITHDRAWN,
        withdrawnAt: new Date(),
      },
    });

    this.logger.info('Team withdrawn from tournament', {
      tournamentId,
      teamId,
      context: TournamentService.name,
    });

    return {
      message: 'Team withdrawn from tournament successfully',
    };
  }

  async getInvitations(tournamentId: string, userId: string) {
    // Check if tournament exists
    const tournament = await this.prisma.tournament.findFirst({
      where: {
        id: tournamentId,
        deletedAt: null,
      },
    });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    // Get all clubs owned by user
    const userClubs = await this.prisma.club.findMany({
      where: {
        ownerId: userId,
        deletedAt: null,
      },
      include: {
        teams: true,
      },
    });

    const userTeamIds = userClubs.flatMap((club) =>
      club.teams.map((team) => team.id),
    );

    // Get invitations for user's teams
    const invitations = await this.prisma.tournamentTeam.findMany({
      where: {
        tournamentId,
        teamId: {
          in: userTeamIds,
        },
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
      orderBy: {
        invitedAt: 'desc',
      },
    });

    return {
      message: 'Tournament invitations retrieved successfully',
      data: invitations,
    };
  }

  async acceptInvitation(invitationId: string, userId: string) {
    const invitation = await this.prisma.tournamentTeam.findFirst({
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
        tournament: true,
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

    // Get points table
    const pointsTable = await this.prisma.pointsTable.findUnique({
      where: { tournamentId: invitation.tournamentId },
    });

    if (!pointsTable) {
      throw new NotFoundException('Points table not found for tournament');
    }

    // Update invitation status
    const updatedInvitation = await this.prisma.tournamentTeam.update({
      where: { id: invitationId },
      data: {
        status: InvitationStatus.ACCEPTED,
        respondedAt: new Date(),
      },
    });

    // Add team to points table
    await this.prisma.pointsTableEntry.upsert({
      where: {
        pointsTableId_teamId: {
          pointsTableId: pointsTable.id,
          teamId: invitation.teamId,
        },
      },
      update: {},
      create: {
        pointsTableId: pointsTable.id,
        teamId: invitation.teamId,
      },
    });

    this.logger.info('Tournament invitation accepted', {
      invitationId,
      tournamentId: invitation.tournamentId,
      teamId: invitation.teamId,
      context: TournamentService.name,
    });

    return {
      message: 'Invitation accepted successfully',
      data: updatedInvitation,
    };
  }

  async rejectInvitation(invitationId: string, userId: string) {
    const invitation = await this.prisma.tournamentTeam.findFirst({
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
    const updatedInvitation = await this.prisma.tournamentTeam.update({
      where: { id: invitationId },
      data: {
        status: InvitationStatus.REJECTED,
        respondedAt: new Date(),
      },
    });

    this.logger.info('Tournament invitation rejected', {
      invitationId,
      tournamentId: invitation.tournamentId,
      teamId: invitation.teamId,
      context: TournamentService.name,
    });

    return {
      message: 'Invitation rejected successfully',
      data: updatedInvitation,
    };
  }
}

