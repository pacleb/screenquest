import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalyticsService } from './analytics.service';
import { AnalyticsListener } from './analytics.listener';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [AnalyticsService, AnalyticsListener],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
