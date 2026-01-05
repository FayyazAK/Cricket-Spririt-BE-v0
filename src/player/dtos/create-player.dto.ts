import {
  IsString,
  IsEnum,
  IsDateString,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Gender, PlayerType, Hand } from '@prisma/client';

export class CreateAddressDto {
  @IsString()
  @IsOptional()
  street?: string;

  @IsString()
  @IsOptional()
  townSuburb?: string;

  @IsString()
  @MinLength(1)
  city: string;

  @IsString()
  @MinLength(1)
  state: string;

  @IsString()
  @MinLength(1)
  country: string;

  @IsString()
  @IsOptional()
  postalCode?: string;
}

export class CreatePlayerDto {
  @IsString()
  @MinLength(1)
  firstName: string;

  @IsString()
  @MinLength(1)
  lastName: string;

  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @IsDateString()
  dateOfBirth: string;

  @IsString()
  @IsOptional()
  profilePicture?: string;

  @IsEnum(PlayerType)
  playerType: PlayerType;

  @IsBoolean()
  @IsOptional()
  isWicketKeeper?: boolean;

  @IsEnum(Hand)
  batHand: Hand;

  @IsEnum(Hand)
  @IsOptional()
  bowlHand?: Hand;

  @IsArray()
  @IsString({ each: true })
  bowlingTypeIds: string[];

  @ValidateNested()
  @Type(() => CreateAddressDto)
  address: CreateAddressDto;
}

