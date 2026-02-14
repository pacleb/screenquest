import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { MetricsModule } from '../common/metrics/metrics.module';

@Module({
  imports: [PrismaModule, RedisModule, MetricsModule],
  controllers: [HealthController],
})
export class HealthModule {}
