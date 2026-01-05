import { IsString, IsUUID } from 'class-validator';

export class AddPlayerToTeamDto {
  @IsUUID()
  playerId: string;
}

