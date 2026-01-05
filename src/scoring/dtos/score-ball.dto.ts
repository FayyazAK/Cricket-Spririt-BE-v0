import {
  IsInt,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsUUID,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { WicketType } from '@prisma/client';

export class ScoreBallDto {
  @IsInt()
  @Min(0)
  @Max(6)
  runs: number;

  @IsBoolean()
  @IsOptional()
  isWide?: boolean;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(5)
  @ValidateIf((o) => o.isWide === true)
  wideRuns?: number;

  @IsBoolean()
  @IsOptional()
  isNoBall?: boolean;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(6)
  @ValidateIf((o) => o.isNoBall === true)
  noBallRuns?: number;

  @IsBoolean()
  @IsOptional()
  isBye?: boolean;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(6)
  @ValidateIf((o) => o.isBye === true)
  byeRuns?: number;

  @IsBoolean()
  @IsOptional()
  isLegBye?: boolean;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(6)
  @ValidateIf((o) => o.isLegBye === true)
  legByeRuns?: number;

  @IsEnum(WicketType)
  @IsOptional()
  wicketType?: WicketType;

  @IsUUID()
  @IsOptional()
  @ValidateIf((o) => o.wicketType && o.wicketType !== 'NONE')
  wicketPlayerId?: string;

  @IsUUID()
  @IsOptional()
  @ValidateIf((o) => o.wicketType && o.wicketType !== 'NONE')
  dismissedBatsmanId?: string;
}

