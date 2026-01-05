import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../common/database/database.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { RedisService } from '../common/redis/redis.service';

@Injectable()
export class BowlingTypeService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly redis: RedisService,
  ) {}

  async findAll() {
    const cacheKey = 'bowling_types:all';
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      this.logger.info('Returning bowling types from cache', {
        context: BowlingTypeService.name,
      });
      return JSON.parse(cached);
    }

    const bowlingTypes = await this.prisma.bowlingType.findMany({
      orderBy: {
        fullName: 'asc',
      },
    });

    await this.redis.set(cacheKey, JSON.stringify(bowlingTypes), 3600); // Cache for 1 hour

    this.logger.info('Returning bowling types from database', {
      context: BowlingTypeService.name,
    });

    return bowlingTypes;
  }
}

