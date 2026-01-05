import { IsString, IsUUID } from 'class-validator';

export class AddTeamToTournamentDto {
  @IsUUID()
  teamId: string;
}

