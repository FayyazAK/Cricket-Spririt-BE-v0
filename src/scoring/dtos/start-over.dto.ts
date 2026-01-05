import { IsUUID, IsInt, Min, Max } from 'class-validator';

export class StartOverDto {
  @IsUUID()
  bowlerId: string;

  @IsUUID()
  batsmanId: string;

  @IsUUID()
  nonStrikerId: string;

  @IsInt()
  @Min(1)
  overNumber: number;
}

