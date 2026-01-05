import { Controller, Get } from '@nestjs/common';
import { BowlingTypeService } from './bowling-type.service';
import { Serialize } from '../common/interceptors/response.interceptor';
import { BowlingTypeResponseDto } from './dtos/bowling-type-response.dto';

@Controller('bowling-types')
export class BowlingTypeController {
  constructor(private readonly bowlingTypeService: BowlingTypeService) {}

  @Get()
  @Serialize(BowlingTypeResponseDto)
  async findAll() {
    const bowlingTypes = await this.bowlingTypeService.findAll();
    return {
      message: 'Bowling types retrieved successfully',
      data: bowlingTypes,
    };
  }
}

