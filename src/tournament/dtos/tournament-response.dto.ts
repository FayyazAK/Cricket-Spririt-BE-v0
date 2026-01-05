import { Expose } from 'class-transformer';

export class TournamentResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  coverPicture?: string;

  @Expose()
  profilePicture?: string;

  @Expose()
  format: string;

  @Expose()
  customOvers?: number;

  @Expose()
  status: string;

  @Expose()
  startDate?: Date;

  @Expose()
  endDate?: Date;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}

