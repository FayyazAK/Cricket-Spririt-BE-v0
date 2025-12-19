import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule, seconds } from '@nestjs/throttler';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

import { RedisThrottlerStorage } from '../redis/throttler.storage';
import { RedisConfig } from '../redis/redis.types';

type ThrottlerConfig = {
  shortTtl: number;
  shortLimit: number;
  mediumTtl: number;
  mediumLimit: number;
  longTtl: number;
  longLimit: number;
};

const DEFAULT_THROTTLER_CONFIG: ThrottlerConfig = {
  shortTtl: 60,
  shortLimit: 1,
  mediumTtl: 600,
  mediumLimit: 100,
  longTtl: 3600,
  longLimit: 1000,
};

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [ConfigService, WINSTON_MODULE_PROVIDER],
      useFactory: (configService: ConfigService, logger: Logger) => {
        const redisConfig = configService.get<RedisConfig>('redis');
        const throttlerConfig =
          configService.get<ThrottlerConfig>('throttler') ??
          DEFAULT_THROTTLER_CONFIG;

        return {
          throttlers: [
            {
              name: 'short',
              ttl: seconds(throttlerConfig.shortTtl),
              limit: throttlerConfig.shortLimit,
            },
            {
              name: 'medium',
              ttl: seconds(throttlerConfig.mediumTtl),
              limit: throttlerConfig.mediumLimit,
            },
            {
              name: 'long',
              ttl: seconds(throttlerConfig.longTtl),
              limit: throttlerConfig.longLimit,
            },
          ],
          errorMessage: 'Too many requests. Please try later.',
          storage: new RedisThrottlerStorage(logger, redisConfig),
        };
      },
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [ThrottlerModule],
})
export class ThrottlerConfigModule {}
