import { Expose, Type } from 'class-transformer';

class PlayerBasicDto {
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
}

class ClubBasicDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  profilePicture?: string;
}

class OwnerBasicDto {
  @Expose()
  name: string;
}

class ClubWithOwnerDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  profilePicture?: string;

  @Expose()
  @Type(() => OwnerBasicDto)
  owner: OwnerBasicDto;
}

export class ClubInvitationResponseDto {
  @Expose()
  id: string;

  @Expose()
  playerId: string;

  @Expose()
  clubId: string;

  @Expose()
  status: string;

  @Expose()
  invitedAt: Date;

  @Expose()
  invitationExpiresAt: Date;

  @Expose()
  respondedAt?: Date;

  @Expose()
  @Type(() => PlayerBasicDto)
  player?: PlayerBasicDto;

  @Expose()
  @Type(() => ClubBasicDto)
  club?: ClubBasicDto;
}

export class ClubPlayerResponseDto {
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
  invitationStatus: string;

  @Expose()
  joinedAt?: Date;
}

export class ClubPlayersListResponseDto {
  @Expose()
  totalCount: number;

  @Expose()
  maxPlayers: number;

  @Expose()
  @Type(() => ClubPlayerResponseDto)
  players: ClubPlayerResponseDto[];
}

export class PlayerClubInvitationResponseDto {
  @Expose()
  id: string;

  @Expose()
  status: string;

  @Expose()
  invitedAt: Date;

  @Expose()
  invitationExpiresAt: Date;

  @Expose()
  @Type(() => ClubWithOwnerDto)
  club: ClubWithOwnerDto;
}
