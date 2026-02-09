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
  @ApiProperty({ example: 30, description: 'Minutes of screen time requested' })
  @IsInt()
  @Min(5)
  @Max(240)
  requestedMinutes: number;
}

export class ExtendSessionDto {
  @ApiProperty({ example: 15, description: 'Additional minutes to add' })
  @IsInt()
  @Min(5)
  @Max(120)
  additionalMinutes: number;
}

export class UpdatePlaySettingsDto {
  @ApiPropertyOptional({ enum: ['require_approval', 'notify_only'] })
  @IsString()
  @IsOptional()
  playApprovalMode?: string;

  @ApiPropertyOptional({ example: 120, description: 'Max minutes per day (null = unlimited)' })
  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(1440)
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

  @ApiPropertyOptional({ example: 180 })
  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(1440)
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
