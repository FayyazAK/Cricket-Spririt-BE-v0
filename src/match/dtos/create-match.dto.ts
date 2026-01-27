import {
  IsString,
  IsEnum,
  IsInt,
  IsDateString,
  IsOptional,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { BallType, MatchFormat } from '@prisma/client';

export class CreateMatchDto {
  @IsUUID()
  @IsOptional()
  tournamentId?: string;

  @IsUUID()
  @IsOptional()
  scorerId?: string;

  @IsUUID()
  team1Id: string;

  @IsUUID()
  team2Id: string;

  @IsInt()
  @Min(2)
  @Max(50)
  overs: number;

  @IsEnum(BallType)
  ballType: BallType;

  @IsEnum(MatchFormat)
  format: MatchFormat;

  @IsInt()
  @IsOptional()
  @Min(2)
  @Max(50)
  customOvers?: number;

  @IsDateString()
  scheduledDate: string;
}

