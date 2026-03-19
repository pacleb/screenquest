import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Redis service with in-memory fallback (composition-based).
 *
 * When REDIS_URL is not set, all commands are handled by a simple
 * in-memory Map. This keeps the app functional on hosts that don't
 * provide a Redis instance (e.g. Render free tier) while still
 * working identically when a real Redis is available.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly memStore = new Map<string, { value: string; expiresAt?: number }>();
  private useMemory: boolean;
  private client: Redis | null = null;

  constructor(private configService: ConfigService) {
    const url = configService.get<string>('REDIS_URL');

    if (url) {
      this.client = new Redis(url, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => (times > 5 ? null : Math.min(times * 200, 2000)),
        lazyConnect: true,
      });
      this.useMemory = false;
    } else {
      this.useMemory = true;
      this.logger.warn(
        'REDIS_URL not set — using in-memory fallback. ' +
        'This is acceptable for local or temporary single-instance use, but not for production.',
      );
    }
  }

  async onModuleInit() {
    if (!this.useMemory && this.client) {
      try {
        await this.client.connect();
        this.logger.log('Connected to Redis');
      } catch (err) {
        this.logger.warn(`Could not connect to Redis, falling back to in-memory: ${err.message}`);
        this.useMemory = true;
      }
    }
  }

  // ── In-memory helpers ────────────────────────────────────────────

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
    if (!this.useMemory && this.client) return this.client.get(key);
    if (this.isExpired(key)) return null;
    return this.memStore.get(key)?.value ?? null;
  }

  async set(key: string, value: string, ...args: any[]): Promise<any> {
    if (!this.useMemory && this.client) return (this.client.set as any)(key, value, ...args);
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
    if (!this.useMemory && this.client) return this.client.setex(key, seconds, value);
    this.memStore.set(key, {
      value,
      expiresAt: Date.now() + seconds * 1000,
    });
    return 'OK';
  }

  async del(...keys: (string | Buffer)[]): Promise<number> {
    if (!this.useMemory && this.client) return this.client.del(...keys.map(String));
    let count = 0;
    for (const key of keys) {
      if (this.memStore.delete(String(key))) count++;
    }
    return count;
  }

  async incr(key: string): Promise<number> {
    if (!this.useMemory && this.client) return this.client.incr(key);
    const current = await this.get(key);
    const next = (parseInt(current || '0', 10) + 1).toString();
    const entry = this.memStore.get(key);
    this.memStore.set(key, { value: next, expiresAt: entry?.expiresAt });
    return parseInt(next, 10);
  }

  async expire(key: string, seconds: number): Promise<number> {
    if (!this.useMemory && this.client) return this.client.expire(key, seconds);
    const entry = this.memStore.get(key);
    if (!entry) return 0;
    entry.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }

  async ttl(key: string): Promise<number> {
    if (!this.useMemory && this.client) return this.client.ttl(key);
    const entry = this.memStore.get(key);
    if (!entry) return -2;
    if (!entry.expiresAt) return -1;
    const remaining = Math.ceil((entry.expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  async ping(): Promise<"PONG"> {
    if (!this.useMemory && this.client) return this.client.ping();
    return 'PONG';
  }

  async info(...args: string[]): Promise<string> {
    if (!this.useMemory && this.client) return this.client.info(...args);
    return '# Memory\r\nused_memory:0\r\nused_memory_human:0B\r\n';
  }

  async onModuleDestroy() {
    if (!this.useMemory && this.client) {
      await this.client.quit();
    }
  }
}
