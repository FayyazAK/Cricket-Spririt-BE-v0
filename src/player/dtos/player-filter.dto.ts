import { IsString, IsEnum, IsOptional } from 'class-validator';
import { PlayerType } from '@prisma/client';

export class PlayerFilterDto {
  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  townSuburb?: string;

  @IsEnum(PlayerType)
  @IsOptional()
  playerType?: PlayerType;

  @IsString()
  @IsOptional()
  search?: string; // Search in firstName, lastName
}

