import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsInt,
  Min,
  IsBoolean,
  IsNumber,
  IsArray,
  IsIn,
  ArrayMinSize,
  IsUUID,
} from 'class-validator';

const VALID_CATEGORIES = [
  'chores',
  'studying',
  'exercise',
  'reading',
  'creative',
  'helping_others',
  'custom',
];

const VALID_STACKING_TYPES = ['stackable', 'non_stackable'];
const VALID_RECURRENCES = ['one_time', 'daily', 'weekly', 'custom'];

export class CreateQuestDto {
  @ApiProperty({ example: 'Clean your room' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'Tidy up your bedroom and make your bed' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: '🧹' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  icon?: string;

  @ApiProperty({ example: 'chores', enum: VALID_CATEGORIES })
  @IsString()
  @IsIn(VALID_CATEGORIES)
  category: string;

  @ApiProperty({ example: 30 })
  @IsInt()
  @Min(1)
  rewardMinutes: number;

  @ApiProperty({ example: 'stackable', enum: VALID_STACKING_TYPES })
  @IsString()
  @IsIn(VALID_STACKING_TYPES)
  stackingType: string;

  @ApiPropertyOptional({ example: 'daily', enum: VALID_RECURRENCES })
  @IsString()
  @IsOptional()
  @IsIn(VALID_RECURRENCES)
  recurrence?: string;

  @ApiPropertyOptional({ example: ['mon', 'wed', 'fri'] })
  @IsArray()
  @IsOptional()
  recurrenceDays?: string[];

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  requiresProof?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  autoApprove?: boolean;

  @ApiPropertyOptional({ example: 1.0 })
  @IsNumber()
  @IsOptional()
  bonusMultiplier?: number;

  @ApiProperty({ example: ['uuid-1', 'uuid-2'], description: 'Child IDs to assign quest to' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  assignedChildIds: string[];

  @ApiPropertyOptional({ description: 'Library quest ID if adding from library' })
  @IsUUID('4')
  @IsOptional()
  libraryQuestId?: string;
}

export class UpdateQuestDto {
  @ApiPropertyOptional({ example: 'Clean your room' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({ enum: VALID_CATEGORIES })
  @IsString()
  @IsOptional()
  @IsIn(VALID_CATEGORIES)
  category?: string;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  @Min(1)
  rewardMinutes?: number;

  @ApiPropertyOptional({ enum: VALID_STACKING_TYPES })
  @IsString()
  @IsOptional()
  @IsIn(VALID_STACKING_TYPES)
  stackingType?: string;

  @ApiPropertyOptional({ enum: VALID_RECURRENCES })
  @IsString()
  @IsOptional()
  @IsIn(VALID_RECURRENCES)
  recurrence?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  recurrenceDays?: string[];

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  requiresProof?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  autoApprove?: boolean;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  bonusMultiplier?: number;

  @ApiPropertyOptional({ description: 'Child IDs to assign quest to' })
  @IsArray()
  @IsOptional()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  assignedChildIds?: string[];
}

export class CreateFromLibraryDto {
  @ApiProperty({ example: 30 })
  @IsInt()
  @Min(1)
  rewardMinutes: number;

  @ApiProperty({ example: 'stackable', enum: VALID_STACKING_TYPES })
  @IsString()
  @IsIn(VALID_STACKING_TYPES)
  stackingType: string;

  @ApiProperty({ example: ['uuid-1'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  assignedChildIds: string[];

  @ApiPropertyOptional({ enum: VALID_RECURRENCES })
  @IsString()
  @IsOptional()
  @IsIn(VALID_RECURRENCES)
  recurrence?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  recurrenceDays?: string[];

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  requiresProof?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  autoApprove?: boolean;
}
