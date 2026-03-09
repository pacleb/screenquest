import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

function getRuntimeDatabaseUrl(): string | undefined {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) return undefined;

  try {
    const parsed = new URL(rawUrl);
    const isSupabasePooler = parsed.hostname.includes('pooler.supabase.com');

    // Supabase pooler runs in transaction mode; Prisma must disable prepared statements.
    if (isSupabasePooler && !parsed.searchParams.has('pgbouncer')) {
      parsed.searchParams.set('pgbouncer', 'true');
      return parsed.toString();
    }

    return rawUrl;
  } catch {
    return rawUrl;
  }
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const runtimeUrl = getRuntimeDatabaseUrl();
    super(runtimeUrl ? { datasources: { db: { url: runtimeUrl } } } : {});
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
