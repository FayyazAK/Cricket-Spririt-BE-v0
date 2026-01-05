import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateTournamentDto } from './create-tournament.dto';

export class UpdateTournamentDto extends PartialType(
  OmitType(CreateTournamentDto, [] as const),
) {}

