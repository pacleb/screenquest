import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RecordViolationDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
