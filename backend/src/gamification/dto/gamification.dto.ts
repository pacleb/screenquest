import { IsString, IsBoolean, IsUUID, IsArray, ArrayMaxSize, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class EquipItemDto {
  @ApiProperty()
  @IsString()
  @IsUUID()
  avatarItemId: string;
}

export class ToggleLeaderboardDto {
  @ApiProperty()
  @IsBoolean()
  enabled: boolean;
}

export class SetActiveThemeDto {
  @ApiProperty()
  @IsString()
  @IsUUID()
  themeId: string;
}

export class SetShowcaseDto {
  @ApiProperty({ type: [String], maxItems: 3 })
  @IsArray()
  @ArrayMaxSize(3)
  @IsUUID('4', { each: true })
  badgeIds: string[];
}

export class PaginationDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
