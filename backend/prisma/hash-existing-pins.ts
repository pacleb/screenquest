/**
 * One-time migration script to hash any existing plaintext PINs in the database.
 *
 * Usage:
 *   npx ts-node prisma/hash-existing-pins.ts
 *
 * This script finds all users with a non-null PIN that is NOT already a bcrypt hash
 * (bcrypt hashes start with "$2b$" or "$2a$") and hashes them with bcrypt (10 rounds).
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      pin: { not: null },
    },
    select: { id: true, name: true, pin: true },
  });

  let updated = 0;
  let skipped = 0;

  for (const user of users) {
    if (!user.pin) continue;

    // Skip if already a bcrypt hash
    if (user.pin.startsWith('$2b$') || user.pin.startsWith('$2a$')) {
      skipped++;
      continue;
    }

    const hashed = await bcrypt.hash(user.pin, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { pin: hashed },
    });

    console.log(`  Hashed PIN for user "${user.name}" (${user.id})`);
    updated++;
  }

  console.log(`\nDone. Updated: ${updated}, Already hashed: ${skipped}, Total: ${users.length}`);
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
