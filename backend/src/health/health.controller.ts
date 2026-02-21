import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { MetricsService } from '../common/metrics/metrics.service';

@ApiTags('Health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private metrics: MetricsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check' })
  async check() {
    const result: Record<string, any> = {
      status: 'ok',
      version: process.env.npm_package_version || '1.0.0',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };

    // Check DB
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      result.db = 'connected';
    } catch {
      result.db = 'disconnected';
      result.status = 'degraded';
    }

    // Check Redis
    try {
      await this.redis.ping();
      result.redis = 'connected';
    } catch {
      result.redis = 'disconnected';
      result.status = 'degraded';
    }

    return result;
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Application metrics (internal)' })
  async getMetrics() {
    return this.metrics.getSnapshot();
  }

  @Get('metrics/errors')
  @ApiOperation({ summary: 'Error rates by endpoint (internal)' })
  getErrorsByEndpoint() {
    return this.metrics.getErrorsByEndpoint();
  }
}
