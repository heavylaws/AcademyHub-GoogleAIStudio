import { PrismaClient, UserRole } from '@prisma/client';

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

  const academyName = process.env.DEFAULT_ACADEMY_NAME || 'AcademyHub Global';
  const academySlug = process.env.DEFAULT_ACADEMY_SLUG || 'global';

  const academy = await prisma.academy.upsert({
    where: { slug: academySlug },
    update: {},
    create: {
      name: academyName,
      slug: academySlug,
    },
  });

  const membership = await prisma.membership.upsert({
    where: {
      userId_academyId: {
        userId: user.id,
        academyId: academy.id,
      },
    },
    update: {
      role: UserRole.ADMIN,
    },
    create: {
      userId: user.id,
      academyId: academy.id,
      role: UserRole.ADMIN,
    },
  });

  console.log(`Promoted ${user.email} to role ${membership.role} in academy ${academy.slug}.`);
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
