import { Expose, Type } from 'class-transformer';
import { TeamResponseDto } from '../../team/dtos/team-response.dto';

export class MatchResponseDto {
  @Expose()
  id: string;

  @Expose()
  tournamentId?: string;

  @Expose()
  @Type(() => TeamResponseDto)
  team1: TeamResponseDto;

  @Expose()
  @Type(() => TeamResponseDto)
  team2: TeamResponseDto;

  @Expose()
  overs: number;

  @Expose()
  ballType: string;

  @Expose()
  format: string;

  @Expose()
  customOvers?: number;

  @Expose()
  status: string;

  @Expose()
  scheduledDate: Date;

  @Expose()
  startedAt?: Date;

  @Expose()
  completedAt?: Date;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}

