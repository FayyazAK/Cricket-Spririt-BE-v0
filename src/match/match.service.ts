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

    // Check if auto-accept is enabled
    const autoAccept = this.configService.get('invitations.autoAccept') || false;
    const initialStatus = autoAccept ? InvitationStatus.ACCEPTED : InvitationStatus.PENDING;

    await this.prisma.matchInvitation.createMany({
      data: [
        {
          matchId: match.id,
          teamId: createMatchDto.team1Id,
          status: initialStatus,
          invitationExpiresAt,
          respondedAt: autoAccept ? new Date() : null,
        },
        {
          matchId: match.id,
          teamId: createMatchDto.team2Id,
          status: initialStatus,
          invitationExpiresAt,
          respondedAt: autoAccept ? new Date() : null,
        },
      ],
    });

    // Send invitation emails only if not auto-accepting
    if (!autoAccept) {
      const frontendUrl = this.configService.get('app.frontendUrl') || '';
      const matchDetails = `${team1.name} vs ${team2.name} on ${new Date(createMatchDto.scheduledDate).toLocaleDateString()}`;

      // Send to team 1 club owner
      await this.emailService.sendMatchInvitation(
        team1.club.owner.email,
        team1.name,
        matchDetails,
        `${frontendUrl}/matches/${match.id}`,
        expiryDays,
      );

      // Send to team 2 club owner
      await this.emailService.sendMatchInvitation(
        team2.club.owner.email,
        team2.name,
        matchDetails,
        `${frontendUrl}/matches/${match.id}`,
        expiryDays,
      );
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

  async findAll(tournamentId?: string) {
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

    return {
      message: 'Matches retrieved successfully',
      data: matches,
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

    // Check if scorer user exists
    const scorer = await this.prisma.user.findUnique({
      where: {
        id: assignScorerDto.scorerId,
        deletedAt: null,
      },
    });

    if (!scorer) {
      throw new NotFoundException('Scorer user not found');
    }

    // Update match
    const updatedMatch = await this.prisma.match.update({
      where: { id },
      data: {
        scorerId: assignScorerDto.scorerId,
      },
    });

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

