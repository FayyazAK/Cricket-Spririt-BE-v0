import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/database/database.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../common/email/email.service';
import { CreateClubDto } from './dtos/create-club.dto';
import { UpdateClubDto } from './dtos/update-club.dto';
import { AddPlayerToClubDto } from './dtos/add-player-to-club.dto';
import { InvitationStatus } from '@prisma/client';

const MAX_CLUB_PLAYERS = 20;

@Injectable()
export class ClubService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async create(userId: string, createClubDto: CreateClubDto) {
    // Create address
    const address = await this.prisma.address.create({
      data: createClubDto.address,
    });

    // Create club
    const club = await this.prisma.club.create({
      data: {
        name: createClubDto.name,
        profilePicture: createClubDto.profilePicture,
        bio: createClubDto.bio,
        establishedDate: createClubDto.establishedDate
          ? new Date(createClubDto.establishedDate)
          : null,
        addressId: address.id,
        ownerId: userId,
      },
      include: {
        address: true,
      },
    });

    this.logger.info('Club created successfully', {
      clubId: club.id,
      ownerId: userId,
      context: ClubService.name,
    });

    return {
      message: 'Club created successfully',
      data: club,
    };
  }

  async findAll() {
    const clubs = await this.prisma.club.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        address: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      message: 'Clubs retrieved successfully',
      data: clubs,
    };
  }

  async findOne(id: string, userId?: string) {
    const club = await this.prisma.club.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        address: true,
        teams: {
          where: {
            deletedAt: null,
          },
          include: {
            players: {
              where: {
                status: InvitationStatus.ACCEPTED,
              },
              select: {
                id: true,
              },
            },
          },
        },
        players: {
          include: {
            player: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                playerType: true,
                profilePicture: true,
              },
            },
          },
        },
      },
    });

    if (!club) {
      throw new NotFoundException('Club not found');
    }

    const isOwner = userId && club.ownerId === userId;

    // Club players (accepted) - visible to everyone
    const clubPlayers = club.players
      .filter((p) => p.status === InvitationStatus.ACCEPTED)
      .map((p) => ({
        ...p.player,
        joinedAt: p.respondedAt,
      }));

    // Remove the raw players array
    const teamsWithCounts = club.teams.map((team) => ({
      ...team,
      playerCount: team.players.length,
    }));

    const { players: _, teams, ...clubData } = club;

    // Base response for all users
    const response: any = {
      ...clubData,
      teams: teamsWithCounts,
      clubPlayers,
      playerStats: {
        total: clubPlayers.length,
        maxPlayers: MAX_CLUB_PLAYERS,
      },
    };

    // Add pending and rejected players only for club owner
    if (isOwner) {
      const pendingPlayers = club.players
        .filter((p) => p.status === InvitationStatus.PENDING && p.invitationExpiresAt > new Date())
        .map((p) => ({
          ...p.player,
          invitedAt: p.invitedAt,
          invitationExpiresAt: p.invitationExpiresAt,
        }));

      const rejectedPlayers = club.players
        .filter((p) => p.status === InvitationStatus.REJECTED)
        .map((p) => ({
          ...p.player,
          rejectedAt: p.respondedAt,
        }));

      response.pendingPlayers = pendingPlayers;
      response.rejectedPlayers = rejectedPlayers;
      response.playerStats.pending = pendingPlayers.length;
      response.playerStats.rejected = rejectedPlayers.length;
    }

    return {
      message: 'Club retrieved successfully',
      data: response,
    };
  }

  async update(id: string, userId: string, updateClubDto: UpdateClubDto) {
    // Check if club exists and user is owner
    const club = await this.prisma.club.findFirst({
      where: {
        id,
        ownerId: userId,
        deletedAt: null,
      },
    });

    if (!club) {
      throw new NotFoundException(
        'Club not found or you do not have permission to update it',
      );
    }

    const updateData: any = {};

    if (updateClubDto.name !== undefined) updateData.name = updateClubDto.name;
    if (updateClubDto.profilePicture !== undefined)
      updateData.profilePicture = updateClubDto.profilePicture;
    if (updateClubDto.bio !== undefined) updateData.bio = updateClubDto.bio;
    if (updateClubDto.establishedDate !== undefined)
      updateData.establishedDate = updateClubDto.establishedDate
        ? new Date(updateClubDto.establishedDate)
        : null;

    // Update address if provided
    if (updateClubDto.address) {
      await this.prisma.address.update({
        where: { id: club.addressId },
        data: updateClubDto.address,
      });
    }

    // Update club
    const updatedClub = await this.prisma.club.update({
      where: { id },
      data: updateData,
      include: {
        address: true,
      },
    });

    this.logger.info('Club updated successfully', {
      clubId: id,
      context: ClubService.name,
    });

    return {
      message: 'Club updated successfully',
      data: updatedClub,
    };
  }

  async remove(id: string, userId: string) {
    // Check if club exists and user is owner
    const club = await this.prisma.club.findFirst({
      where: {
        id,
        ownerId: userId,
        deletedAt: null,
      },
      include: {
        teams: {
          where: {
            deletedAt: null,
          },
        },
      },
    });

    if (!club) {
      throw new NotFoundException(
        'Club not found or you do not have permission to delete it',
      );
    }

    // Check if club has active teams
    if (club.teams.length > 0) {
      throw new BadRequestException(
        'Cannot delete club with active teams. Please delete all teams first.',
      );
    }

    // Soft delete
    await this.prisma.club.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    this.logger.info('Club deleted successfully', {
      clubId: id,
      context: ClubService.name,
    });

    return {
      message: 'Club deleted successfully',
    };
  }

  async getTeams(id: string) {
    const club = await this.prisma.club.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!club) {
      throw new NotFoundException('Club not found');
    }

    const teams = await this.prisma.team.findMany({
      where: {
        clubId: id,
        deletedAt: null,
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

  // ============================================
  // CLUB PLAYER MANAGEMENT
  // ============================================

  async addPlayer(clubId: string, userId: string, addPlayerDto: AddPlayerToClubDto) {
    // Check if club exists and user is owner
    const club = await this.prisma.club.findFirst({
      where: {
        id: clubId,
        ownerId: userId,
        deletedAt: null,
      },
    });

    if (!club) {
      throw new NotFoundException(
        'Club not found or you do not have permission to add players to it',
      );
    }

    // Check max players limit
    const currentPlayerCount = await this.prisma.playerClub.count({
      where: {
        clubId,
        status: InvitationStatus.ACCEPTED,
      },
    });

    if (currentPlayerCount >= MAX_CLUB_PLAYERS) {
      throw new BadRequestException(
        `Club has reached maximum player limit (${MAX_CLUB_PLAYERS})`,
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
    const existingInvitation = await this.prisma.playerClub.findUnique({
      where: {
        playerId_clubId: {
          playerId: addPlayerDto.playerId,
          clubId,
        },
      },
    });

    if (existingInvitation) {
      if (existingInvitation.status === InvitationStatus.ACCEPTED) {
        throw new BadRequestException('Player is already in this club');
      }
      if (
        existingInvitation.status === InvitationStatus.PENDING &&
        existingInvitation.invitationExpiresAt > new Date()
      ) {
        throw new BadRequestException('Invitation already sent and pending');
      }
    }

    // Calculate expiry date
    const expiryDays = this.configService.get('invitations.clubExpiryDays') || 2;
    const invitationExpiresAt = new Date();
    invitationExpiresAt.setDate(invitationExpiresAt.getDate() + expiryDays);

    // Create or update invitation
    const invitation = await this.prisma.playerClub.upsert({
      where: {
        playerId_clubId: {
          playerId: addPlayerDto.playerId,
          clubId,
        },
      },
      update: {
        status: InvitationStatus.PENDING,
        invitedAt: new Date(),
        invitationExpiresAt,
        respondedAt: null,
      },
      create: {
        playerId: addPlayerDto.playerId,
        clubId,
        status: InvitationStatus.PENDING,
        invitationExpiresAt,
      },
    });

    // Send invitation email
    const frontendUrl = this.configService.get('app.frontendUrl') || '';
    const invitationLink = `${frontendUrl}/clubs/${clubId}/invitations/${invitation.id}`;

    await this.emailService.sendClubInvitation(
      player.user.email,
      `${player.firstName} ${player.lastName}`,
      club.name,
      invitationLink,
      expiryDays,
    );

    this.logger.info('Club invitation sent', {
      clubId,
      playerId: addPlayerDto.playerId,
      invitationId: invitation.id,
      context: ClubService.name,
    });

    return {
      message: 'Player invitation sent successfully',
      data: invitation,
    };
  }

  async getPlayers(clubId: string, status?: InvitationStatus) {
    const club = await this.prisma.club.findFirst({
      where: {
        id: clubId,
        deletedAt: null,
      },
    });

    if (!club) {
      throw new NotFoundException('Club not found');
    }

    const whereClause: any = { clubId };
    if (status) {
      whereClause.status = status;
    } else {
      whereClause.status = InvitationStatus.ACCEPTED;
    }

    const playerClubs = await this.prisma.playerClub.findMany({
      where: whereClause,
      include: {
        player: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const totalCount = await this.prisma.playerClub.count({
      where: {
        clubId,
        status: InvitationStatus.ACCEPTED,
      },
    });

    return {
      message: 'Club players retrieved successfully',
      data: {
        totalCount,
        maxPlayers: MAX_CLUB_PLAYERS,
        players: playerClubs.map((pc) => ({
          id: pc.player.id,
          firstName: pc.player.firstName,
          lastName: pc.player.lastName,
          playerType: pc.player.playerType,
          profilePicture: pc.player.profilePicture,
          invitationStatus: pc.status,
          joinedAt: pc.respondedAt,
        })),
      },
    };
  }

  async getInvitations(clubId: string, userId: string, status?: string) {
    // Check if club exists and user is owner
    const club = await this.prisma.club.findFirst({
      where: {
        id: clubId,
        ownerId: userId,
        deletedAt: null,
      },
    });

    if (!club) {
      throw new NotFoundException(
        'Club not found or you do not have permission to view invitations',
      );
    }

    const whereClause: any = { clubId };

    if (status === 'EXPIRED') {
      whereClause.status = InvitationStatus.PENDING;
      whereClause.invitationExpiresAt = { lt: new Date() };
    } else if (status) {
      whereClause.status = status as InvitationStatus;
      if (status === 'PENDING') {
        whereClause.invitationExpiresAt = { gt: new Date() };
      }
    }

    const invitations = await this.prisma.playerClub.findMany({
      where: whereClause,
      include: {
        player: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            playerType: true,
            profilePicture: true,
          },
        },
      },
      orderBy: {
        invitedAt: 'desc',
      },
    });

    return {
      message: 'Club invitations retrieved successfully',
      data: invitations,
    };
  }

  async getPlayerClubInvitations(userId: string) {
    // Get the player for this user
    const player = await this.prisma.player.findFirst({
      where: {
        userId,
        isActive: true,
        deletedAt: null,
      },
    });

    if (!player) {
      throw new NotFoundException('Player profile not found');
    }

    const invitations = await this.prisma.playerClub.findMany({
      where: {
        playerId: player.id,
        status: InvitationStatus.PENDING,
        invitationExpiresAt: { gt: new Date() },
      },
      include: {
        club: {
          include: {
            owner: {
              select: {
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
      message: 'Club invitations retrieved successfully',
      data: invitations,
    };
  }

  async acceptInvitation(invitationId: string, userId: string) {
    const invitation = await this.prisma.playerClub.findFirst({
      where: {
        id: invitationId,
        status: InvitationStatus.PENDING,
        invitationExpiresAt: { gt: new Date() },
      },
      include: {
        player: {
          include: {
            user: true,
          },
        },
        club: true,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found or has expired');
    }

    if (invitation.player.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to accept this invitation',
      );
    }

    // Check max players limit before accepting
    const currentPlayerCount = await this.prisma.playerClub.count({
      where: {
        clubId: invitation.clubId,
        status: InvitationStatus.ACCEPTED,
      },
    });

    if (currentPlayerCount >= MAX_CLUB_PLAYERS) {
      throw new BadRequestException(
        `Club has reached maximum player limit (${MAX_CLUB_PLAYERS})`,
      );
    }

    // Update invitation status
    const updatedInvitation = await this.prisma.playerClub.update({
      where: { id: invitationId },
      data: {
        status: InvitationStatus.ACCEPTED,
        respondedAt: new Date(),
      },
    });

    this.logger.info('Club invitation accepted', {
      invitationId,
      clubId: invitation.clubId,
      playerId: invitation.playerId,
      context: ClubService.name,
    });

    return {
      message: 'Invitation accepted successfully',
      data: updatedInvitation,
    };
  }

  async rejectInvitation(invitationId: string, userId: string) {
    const invitation = await this.prisma.playerClub.findFirst({
      where: {
        id: invitationId,
        status: InvitationStatus.PENDING,
        invitationExpiresAt: { gt: new Date() },
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
      throw new NotFoundException('Invitation not found or has expired');
    }

    if (invitation.player.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to reject this invitation',
      );
    }

    // Update invitation status
    const updatedInvitation = await this.prisma.playerClub.update({
      where: { id: invitationId },
      data: {
        status: InvitationStatus.REJECTED,
        respondedAt: new Date(),
      },
    });

    this.logger.info('Club invitation rejected', {
      invitationId,
      clubId: invitation.clubId,
      playerId: invitation.playerId,
      context: ClubService.name,
    });

    return {
      message: 'Invitation rejected successfully',
      data: updatedInvitation,
    };
  }

  async removePlayer(clubId: string, playerId: string, userId: string) {
    // Check if club exists and user is owner
    const club = await this.prisma.club.findFirst({
      where: {
        id: clubId,
        ownerId: userId,
        deletedAt: null,
      },
    });

    if (!club) {
      throw new NotFoundException(
        'Club not found or you do not have permission to remove players',
      );
    }

    // Remove player from club
    const deleted = await this.prisma.playerClub.deleteMany({
      where: {
        clubId,
        playerId,
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Player not found in this club');
    }

    this.logger.info('Player removed from club', {
      clubId,
      playerId,
      context: ClubService.name,
    });

    return {
      message: 'Player removed from club successfully',
    };
  }

  async leaveClub(clubId: string, userId: string) {
    // Get the player for this user
    const player = await this.prisma.player.findFirst({
      where: {
        userId,
        isActive: true,
        deletedAt: null,
      },
    });

    if (!player) {
      throw new NotFoundException('Player profile not found');
    }

    // Check if club exists
    const club = await this.prisma.club.findFirst({
      where: {
        id: clubId,
        deletedAt: null,
      },
    });

    if (!club) {
      throw new NotFoundException('Club not found');
    }

    // Check if player is a member of the club
    const membership = await this.prisma.playerClub.findFirst({
      where: {
        clubId,
        playerId: player.id,
        status: InvitationStatus.ACCEPTED,
      },
    });

    if (!membership) {
      throw new BadRequestException('You are not a member of this club');
    }

    // Remove player from club
    await this.prisma.playerClub.delete({
      where: {
        id: membership.id,
      },
    });

    this.logger.info('Player left club', {
      clubId,
      playerId: player.id,
      context: ClubService.name,
    });

    return {
      message: 'You have left the club successfully',
    };
  }

  async withdrawInvitation(clubId: string, invitationId: string, userId: string) {
    // Check if club exists and user is owner
    const club = await this.prisma.club.findFirst({
      where: {
        id: clubId,
        ownerId: userId,
        deletedAt: null,
      },
    });

    if (!club) {
      throw new NotFoundException(
        'Club not found or you do not have permission to withdraw invitations',
      );
    }

    const invitation = await this.prisma.playerClub.findFirst({
      where: {
        id: invitationId,
        clubId,
        status: InvitationStatus.PENDING,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Pending invitation not found');
    }

    // Update invitation status
    const updatedInvitation = await this.prisma.playerClub.update({
      where: { id: invitationId },
      data: {
        status: InvitationStatus.WITHDRAWN,
        respondedAt: new Date(),
      },
    });

    this.logger.info('Club invitation withdrawn', {
      invitationId,
      clubId,
      context: ClubService.name,
    });

    return {
      message: 'Invitation withdrawn successfully',
      data: updatedInvitation,
    };
  }

  async resendInvitation(clubId: string, invitationId: string, userId: string) {
    // Check if club exists and user is owner
    const club = await this.prisma.club.findFirst({
      where: {
        id: clubId,
        ownerId: userId,
        deletedAt: null,
      },
    });

    if (!club) {
      throw new NotFoundException(
        'Club not found or you do not have permission to resend invitations',
      );
    }

    const invitation = await this.prisma.playerClub.findFirst({
      where: {
        id: invitationId,
        clubId,
        status: {
          in: [InvitationStatus.REJECTED, InvitationStatus.WITHDRAWN],
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

    // Also check for expired pending invitations
    const expiredInvitation = invitation
      ? null
      : await this.prisma.playerClub.findFirst({
          where: {
            id: invitationId,
            clubId,
            status: InvitationStatus.PENDING,
            invitationExpiresAt: { lt: new Date() },
          },
          include: {
            player: {
              include: {
                user: true,
              },
            },
          },
        });

    const targetInvitation = invitation || expiredInvitation;

    if (!targetInvitation) {
      throw new NotFoundException(
        'Invitation not found or cannot be resent (only rejected, withdrawn, or expired invitations can be resent)',
      );
    }

    // Calculate new expiry date
    const expiryDays = this.configService.get('invitations.clubExpiryDays') || 2;
    const invitationExpiresAt = new Date();
    invitationExpiresAt.setDate(invitationExpiresAt.getDate() + expiryDays);

    // Update invitation
    const updatedInvitation = await this.prisma.playerClub.update({
      where: { id: invitationId },
      data: {
        status: InvitationStatus.PENDING,
        invitedAt: new Date(),
        invitationExpiresAt,
        respondedAt: null,
      },
    });

    // Send invitation email
    const frontendUrl = this.configService.get('app.frontendUrl') || '';
    const invitationLink = `${frontendUrl}/clubs/${clubId}/invitations/${invitationId}`;

    await this.emailService.sendClubInvitation(
      targetInvitation.player.user.email,
      `${targetInvitation.player.firstName} ${targetInvitation.player.lastName}`,
      club.name,
      invitationLink,
      expiryDays,
    );

    this.logger.info('Club invitation resent', {
      invitationId,
      clubId,
      context: ClubService.name,
    });

    return {
      message: 'Invitation resent successfully',
      data: updatedInvitation,
    };
  }
}

