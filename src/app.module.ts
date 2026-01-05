import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/exceptions.filter';
import configuration from './config/configuration';
import { RedisModule } from './common/redis/redis.module';
import { ThrottlerConfigModule } from './common/throttler/throttler.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './common/database/database.module';
import { UserModule } from './user/user.module';
import { LoggerModule } from './common/logger/logger.module';
import { LoggingMiddleware } from './common/middleware/logging.middleware';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './common/email/email.module';
import { UploadModule } from './common/upload/upload.module';
import { AddressModule } from './address/address.module';
import { BowlingTypeModule } from './bowling-type/bowling-type.module';
import { PlayerModule } from './player/player.module';
import { ClubModule } from './club/club.module';
import { TeamModule } from './team/team.module';
import { TournamentModule } from './tournament/tournament.module';
import { MatchModule } from './match/match.module';
import { ScoringModule } from './scoring/scoring.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: [
        `./src/config/env/.env.${process.env.NODE_ENV || 'development'}`,
        `./src/config/env/.env.local`,
        `./.env.${process.env.NODE_ENV || 'development'}`,
        `./.env`,
      ],
    }),
    ThrottlerConfigModule,
    RedisModule,
    DatabaseModule,
    UserModule,
    LoggerModule,
    AuthModule,
    EmailModule,
    UploadModule,
    AddressModule,
    BowlingTypeModule,
    PlayerModule,
    ClubModule,
    TeamModule,
    TournamentModule,
    MatchModule,
    ScoringModule,
  ],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
  controllers: [AppController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes('*path');
  }
}
