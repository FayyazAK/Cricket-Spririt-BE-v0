import { IsString, IsOptional, MinLength, IsArray, IsUUID, ArrayMinSize } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @IsOptional()
  logo?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsUUID()
  clubId: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1, { message: 'At least one player must be selected for the team' })
  playerIds: string[];
}

