import { IsString, IsIn, IsOptional } from 'class-validator';

export class RegisterPushTokenDto {
  @IsString()
  token: string;

  @IsString()
  @IsIn(['ios', 'android'])
  platform: string;
}

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  questCompletions?: boolean;

  @IsOptional()
  playRequests?: boolean;

  @IsOptional()
  playStateChanges?: boolean;

  @IsOptional()
  violations?: boolean;

  @IsOptional()
  dailySummary?: boolean;

  @IsOptional()
  weeklySummary?: boolean;
}
