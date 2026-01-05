import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateMatchDto } from './create-match.dto';

export class UpdateMatchDto extends PartialType(
  OmitType(CreateMatchDto, ['team1Id', 'team2Id'] as const),
) {}

