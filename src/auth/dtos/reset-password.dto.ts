import { IsString, MinLength, Length } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  token: string;

  @IsString()
  @MinLength(6)
  password: string;
}

