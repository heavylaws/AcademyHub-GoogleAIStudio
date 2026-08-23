import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const targetEmail = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();

  if (!targetEmail) {
    throw new Error('ADMIN_BOOTSTRAP_EMAIL is required.');
  }

  const user = await prisma.user.findUnique({
    where: { email: targetEmail },
    select: { id: true, email: true },
  });

  if (!user) {
    console.error(`No existing user found for ADMIN_BOOTSTRAP_EMAIL=${targetEmail}`);
    process.exitCode = 1;
    return;
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      isPlatformAdmin: true,
    },
    select: { id: true, email: true, isPlatformAdmin: true },
  });

  console.log(`Granted platform admin status (isPlatformAdmin: ${updatedUser.isPlatformAdmin}) to ${updatedUser.email}.`);
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Seed failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
