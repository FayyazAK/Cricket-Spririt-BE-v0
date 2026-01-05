import {
  IsString,
  IsDateString,
  IsOptional,
  ValidateNested,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateAddressDto } from '../../player/dtos/create-player.dto';

export class CreateClubDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @IsOptional()
  profilePicture?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsDateString()
  @IsOptional()
  establishedDate?: string;

  @ValidateNested()
  @Type(() => CreateAddressDto)
  address: CreateAddressDto;
}

