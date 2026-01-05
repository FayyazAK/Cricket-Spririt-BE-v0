import { Module } from '@nestjs/common';
import { TournamentService } from './tournament.service';
import { TournamentController } from './tournament.controller';
import { PointsTableService } from './points-table.service';
import { UploadModule } from '../common/upload/upload.module';
import { EmailModule } from '../common/email/email.module';

@Module({
  imports: [UploadModule, EmailModule],
  controllers: [TournamentController],
  providers: [TournamentService, PointsTableService],
  exports: [TournamentService, PointsTableService],
})
export class TournamentModule {}
