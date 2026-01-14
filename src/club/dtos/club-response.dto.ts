import { Expose, Type } from 'class-transformer';
import { AddressResponseDto } from '../../player/dtos/player-response.dto';

class ClubPlayerDto {
  @Expose()
  id: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  playerType: string;

  @Expose()
  profilePicture?: string;

  @Expose()
  joinedAt?: Date;

  @Expose()
  invitedAt?: Date;

  @Expose()
  invitationExpiresAt?: Date;

  @Expose()
  rejectedAt?: Date;
}

class PlayerStatsDto {
  @Expose()
  total: number;

  @Expose()
  maxPlayers: number;

  @Expose()
  pending: number;

  @Expose()
  rejected: number;
}

class TeamBasicDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  logo?: string;

  @Expose()
  description?: string;
}

export class ClubResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  profilePicture?: string;

  @Expose()
  bio?: string;

  @Expose()
  establishedDate?: Date;

  @Expose()
  @Type(() => AddressResponseDto)
  address: AddressResponseDto;

  @Expose()
  @Type(() => TeamBasicDto)
  teams?: TeamBasicDto[];

  @Expose()
  @Type(() => ClubPlayerDto)
  clubPlayers?: ClubPlayerDto[];

  @Expose()
  @Type(() => ClubPlayerDto)
  pendingPlayers?: ClubPlayerDto[];

  @Expose()
  @Type(() => ClubPlayerDto)
  rejectedPlayers?: ClubPlayerDto[];

  @Expose()
  @Type(() => PlayerStatsDto)
  playerStats?: PlayerStatsDto;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}

