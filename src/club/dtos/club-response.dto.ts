import { Expose, Type } from 'class-transformer';
import { AddressResponseDto } from '../../player/dtos/player-response.dto';

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
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}

