import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Redis service with in-memory fallback.
 *
 * When REDIS_URL is not set, all commands are handled by a simple
 * in-memory Map. This keeps the app functional on hosts that don't
 * provide a Redis instance (e.g. Render free tier) while still
 * working identically when a real Redis is available.
 */
@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly memStore = new Map<string, { value: string; expiresAt?: number }>();
  private readonly useMemory: boolean;

  constructor(private configService: ConfigService) {
    const url = configService.get<string>('REDIS_URL');

    if (url) {
      super(url, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => (times > 5 ? null : Math.min(times * 200, 2000)),
        lazyConnect: true,
      });
      this.useMemory = false;
    } else {
      // Create a dummy Redis instance that never connects
      super({ lazyConnect: true });
      this.useMemory = true;
      this.logger.warn(
        'REDIS_URL not set — using in-memory fallback. ' +
        'This is fine for single-instance staging but not for production.',
      );
    }
  }

  async onModuleInit() {
    if (!this.useMemory) {
      try {
        await this.connect();
        this.logger.log('Connected to Redis');
      } catch (err) {
        this.logger.warn(`Could not connect to Redis, falling back to in-memory: ${err.message}`);
        (this as any).useMemory = true;
      }
    }
  }

  // ── In-memory overrides ──────────────────────────────────────────

  private isExpired(key: string): boolean {
    const entry = this.memStore.get(key);
    if (!entry) return true;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.memStore.delete(key);
      return true;
    }
    return false;
  }

  async get(key: string): Promise<string | null> {
    if (!this.useMemory) return super.get(key);
    if (this.isExpired(key)) return null;
    return this.memStore.get(key)?.value ?? null;
  }

  async set(key: string, value: string, ...args: any[]): Promise<any> {
    if (!this.useMemory) return (super.set as any)(key, value, ...args);
    let ttlMs: number | undefined;
    // Handle set(key, value, 'EX', seconds) pattern
    if (args[0] === 'EX' && typeof args[1] === 'number') {
      ttlMs = args[1] * 1000;
    }
    this.memStore.set(key, {
      value,
      expiresAt: ttlMs ? Date.now() + ttlMs : undefined,
    });
    return 'OK';
  }

  async setex(key: string, seconds: number, value: string): Promise<any> {
    if (!this.useMemory) return super.setex(key, seconds, value);
    this.memStore.set(key, {
      value,
      expiresAt: Date.now() + seconds * 1000,
    });
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    if (!this.useMemory) return (super.del as any)(...keys);
    let count = 0;
    for (const key of keys) {
      if (this.memStore.delete(key)) count++;
    }
    return count;
  }

  async incr(key: string): Promise<number> {
    if (!this.useMemory) return super.incr(key);
    const current = await this.get(key);
    const next = (parseInt(current || '0', 10) + 1).toString();
    const entry = this.memStore.get(key);
    this.memStore.set(key, { value: next, expiresAt: entry?.expiresAt });
    return parseInt(next, 10);
  }

  async expire(key: string, seconds: number): Promise<number> {
    if (!this.useMemory) return super.expire(key, seconds);
    const entry = this.memStore.get(key);
    if (!entry) return 0;
    entry.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }

  async ttl(key: string): Promise<number> {
    if (!this.useMemory) return super.ttl(key);
    const entry = this.memStore.get(key);
    if (!entry) return -2;
    if (!entry.expiresAt) return -1;
    const remaining = Math.ceil((entry.expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  async ping(): Promise<string> {
    if (!this.useMemory) return super.ping();
    return 'PONG';
  }

  async info(section?: string): Promise<string> {
    if (!this.useMemory) return super.info(section);
    return '# Memory\r\nused_memory:0\r\nused_memory_human:0B\r\n';
  }

  async onModuleDestroy() {
    if (!this.useMemory) {
      await this.quit();
    }
  }
}
