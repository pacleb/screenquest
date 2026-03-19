/**
 * Promote a user to app admin by email address.
 *
 * Usage:
 *   npx ts-node prisma/promote-admin.ts <email>
 *
 * Example:
 *   npx ts-node prisma/promote-admin.ts admin@example.com
 *
 * Make sure DATABASE_URL is set correctly before running this script.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.toLowerCase();

  if (!email) {
    console.error('Usage: npx ts-node prisma/promote-admin.ts <email>');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  if (user.isAppAdmin) {
    console.log(`User ${email} is already an app admin.`);
    return;
  }

  await prisma.user.update({
    where: { email },
    data: { isAppAdmin: true },
  });

  console.log(`✅ User ${email} (${user.name || user.id}) promoted to app admin.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
