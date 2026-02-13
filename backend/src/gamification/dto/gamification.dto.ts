import { IsString, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
