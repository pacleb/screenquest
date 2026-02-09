import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsIn,
  MaxLength,
} from 'class-validator';

export class CompleteQuestDto {
  @ApiPropertyOptional({ description: 'URL of uploaded proof image' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  proofImageUrl?: string;
}

export class ReviewCompletionDto {
  @ApiPropertyOptional({ description: 'Optional note from parent' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  parentNote?: string;
}

export class ListCompletionsQueryDto {
  @ApiPropertyOptional({ enum: ['pending', 'approved', 'denied'] })
  @IsString()
  @IsOptional()
  @IsIn(['pending', 'approved', 'denied'])
  status?: string;
}
