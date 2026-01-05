import { Expose, Type } from 'class-transformer';

export class AddressResponseDto {
  @Expose()
  id: string;

  @Expose()
  street?: string;

  @Expose()
  townSuburb?: string;

  @Expose()
  city: string;

  @Expose()
  state: string;

  @Expose()
  country: string;

  @Expose()
  postalCode?: string;
}

export class BowlingTypeResponseDto {
  @Expose()
  id: string;

  @Expose()
  shortName: string;

  @Expose()
  fullName: string;
}

export class PlayerResponseDto {
  @Expose()
  id: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  gender: string;

  @Expose()
  dateOfBirth: Date;

  @Expose()
  profilePicture?: string;

  @Expose()
  playerType: string;

  @Expose()
  isWicketKeeper: boolean;

  @Expose()
  batHand: string;

  @Expose()
  bowlHand?: string;

  @Expose()
  isActive: boolean;

  @Expose()
  @Type(() => AddressResponseDto)
  address: AddressResponseDto;

  @Expose()
  @Type(() => BowlingTypeResponseDto)
  bowlingTypes: BowlingTypeResponseDto[];

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}

