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
import { CreateTeamDto } from './dtos/create-team.dto';
import { UpdateTeamDto } from './dtos/update-team.dto';
import { AddPlayerToTeamDto } from './dtos/add-player-to-team.dto';
import { InvitationStatus } from '@prisma/client';

@Injectable()
export class TeamService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async create(userId: string, createTeamDto: CreateTeamDto) {
    // Check if club exists and user is owner
    const club = await this.prisma.club.findFirst({
      where: {
        id: createTeamDto.clubId,
        ownerId: userId,
        deletedAt: null,
      },
    });

    if (!club) {
      throw new NotFoundException(
        'Club not found or you do not have permission to create teams in it',
      );
    }

    // Create team
    const team = await this.prisma.team.create({
      data: {
        name: createTeamDto.name,
        logo: createTeamDto.logo,
        description: createTeamDto.description,
        clubId: createTeamDto.clubId,
      },
    });

    this.logger.info('Team created successfully', {
      teamId: team.id,
      clubId: createTeamDto.clubId,
      context: TeamService.name,
    });

    return {
      message: 'Team created successfully',
      data: team,
    };
  }

  async findAll() {
    const teams = await this.prisma.team.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        club: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      message: 'Teams retrieved successfully',
      data: teams,
    };
  }

  async findOne(id: string) {
    const team = await this.prisma.team.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        club: true,
        players: {
          where: {
            status: InvitationStatus.ACCEPTED,
          },
          include: {
            player: {
              include: {
                address: true,
              },
            },
          },
        },
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return {
      message: 'Team retrieved successfully',
      data: team,
    };
  }

  async update(id: string, userId: string, updateTeamDto: UpdateTeamDto) {
    // Check if team exists and user is club owner
    const team = await this.prisma.team.findFirst({
      where: {
        id,
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
        'You do not have permission to update this team',
      );
    }

    // Update team
    const updatedTeam = await this.prisma.team.update({
      where: { id },
      data: updateTeamDto,
    });

    this.logger.info('Team updated successfully', {
      teamId: id,
      context: TeamService.name,
    });

    return {
      message: 'Team updated successfully',
      data: updatedTeam,
    };
  }

  async remove(id: string, userId: string) {
    // Check if team exists and user is club owner
    const team = await this.prisma.team.findFirst({
      where: {
        id,
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
        'You do not have permission to delete this team',
      );
    }

    // Soft delete
    await this.prisma.team.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    this.logger.info('Team deleted successfully', {
      teamId: id,
      context: TeamService.name,
    });

    return {
      message: 'Team deleted successfully',
    };
  }

  async addPlayer(
    teamId: string,
    userId: string,
    addPlayerDto: AddPlayerToTeamDto,
  ) {
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
        'You do not have permission to add players to this team',
      );
    }

    // Check if player exists and is active
    const player = await this.prisma.player.findFirst({
      where: {
        id: addPlayerDto.playerId,
        isActive: true,
        deletedAt: null,
      },
      include: {
        user: true,
      },
    });

    if (!player) {
      throw new NotFoundException('Player not found or is inactive');
    }

    // Check if invitation already exists
    const existingInvitation = await this.prisma.playerTeam.findUnique({
      where: {
        playerId_teamId: {
          playerId: addPlayerDto.playerId,
          teamId,
        },
      },
    });

    if (existingInvitation) {
      if (existingInvitation.status === InvitationStatus.ACCEPTED) {
        throw new BadRequestException('Player is already in this team');
      }
      if (
        existingInvitation.status === InvitationStatus.PENDING &&
        existingInvitation.invitationExpiresAt > new Date()
      ) {
        throw new BadRequestException('Invitation already sent and pending');
      }
    }

    // Calculate expiry date
    const expiryDays =
      this.configService.get('invitations.teamExpiryDays') || 2;
    const invitationExpiresAt = new Date();
    invitationExpiresAt.setDate(invitationExpiresAt.getDate() + expiryDays);

    // Check if auto-accept is enabled
    const autoAccept = this.configService.get('invitations.autoAccept') || false;
    const initialStatus = autoAccept ? InvitationStatus.ACCEPTED : InvitationStatus.PENDING;

    // Create or update invitation
    const invitation = await this.prisma.playerTeam.upsert({
      where: {
        playerId_teamId: {
          playerId: addPlayerDto.playerId,
          teamId,
        },
      },
      update: {
        status: initialStatus,
        invitedAt: new Date(),
        invitationExpiresAt,
        respondedAt: autoAccept ? new Date() : null,
      },
      create: {
        playerId: addPlayerDto.playerId,
        teamId,
        status: initialStatus,
        invitationExpiresAt,
        respondedAt: autoAccept ? new Date() : null,
      },
    });

    // Send invitation email only if not auto-accepting
    if (!autoAccept) {
      const frontendUrl = this.configService.get('app.frontendUrl') || '';
      const invitationLink = `${frontendUrl}/teams/${teamId}/invitations/${invitation.id}`;

      await this.emailService.sendTeamInvitation(
        player.user.email,
        `${player.firstName} ${player.lastName}`,
        team.name,
        team.club.name,
        invitationLink,
        expiryDays,
      );
    }

    this.logger.info(autoAccept ? 'Team invitation auto-accepted' : 'Team invitation sent', {
      teamId,
      playerId: addPlayerDto.playerId,
      invitationId: invitation.id,
      autoAccept,
      context: TeamService.name,
    });

    return {
      message: autoAccept
        ? 'Player added to team successfully'
        : 'Player invitation sent successfully',
      data: invitation,
    };
  }

  async getPlayers(teamId: string) {
    const team = await this.prisma.team.findFirst({
      where: {
        id: teamId,
        deletedAt: null,
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const players = await this.prisma.playerTeam.findMany({
      where: {
        teamId,
        status: InvitationStatus.ACCEPTED,
      },
      include: {
        player: {
          include: {
            address: true,
            bowlingTypes: {
              include: {
                bowlingType: true,
              },
            },
          },
        },
      },
    });

    return {
      message: 'Team players retrieved successfully',
      data: players.map((pt) => ({
        ...pt.player,
        invitationStatus: pt.status,
        joinedAt: pt.respondedAt,
      })),
    };
  }

  async removePlayer(teamId: string, playerId: string, userId: string) {
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
        'You do not have permission to remove players from this team',
      );
    }

    // Remove player from team
    await this.prisma.playerTeam.deleteMany({
      where: {
        teamId,
        playerId,
      },
    });

    this.logger.info('Player removed from team', {
      teamId,
      playerId,
      context: TeamService.name,
    });

    return {
      message: 'Player removed from team successfully',
    };
  }

  async getInvitations(playerId: string) {
    const invitations = await this.prisma.playerTeam.findMany({
      where: {
        playerId,
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
      message: 'Team invitations retrieved successfully',
      data: invitations,
    };
  }

  async acceptInvitation(invitationId: string, userId: string) {
    const invitation = await this.prisma.playerTeam.findFirst({
      where: {
        id: invitationId,
        status: InvitationStatus.PENDING,
        invitationExpiresAt: {
          gt: new Date(),
        },
      },
      include: {
        player: {
          include: {
            user: true,
          },
        },
        team: true,
      },
    });

    if (!invitation) {
      throw new NotFoundException(
        'Invitation not found or has expired',
      );
    }

    if (invitation.player.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to accept this invitation',
      );
    }

    // Update invitation status
    const updatedInvitation = await this.prisma.playerTeam.update({
      where: { id: invitationId },
      data: {
        status: InvitationStatus.ACCEPTED,
        respondedAt: new Date(),
      },
    });

    this.logger.info('Team invitation accepted', {
      invitationId,
      teamId: invitation.teamId,
      playerId: invitation.playerId,
      context: TeamService.name,
    });

    return {
      message: 'Invitation accepted successfully',
      data: updatedInvitation,
    };
  }

  async rejectInvitation(invitationId: string, userId: string) {
    const invitation = await this.prisma.playerTeam.findFirst({
      where: {
        id: invitationId,
        status: InvitationStatus.PENDING,
        invitationExpiresAt: {
          gt: new Date(),
        },
      },
      include: {
        player: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException(
        'Invitation not found or has expired',
      );
    }

    if (invitation.player.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to reject this invitation',
      );
    }

    // Update invitation status
    const updatedInvitation = await this.prisma.playerTeam.update({
      where: { id: invitationId },
      data: {
        status: InvitationStatus.REJECTED,
        respondedAt: new Date(),
      },
    });

    this.logger.info('Team invitation rejected', {
      invitationId,
      teamId: invitation.teamId,
      playerId: invitation.playerId,
      context: TeamService.name,
    });

    return {
      message: 'Invitation rejected successfully',
      data: updatedInvitation,
    };
  }
}

