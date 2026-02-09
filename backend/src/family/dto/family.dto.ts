import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsEmail,
  IsOptional,
  IsInt,
  Min,
  Max,
  MinLength,
  IsBoolean,
} from 'class-validator';

export class CreateFamilyDto {
  @ApiProperty({ example: 'The Smith Family' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}

export class JoinFamilyDto {
  @ApiProperty({ example: 'ABC12345' })
  @IsString()
  @IsNotEmpty()
  familyCode: string;
}

export class InviteMemberDto {
  @ApiProperty({ example: 'guardian@example.com' })
  @IsEmail()
  email: string;
}

export class CreateChildDto {
  @ApiProperty({ example: 'Timmy' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 8 })
  @IsInt()
  @Min(1)
  @Max(17)
  age: number;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.png' })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 'child@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: '1234' })
  @IsString()
  @MinLength(4)
  @MaxLength(6)
  pin: string;
}

export class UpdateChildDto {
  @ApiPropertyOptional({ example: 'Timothy' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 9 })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(17)
  age?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: '5678' })
  @IsString()
  @IsOptional()
  @MinLength(4)
  @MaxLength(6)
  pin?: string;
}

export class UpdateFamilyDto {
  @ApiProperty({ example: 'The Smith-Jones Family' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}

export class UpdateGuardianPermissionsDto {
  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  canApproveQuests?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  canManageQuests?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  canManageChildren?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  canRecordViolations?: boolean;
}
