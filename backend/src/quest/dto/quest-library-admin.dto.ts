import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  Min,
  Max,
  MaxLength,
  IsArray,
  IsUUID,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLibraryQuestDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(50)
  category: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(480)
  suggestedRewardSeconds: number;

  @ApiPropertyOptional({ default: 'stackable' })
  @IsOptional()
  @IsString()
  @IsIn(['stackable', 'non_stackable'])
  suggestedStackingType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  ageRange?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class UpdateLibraryQuestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(480)
  suggestedRewardSeconds?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsIn(['stackable', 'non_stackable'])
  suggestedStackingType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  ageRange?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class ReorderQuestsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  ids: string[];
}

export class BulkImportRowDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @IsString()
  @MaxLength(50)
  category: string;

  @IsInt()
  @Min(1)
  @Max(480)
  suggestedRewardSeconds: number;

  @IsOptional()
  @IsString()
  @IsIn(['stackable', 'non_stackable'])
  suggestedStackingType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  ageRange?: string;
}

export class BulkImportDto {
  @ApiProperty({ type: [BulkImportRowDto] })
  @IsArray()
  rows: BulkImportRowDto[];
}

export class ListLibraryQuestsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsIn(['published', 'draft'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ageRange?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class CreateCategoryDto {
  @ApiProperty()
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;
}

export class ReorderCategoriesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  ids: string[];
}
