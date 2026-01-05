import { IsUUID } from 'class-validator';

export class AssignScorerDto {
  @IsUUID()
  scorerId: string;
}

