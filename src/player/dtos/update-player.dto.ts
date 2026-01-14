import { PartialType, OmitType } from '@nestjs/mapped-types';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { CreatePlayerDto } from './create-player.dto';

export class UpdatePlayerDto extends PartialType(
  OmitType(CreatePlayerDto, ['bowlingTypeIds'] as const),
) {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  bowlingTypeIds?: string[];
}

