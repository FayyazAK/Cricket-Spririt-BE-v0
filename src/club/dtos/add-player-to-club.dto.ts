import { IsString, IsUUID } from 'class-validator';

export class AddPlayerToClubDto {
  @IsString()
  @IsUUID()
  playerId: string;
}
