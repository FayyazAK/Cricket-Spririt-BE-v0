import { CacheModule, CacheModuleOptions } from '@nestjs/cache-manager';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

import { RedisService } from './redis.service';
import { RedisConfig } from './redis.types';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService, WINSTON_MODULE_PROVIDER],
      useFactory: async (
        configService: ConfigService,
        logger: Logger,
      ): Promise<CacheModuleOptions> => {
        const redisConfig = configService.get<RedisConfig>('redis');

        const memoryFallback = {
          ttl: redisConfig?.defaultTtl ?? 300,
          max: 1000,
        };

        if (!redisConfig?.host) {
          logger.warn(
            'Redis cache configuration not found. Using in-memory cache store.',
            { context: 'CacheModule' },
          );
          return memoryFallback;
        }

        try {
          const store = await redisStore({
            socket: {
              host: redisConfig.host,
              port: redisConfig.port ?? 6379,
            },
            password: redisConfig.password,
            database: redisConfig.db ?? 0,
            keyPrefix: redisConfig.keyPrefix ?? 'hostell',
          });

          return {
            store,
            ttl: redisConfig.defaultTtl ?? 300,
          };
        } catch (error) {
          logger.warn(
            `Failed to initialize Redis cache store. Continuing with in-memory store. Reason: ${(error as Error).message}`,
            { context: 'CacheModule' },
          );
          return memoryFallback;
        }
      },
    }),
  ],
  providers: [RedisService],
  exports: [CacheModule, RedisService],
})
export class RedisModule {}
