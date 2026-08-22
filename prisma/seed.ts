import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const targetEmail = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();

  if (!targetEmail) {
    throw new Error('ADMIN_BOOTSTRAP_EMAIL is required.');
  }

  const user = await prisma.user.findUnique({
    where: { email: targetEmail },
    select: { id: true, email: true, role: true },
  });

  if (!user) {
    throw new Error(`No existing user found for ADMIN_BOOTSTRAP_EMAIL=${targetEmail}`);
  }

  if (user.role === UserRole.ADMIN) {
    console.log(`User ${user.email} is already ADMIN; no changes made.`);
    return;
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { role: UserRole.ADMIN },
    select: { id: true, email: true, role: true },
  });

  console.log(`Promoted ${updatedUser.email} to role ${updatedUser.role}.`);
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
