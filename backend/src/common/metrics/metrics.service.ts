import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

interface RequestMetric {
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  timestamp: number;
}

export interface MetricsSnapshot {
  uptime: number;
  requests: {
    total: number;
    errorCount: number;
    errorRate: number;
    p50: number;
    p95: number;
    p99: number;
  };
  database: {
    status: 'connected' | 'disconnected';
    avgQueryTimeMs: number | null;
  };
  redis: {
    status: 'connected' | 'disconnected';
    memoryUsedMB: number | null;
  };
  memory: {
    heapUsedMB: number;
    heapTotalMB: number;
    rssMB: number;
  };
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly metrics: RequestMetric[] = [];
  private readonly MAX_METRICS = 10000;
  private readonly WINDOW_MS = 5 * 60 * 1000; // 5 minute window
  private readonly startTime = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Record an HTTP request metric.
   */
  recordRequest(method: string, path: string, statusCode: number, duration: number): void {
    this.metrics.push({
      method,
      path,
      statusCode,
      duration,
      timestamp: Date.now(),
    });

    // Evict old metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.splice(0, this.metrics.length - this.MAX_METRICS);
    }

    // Log slow requests (>500ms)
    if (duration > 500) {
      this.logger.warn(`Slow request: ${method} ${path} took ${duration}ms (status ${statusCode})`);
    }
  }

  /**
   * Get metrics for the recent time window.
   */
  private getRecentMetrics(): RequestMetric[] {
    const cutoff = Date.now() - this.WINDOW_MS;
    return this.metrics.filter((m) => m.timestamp > cutoff);
  }

  /**
   * Calculate percentile from sorted array of durations.
   */
  private percentile(sortedDurations: number[], p: number): number {
    if (sortedDurations.length === 0) return 0;
    const idx = Math.ceil((p / 100) * sortedDurations.length) - 1;
    return sortedDurations[Math.max(0, idx)];
  }

  /**
   * Get a full metrics snapshot.
   */
  async getSnapshot(): Promise<MetricsSnapshot> {
    const recent = this.getRecentMetrics();
    const durations = recent.map((m) => m.duration).sort((a, b) => a - b);
    const errorCount = recent.filter((m) => m.statusCode >= 500).length;

    // Database check
    let dbStatus: 'connected' | 'disconnected' = 'disconnected';
    let avgQueryTime: number | null = null;
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      avgQueryTime = Date.now() - start;
      dbStatus = 'connected';
    } catch {
      dbStatus = 'disconnected';
    }

    // Redis check
    let redisStatus: 'connected' | 'disconnected' = 'disconnected';
    let memoryUsedMB: number | null = null;
    try {
      await this.redis.ping();
      redisStatus = 'connected';
      try {
        const info = await this.redis.info('memory');
        const match = info.match(/used_memory:(\d+)/);
        if (match) {
          memoryUsedMB = Math.round(parseInt(match[1]) / 1024 / 1024 * 100) / 100;
        }
      } catch {
        // Redis memory info not critical
      }
    } catch {
      redisStatus = 'disconnected';
    }

    const mem = process.memoryUsage();

    return {
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      requests: {
        total: recent.length,
        errorCount,
        errorRate: recent.length > 0 ? Math.round((errorCount / recent.length) * 10000) / 100 : 0,
        p50: this.percentile(durations, 50),
        p95: this.percentile(durations, 95),
        p99: this.percentile(durations, 99),
      },
      database: {
        status: dbStatus,
        avgQueryTimeMs: avgQueryTime,
      },
      redis: {
        status: redisStatus,
        memoryUsedMB,
      },
      memory: {
        heapUsedMB: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
        heapTotalMB: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
        rssMB: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
      },
    };
  }

  /**
   * Get error rate by endpoint for the current window.
   */
  getErrorsByEndpoint(): Record<string, { total: number; errors: number; rate: number }> {
    const recent = this.getRecentMetrics();
    const grouped: Record<string, { total: number; errors: number }> = {};

    for (const m of recent) {
      const key = `${m.method} ${m.path}`;
      if (!grouped[key]) grouped[key] = { total: 0, errors: 0 };
      grouped[key].total++;
      if (m.statusCode >= 500) grouped[key].errors++;
    }

    const result: Record<string, { total: number; errors: number; rate: number }> = {};
    for (const [key, val] of Object.entries(grouped)) {
      result[key] = {
        ...val,
        rate: Math.round((val.errors / val.total) * 10000) / 100,
      };
    }
    return result;
  }

  /**
   * Periodic log of key metrics (every 5 minutes in production).
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async logMetricsSummary(): Promise<void> {
    if (process.env.NODE_ENV !== 'production') return;

    const snapshot = await this.getSnapshot();
    this.logger.log({
      msg: 'metrics_summary',
      uptime: snapshot.uptime,
      requests: snapshot.requests,
      database: snapshot.database.status,
      redis: snapshot.redis.status,
      memory: snapshot.memory,
    });

    // Alert if error rate is high
    if (snapshot.requests.errorRate > 5 && snapshot.requests.total > 10) {
      this.logger.error({
        msg: 'HIGH_ERROR_RATE',
        errorRate: snapshot.requests.errorRate,
        errorCount: snapshot.requests.errorCount,
        totalRequests: snapshot.requests.total,
      });
    }

    // Alert if database is down
    if (snapshot.database.status === 'disconnected') {
      this.logger.error({ msg: 'DATABASE_DISCONNECTED' });
    }

    // Alert if Redis is down
    if (snapshot.redis.status === 'disconnected') {
      this.logger.error({ msg: 'REDIS_DISCONNECTED' });
    }
  }
}
