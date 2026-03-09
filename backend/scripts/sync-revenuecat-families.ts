/**
 * RevenueCat admin sync script for family subscriptions.
 *
 * Purpose:
 * - Backfill backend family subscription fields from RevenueCat entitlements.
 * - Useful when mobile purchases succeeded but backend webhook/sync did not update all families.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register scripts/sync-revenuecat-families.ts --write
 *
 * Options:
 *   --write                 Apply DB updates. Without this, script runs in dry-run mode.
 *   --all                   Check all families. Default checks likely out-of-sync families only.
 *   --family=<uuid>         Only sync one family. Can be provided multiple times.
 *   --limit=<n>             Max families to inspect (after filtering).
 *   --verbose               Print per-family details.
 *
 * Required env:
 *   - DATABASE_URL
 *   - REVENUECAT_SECRET_KEY
 */

import { PrismaClient } from '@prisma/client';

type CliOptions = {
  write: boolean;
  all: boolean;
  familyIds: string[];
  limit?: number;
  verbose: boolean;
};

type RevenueCatEntitlement = {
  expires_date?: string | null;
  product_identifier?: string | null;
};

const prisma = new PrismaClient();

function parseArgs(argv: string[]): CliOptions {
  const familyIds: string[] = [];
  let write = false;
  let all = false;
  let limit: number | undefined;
  let verbose = false;

  for (const arg of argv) {
    if (arg === '--write') write = true;
    else if (arg === '--all') all = true;
    else if (arg === '--verbose') verbose = true;
    else if (arg.startsWith('--family=')) {
      const value = arg.slice('--family='.length).trim();
      if (value) familyIds.push(value);
    } else if (arg.startsWith('--limit=')) {
      const raw = arg.slice('--limit='.length).trim();
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed > 0) {
        limit = Math.floor(parsed);
      }
    }
  }

  return { write, all, familyIds, limit, verbose };
}

async function fetchActiveEntitlement(
  appUserId: string,
  secretKey: string,
): Promise<RevenueCatEntitlement | null> {
  const response = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
    { headers: { Authorization: `Bearer ${secretKey}` } },
  );

  if (!response.ok) {
    throw new Error(`RevenueCat API ${response.status}`);
  }

  const payload = (await response.json()) as any;
  const entitlement = payload?.subscriber?.entitlements?.premium as RevenueCatEntitlement | undefined;
  if (!entitlement?.expires_date) return null;

  const expiresAt = new Date(entitlement.expires_date);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
    return null;
  }

  return entitlement;
}

function inferPeriod(productId: string | null | undefined): 'monthly' | 'yearly' {
  const normalized = (productId || '').toLowerCase();
  return normalized.includes('yearly') || normalized.includes('annual')
    ? 'yearly'
    : 'monthly';
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const secretKey = process.env.REVENUECAT_SECRET_KEY;

  if (!secretKey) {
    throw new Error('Missing REVENUECAT_SECRET_KEY');
  }

  const where: any = options.familyIds.length
    ? { id: { in: options.familyIds } }
    : options.all
      ? {}
      : {
          OR: [
            { subscriptionStatus: null },
            { subscriptionStatus: { not: 'active' } },
            { plan: 'free' },
          ],
        };

  const families = await prisma.family.findMany({
    where,
    select: {
      id: true,
      revenuecatAppUserId: true,
      plan: true,
      subscriptionStatus: true,
      subscriptionExpiresAt: true,
      subscriptionPeriod: true,
    },
    orderBy: { createdAt: 'asc' },
    take: options.limit,
  });

  console.log(
    `[Sync] Mode=${options.write ? 'WRITE' : 'DRY_RUN'} families=${families.length}`,
  );

  let updated = 0;
  let unchanged = 0;
  let missingEntitlement = 0;
  let errors = 0;

  for (const family of families) {
    const appUserId = family.revenuecatAppUserId || family.id;

    try {
      const entitlement = await fetchActiveEntitlement(appUserId, secretKey);
      if (!entitlement) {
        missingEntitlement++;
        if (options.verbose) {
          console.log(`[Skip] ${family.id} no active premium entitlement`);
        }
        continue;
      }

      const expiresAt = new Date(entitlement.expires_date as string);
      const period = inferPeriod(entitlement.product_identifier);

      const alreadySynced =
        family.plan === 'premium' &&
        family.subscriptionStatus === 'active' &&
        family.subscriptionPeriod === period &&
        !!family.subscriptionExpiresAt &&
        new Date(family.subscriptionExpiresAt).getTime() === expiresAt.getTime();

      if (alreadySynced) {
        unchanged++;
        if (options.verbose) {
          console.log(`[OK] ${family.id} already active premium`);
        }
        continue;
      }

      if (options.write) {
        await prisma.family.update({
          where: { id: family.id },
          data: {
            plan: 'premium',
            subscriptionStatus: 'active',
            subscriptionExpiresAt: expiresAt,
            subscriptionPeriod: period,
            gracePeriodEndsAt: null,
          },
        });
      }

      updated++;
      console.log(
        `[${options.write ? 'Updated' : 'Would update'}] ${family.id} -> premium/active until ${expiresAt.toISOString()}`,
      );
    } catch (err: any) {
      errors++;
      console.error(`[Error] ${family.id} (${appUserId}): ${err?.message || err}`);
    }
  }

  console.log('');
  console.log('[Sync] Complete');
  console.log(`[Sync] Updated: ${updated}`);
  console.log(`[Sync] Unchanged: ${unchanged}`);
  console.log(`[Sync] No active entitlement: ${missingEntitlement}`);
  console.log(`[Sync] Errors: ${errors}`);

  if (!options.write) {
    console.log('[Sync] Dry-run only. Re-run with --write to apply changes.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
