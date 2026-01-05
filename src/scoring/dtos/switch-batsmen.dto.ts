import { IsUUID } from 'class-validator';

export class SwitchBatsmenDto {
  @IsUUID()
  newBatsmanId: string;

  @IsUUID()
  newNonStrikerId: string;
}

