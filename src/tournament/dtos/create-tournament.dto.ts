import {
  IsString,
  IsEnum,
  IsInt,
  IsOptional,
  MinLength,
  Min,
  Max,
} from 'class-validator';
import { MatchFormat } from '@prisma/client';

export class CreateTournamentDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @IsOptional()
  coverPicture?: string;

  @IsString()
  @IsOptional()
  profilePicture?: string;

  @IsEnum(MatchFormat)
  format: MatchFormat;

  @IsInt()
  @IsOptional()
  @Min(2)
  @Max(50)
  customOvers?: number;
}

