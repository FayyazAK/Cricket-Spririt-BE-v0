import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreatePlayerDto } from './create-player.dto';

export class UpdatePlayerDto extends PartialType(
  OmitType(CreatePlayerDto, ['bowlingTypeIds'] as const),
) {
  bowlingTypeIds?: string[];
}

