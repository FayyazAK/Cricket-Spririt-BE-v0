import { Module } from '@nestjs/common';
import { ClubService } from './club.service';
import { ClubController } from './club.controller';
import { UploadModule } from '../common/upload/upload.module';
import { EmailModule } from '../common/email/email.module';

@Module({
  imports: [UploadModule, EmailModule],
  controllers: [ClubController],
  providers: [ClubService],
  exports: [ClubService],
})
export class ClubModule {}

