import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../common/database/database.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { RedisService } from '../common/redis/redis.service';
import { CreatePlayerDto } from './dtos/create-player.dto';
import { UpdatePlayerDto } from './dtos/update-player.dto';
import { PlayerFilterDto } from './dtos/player-filter.dto';
import { Gender, PlayerType, InvitationStatus } from '@prisma/client';

@Injectable()
export class PlayerService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly redis: RedisService,
  ) {}

  async register(userId: string, createPlayerDto: CreatePlayerDto) {
    // Check if user already has a player profile
    const existingPlayer = await this.prisma.player.findUnique({
      where: { userId },
    });

    if (existingPlayer && existingPlayer.isActive) {
      throw new BadRequestException('User already has an active player profile');
    }

    // Create address
    const address = await this.prisma.address.create({
      data: createPlayerDto.address,
    });

    // Create player
    const player = await this.prisma.player.create({
      data: {
        userId,
        firstName: createPlayerDto.firstName,
        lastName: createPlayerDto.lastName,
        gender: createPlayerDto.gender || Gender.MALE,
        dateOfBirth: new Date(createPlayerDto.dateOfBirth),
        profilePicture: createPlayerDto.profilePicture,
        playerType: createPlayerDto.playerType,
        isWicketKeeper: createPlayerDto.isWicketKeeper || false,
        batHand: createPlayerDto.batHand,
        bowlHand:
          createPlayerDto.playerType === PlayerType.BATSMAN
            ? null
            : createPlayerDto.bowlHand || null,
        addressId: address.id,
        isActive: true,
      },
      include: {
        address: true,
        bowlingTypes: {
          include: {
            bowlingType: true,
          },
        },
      },
    });

    // Add bowling types if provided
    if (
      createPlayerDto.bowlingTypeIds &&
      createPlayerDto.bowlingTypeIds.length > 0
    ) {
      // Validate bowling types are for bowlers/all-rounders
      if (createPlayerDto.playerType === PlayerType.BATSMAN) {
        throw new BadRequestException(
          'Batsmen cannot have bowling types assigned',
        );
      }

      await this.prisma.playerBowlingType.createMany({
        data: createPlayerDto.bowlingTypeIds.map((bowlingTypeId) => ({
          playerId: player.id,
          bowlingTypeId,
        })),
        skipDuplicates: true,
      });
    }

    // Refresh player with bowling types
    const playerWithTypes = await this.prisma.player.findUnique({
      where: { id: player.id },
      include: {
        address: true,
        bowlingTypes: {
          include: {
            bowlingType: true,
          },
        },
      },
    });

    this.logger.info('Player registered successfully', {
      playerId: player.id,
      userId,
      context: PlayerService.name,
    });

    return {
      message: 'Player registered successfully',
      data: this.transformPlayer(playerWithTypes),
    };
  }

  async findAll(filters: PlayerFilterDto) {
    const where: any = {
      isActive: true,
      deletedAt: null,
    };

    // Address filters
    if (filters.city || filters.state || filters.country || filters.townSuburb) {
      where.address = {};
      if (filters.city) where.address.city = filters.city;
      if (filters.state) where.address.state = filters.state;
      if (filters.country) where.address.country = filters.country;
      if (filters.townSuburb)
        where.address.townSuburb = filters.townSuburb;
    }

    // Player type filter
    if (filters.playerType) {
      where.playerType = filters.playerType;
    }

    // Search filter
    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const players = await this.prisma.player.findMany({
      where,
      include: {
        address: true,
        bowlingTypes: {
          include: {
            bowlingType: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      message: 'Players retrieved successfully',
      data: players.map((p) => this.transformPlayer(p)),
    };
  }

  async findOne(id: string) {
    const player = await this.prisma.player.findFirst({
      where: {
        id,
        isActive: true,
        deletedAt: null,
      },
      include: {
        address: true,
        bowlingTypes: {
          include: {
            bowlingType: true,
          },
        },
      },
    });

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    return {
      message: 'Player retrieved successfully',
      data: this.transformPlayer(player),
    };
  }

  async update(id: string, userId: string, updatePlayerDto: UpdatePlayerDto) {
    // Check if player exists and belongs to user
    const player = await this.prisma.player.findFirst({
      where: {
        id,
        userId,
        isActive: true,
        deletedAt: null,
      },
    });

    if (!player) {
      throw new NotFoundException('Player not found or you do not have permission to update it');
    }

    const updateData: any = {};

    // Update basic fields
    if (updatePlayerDto.firstName !== undefined)
      updateData.firstName = updatePlayerDto.firstName;
    if (updatePlayerDto.lastName !== undefined)
      updateData.lastName = updatePlayerDto.lastName;
    if (updatePlayerDto.gender !== undefined)
      updateData.gender = updatePlayerDto.gender;
    if (updatePlayerDto.dateOfBirth !== undefined)
      updateData.dateOfBirth = new Date(updatePlayerDto.dateOfBirth);
    if (updatePlayerDto.profilePicture !== undefined)
      updateData.profilePicture = updatePlayerDto.profilePicture;
    if (updatePlayerDto.playerType !== undefined)
      updateData.playerType = updatePlayerDto.playerType;
    if (updatePlayerDto.isWicketKeeper !== undefined)
      updateData.isWicketKeeper = updatePlayerDto.isWicketKeeper;
    if (updatePlayerDto.batHand !== undefined)
      updateData.batHand = updatePlayerDto.batHand;
    if (updatePlayerDto.bowlHand !== undefined)
      updateData.bowlHand = updatePlayerDto.bowlHand;

    // Update address if provided
    if (updatePlayerDto.address) {
      await this.prisma.address.update({
        where: { id: player.addressId },
        data: updatePlayerDto.address,
      });
    }

    // Update bowling types if provided
    if (updatePlayerDto.bowlingTypeIds !== undefined) {
      // Remove existing bowling types
      await this.prisma.playerBowlingType.deleteMany({
        where: { playerId: id },
      });

      // Add new bowling types
      if (updatePlayerDto.bowlingTypeIds.length > 0) {
        await this.prisma.playerBowlingType.createMany({
          data: updatePlayerDto.bowlingTypeIds.map((bowlingTypeId) => ({
            playerId: id,
            bowlingTypeId,
          })),
          skipDuplicates: true,
        });
      }
    }

    // Update player
    const updatedPlayer = await this.prisma.player.update({
      where: { id },
      data: updateData,
      include: {
        address: true,
        bowlingTypes: {
          include: {
            bowlingType: true,
          },
        },
      },
    });

    this.logger.info('Player updated successfully', {
      playerId: id,
      context: PlayerService.name,
    });

    return {
      message: 'Player updated successfully',
      data: this.transformPlayer(updatedPlayer),
    };
  }

  async deactivate(id: string, userId: string) {
    // Check if player exists and belongs to user
    const player = await this.prisma.player.findFirst({
      where: {
        id,
        userId,
        isActive: true,
        deletedAt: null,
      },
    });

    if (!player) {
      throw new NotFoundException('Player not found or you do not have permission to deactivate it');
    }

    // Soft delete: Set isActive to false and deletedAt
    await this.prisma.player.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });

    // Remove player from all teams (but keep match history)
    await this.prisma.playerTeam.updateMany({
      where: {
        playerId: id,
        status: InvitationStatus.ACCEPTED,
      },
      data: {
        status: InvitationStatus.REJECTED, // Mark as rejected to remove from active teams
      },
    });

    this.logger.info('Player deactivated successfully', {
      playerId: id,
      context: PlayerService.name,
    });

    return {
      message: 'Player deactivated successfully',
    };
  }

  private transformPlayer(player: any) {
    return {
      ...player,
      bowlingTypes: player.bowlingTypes.map((pt: any) => pt.bowlingType),
    };
  }
}

