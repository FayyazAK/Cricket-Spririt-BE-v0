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
import { CreateClubDto } from './dtos/create-club.dto';
import { UpdateClubDto } from './dtos/update-club.dto';

@Injectable()
export class ClubService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
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

  async findOne(id: string) {
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
        },
      },
    });

    if (!club) {
      throw new NotFoundException('Club not found');
    }

    return {
      message: 'Club retrieved successfully',
      data: club,
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
}

