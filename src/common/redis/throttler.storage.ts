import { Logger } from 'winston';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { RedisOptions } from 'ioredis';

import { RedisConfig } from './redis.types';

type RedisStorageFactory = (
  options: RedisOptions,
) => ThrottlerStorageRedisService;

const defaultRedisFactory: RedisStorageFactory = (options: RedisOptions) =>
  new ThrottlerStorageRedisService(options);

export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly memoryStorage = new ThrottlerStorageService();
  private redisStorage?: ThrottlerStorageRedisService;

  constructor(
    private readonly logger: Logger,
    redisConfig?: RedisConfig,
    private readonly redisFactory: RedisStorageFactory = defaultRedisFactory,
  ) {
    this.initializeRedisStorage(redisConfig);
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    if (this.redisStorage) {
      try {
        return await this.redisStorage.increment(
          key,
          ttl,
          limit,
          blockDuration,
          throttlerName,
        );
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Redis throttler storage failed (${reason}). Falling back to in-memory throttling for the remainder of this process.`,
          {
            stack: error instanceof Error ? error.stack : undefined,
            context: RedisThrottlerStorage.name,
          },
        );
        this.disableRedisStorage();
      }
    }

    return this.memoryStorage.increment(
      key,
      ttl,
      limit,
      blockDuration,
      throttlerName,
    );
  }

  private initializeRedisStorage(redisConfig?: RedisConfig) {
    if (!redisConfig?.host) {
      this.logger.warn(
        'Redis throttler storage disabled (missing REDIS_HOST). Using in-memory throttling.',
        { context: RedisThrottlerStorage.name },
      );
      return;
    }

    try {
      this.redisStorage = this.redisFactory(
        this.buildRedisOptions(redisConfig),
      );
      this.logger.info(
        `Throttler storage connected to Redis ${redisConfig.host}:${redisConfig.port ?? 6379}.`,
        { context: RedisThrottlerStorage.name },
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to initialize Redis throttler storage. Using in-memory fallback. Reason: ${reason}`,
        { context: RedisThrottlerStorage.name },
      );
      this.redisStorage = undefined;
    }
  }

  private buildRedisOptions(redisConfig: RedisConfig): RedisOptions {
    const keyPrefix = redisConfig.keyPrefix?.trim() ?? 'hostell';

    return {
      host: redisConfig.host,
      port: redisConfig.port ?? 6379,
      password: redisConfig.password,
      db: redisConfig.db ?? 0,
      keyPrefix: `${keyPrefix}:throttler`,
      lazyConnect: true,
    };
  }

  private disableRedisStorage() {
    if (this.redisStorage instanceof ThrottlerStorageRedisService) {
      this.redisStorage.onModuleDestroy?.();
    }
    this.redisStorage = undefined;
  }
}
