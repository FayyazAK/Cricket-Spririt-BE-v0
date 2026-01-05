import { Module } from '@nestjs/common';
import { BowlingTypeService } from './bowling-type.service';
import { BowlingTypeController } from './bowling-type.controller';

@Module({
  controllers: [BowlingTypeController],
  providers: [BowlingTypeService],
  exports: [BowlingTypeService],
})
export class BowlingTypeModule {}

