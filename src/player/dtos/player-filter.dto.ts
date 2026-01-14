import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PlayerType } from '@prisma/client';

export enum PlayerSortBy {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  FIRST_NAME = 'firstName',
  LAST_NAME = 'lastName',
  CITY = 'city',
  PLAYER_TYPE = 'playerType',
}

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

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @IsEnum(PlayerSortBy)
  @IsOptional()
  sortBy?: PlayerSortBy;

  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}

