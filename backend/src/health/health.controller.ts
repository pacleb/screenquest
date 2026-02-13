import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check' })
  async check() {
    const result: Record<string, string> = {
      status: 'ok',
      version: process.env.npm_package_version || '1.0.0',
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
}
