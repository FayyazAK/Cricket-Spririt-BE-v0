import { Module } from '@nestjs/common';
import { TeamService } from './team.service';
import { TeamController } from './team.controller';
import { UploadModule } from '../common/upload/upload.module';
import { EmailModule } from '../common/email/email.module';

@Module({
  imports: [UploadModule, EmailModule],
  controllers: [TeamController],
  providers: [TeamService],
  exports: [TeamService],
})
export class TeamModule {}

