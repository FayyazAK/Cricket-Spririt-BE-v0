import { Expose } from 'class-transformer';

export class BowlingTypeResponseDto {
  @Expose()
  id: string;

  @Expose()
  shortName: string;

  @Expose()
  fullName: string;
}

