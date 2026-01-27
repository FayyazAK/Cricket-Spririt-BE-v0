import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/database/database.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { RedisService } from 'src/common/redis/redis.service';
import { CacheKeys } from 'src/common/redis/cache.keys';
import { CreateUserDto } from './dtos/createUser.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly redis: RedisService,
  ) {}

  async findAll() {
    const cacheKey = CacheKeys.USERS.ALL;
    const cachedUsers = await this.redis.get(cacheKey);

    if (cachedUsers) {
      this.logger.info('Returning users from cache', {
        context: UserService.name,
      });
      return JSON.parse(cachedUsers) as unknown;
    }

    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.redis.set(cacheKey, JSON.stringify(users), 600); // Cache for 10 minutes

    this.logger.info('Returning users from database', {
      context: UserService.name,
    });
    return users;
  }

  async searchByEmail(email: string) {
    if (!email?.trim()) {
      throw new BadRequestException('Email query is required');
    }

    const users = await this.prisma.user.findMany({
      where: {
        email: {
          contains: email.trim(),
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });

    return users;
  }

  async create(createUserDto: CreateUserDto) {
    this.logger.info('Creating new user', {
      email: createUserDto.email,
      context: UserService.name,
    });

    const existingUser = await this.prisma.user.findUnique({
      where: {
        email: createUserDto.email,
      },
    });

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    // NOTE: You should hash the password before storing in production
    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        name: createUserDto.name,
        password: createUserDto.password,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    this.logger.info('User created successfully', {
      userId: user.id,
      context: UserService.name,
    });

    // Invalidate cache when new user is created
    await this.redis.delete(CacheKeys.USERS.ALL);

    return {
      // success: true,
      message: 'User created successfully',
      data: user,
    };
  }
}
