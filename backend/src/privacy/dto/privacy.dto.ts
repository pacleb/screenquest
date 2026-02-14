import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class RevokeConsentDto {
  @ApiProperty()
  @IsUUID()
  childId: string;
}

export class RequestDeletionDto {
  @ApiPropertyOptional({ example: 'No longer using the app' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class AcceptPolicyDto {
  @ApiProperty({ example: 'privacy_policy' })
  @IsString()
  @IsIn(['privacy_policy', 'terms_of_service'])
  documentType: string;

  @ApiProperty({ example: '1.0' })
  @IsString()
  @IsNotEmpty()
  documentVersion: string;
}
