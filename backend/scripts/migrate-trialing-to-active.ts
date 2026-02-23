/**
 * Phase 17 data migration: trialing → active / expired
 *
 * Finds all families with subscriptionStatus = 'trialing' and migrates them:
 *   - If subscriptionExpiresAt is in the future → 'active'
 *   - Otherwise → 'expired' (and drops the premium plan back to 'free')
 *
 * Run once after deploying Phase 17 backend changes:
 *   npx ts-node -r tsconfig-paths/register scripts/migrate-trialing-to-active.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const now = new Date();

  const trialingFamilies = await prisma.family.findMany({
    where: { subscriptionStatus: 'trialing' },
    select: {
      id: true,
      subscriptionExpiresAt: true,
    },
  });

  console.log(`Found ${trialingFamilies.length} trialing families.`);

  let activatedCount = 0;
  let expiredCount = 0;

  for (const family of trialingFamilies) {
    const isStillValid =
      family.subscriptionExpiresAt && family.subscriptionExpiresAt > now;

    if (isStillValid) {
      await prisma.family.update({
        where: { id: family.id },
        data: { subscriptionStatus: 'active' },
      });
      activatedCount++;
    } else {
      await prisma.family.update({
        where: { id: family.id },
        data: {
          plan: 'free',
          subscriptionStatus: 'expired',
        },
      });
      expiredCount++;
    }
  }

  console.log(
    `Migration complete: ${activatedCount} → active, ${expiredCount} → expired.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
