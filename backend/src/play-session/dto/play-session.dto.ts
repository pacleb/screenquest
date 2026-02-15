import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  Min,
  Max,
  IsOptional,
  IsString,
  Matches,
  IsBoolean,
} from 'class-validator';

export class RequestPlayDto {
  @ApiProperty({ example: 1800, description: 'Seconds of screen time requested' })
  @IsInt()
  @Min(300)
  @Max(14400)
  requestedSeconds: number;
}

export class ExtendSessionDto {
  @ApiProperty({ example: 900, description: 'Additional seconds to add' })
  @IsInt()
  @Min(300)
  @Max(7200)
  additionalSeconds: number;
}

export class UpdatePlaySettingsDto {
  @ApiPropertyOptional({ enum: ['require_approval', 'notify_only'] })
  @IsString()
  @IsOptional()
  playApprovalMode?: string;

  @ApiPropertyOptional({ example: 7200, description: 'Max seconds per day (null = unlimited)' })
  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(86400)
  dailyScreenTimeCap?: number | null;

  @ApiPropertyOptional({ example: '08:00', description: 'Earliest play time (HH:mm)' })
  @IsString()
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  allowedPlayHoursStart?: string;

  @ApiPropertyOptional({ example: '20:00', description: 'Latest play time (HH:mm)' })
  @IsString()
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  allowedPlayHoursEnd?: string;

  @ApiPropertyOptional({ example: 10800 })
  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(86400)
  weekendDailyScreenTimeCap?: number | null;

  @ApiPropertyOptional({ example: '09:00' })
  @IsString()
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  weekendPlayHoursStart?: string;

  @ApiPropertyOptional({ example: '21:00' })
  @IsString()
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  weekendPlayHoursEnd?: string;
}
