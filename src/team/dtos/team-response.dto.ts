import { Expose } from 'class-transformer';

export class TeamResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  logo?: string;

  @Expose()
  description?: string;

  @Expose()
  clubId: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}

