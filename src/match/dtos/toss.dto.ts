import { IsEnum, IsUUID } from 'class-validator';
import { TossDecision } from '@prisma/client';

export class TossDto {
  @IsUUID()
  tossWinnerId: string;

  @IsEnum(TossDecision)
  tossDecision: TossDecision;
}

