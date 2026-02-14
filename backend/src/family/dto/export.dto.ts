import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum ExportFormat {
  CSV = 'csv',
}

export enum ExportRange {
  THIRTY_DAYS = '30d',
  NINETY_DAYS = '90d',
  ALL = 'all',
}

export class ExportQueryDto {
  @ApiProperty({ enum: ExportFormat, default: ExportFormat.CSV })
  @IsEnum(ExportFormat)
  @IsOptional()
  format: ExportFormat = ExportFormat.CSV;

  @ApiProperty({ enum: ExportRange, default: ExportRange.THIRTY_DAYS })
  @IsEnum(ExportRange)
  @IsOptional()
  range: ExportRange = ExportRange.THIRTY_DAYS;
}
