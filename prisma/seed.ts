import { PrismaClient } from '@prisma/client';
import { auth } from '../lib/auth/betterAuth';
import { internalInviteScope } from '../lib/auth/internalInviteScope';

const prisma = new PrismaClient();

async function main() {
  const targetEmail = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const targetPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD?.trim();

  if (!targetEmail) {
    throw new Error('ADMIN_BOOTSTRAP_EMAIL is required.');
  }

  let user = await prisma.user.findUnique({
    where: { email: targetEmail },
    select: { id: true, email: true },
  });

  if (!user) {
    if (!targetPassword) {
      console.error(`User ${targetEmail} not found. Please provide ADMIN_BOOTSTRAP_PASSWORD in your .env to create the bootstrap account.`);
      process.exitCode = 1;
      return;
    }
    
    console.log(`Creating bootstrap user ${targetEmail}...`);
    // Create user via BetterAuth, bypassing the public signup block
    const signUpResult = await internalInviteScope.run(true, async () => {
      return await auth.api.signUpEmail({
        body: { email: targetEmail, password: targetPassword, name: 'Platform Admin' }
      });
    });
    
    user = { id: signUpResult.user.id, email: signUpResult.user.email };
    console.log(`Created bootstrap account with ID: ${user.id}`);
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
