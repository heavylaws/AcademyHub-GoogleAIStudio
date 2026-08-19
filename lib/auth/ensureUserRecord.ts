import { prisma } from '@/lib/prisma';
import { AuthUser } from './types';

const roleMap = {
  admin: 'ADMIN',
  coach: 'COACH',
  parent: 'PARENT',
} as const;

export async function ensureUserRecord(user: AuthUser): Promise<void> {
  if (!user.email) {
    throw new Error('Authenticated Firebase user is missing an email address.');
  }

  const role = roleMap[user.role as keyof typeof roleMap] || 'PARENT';

  await prisma.user.upsert({
    where: { id: user.uid },
    update: {
      email: user.email,
      role,
    },
    create: {
      id: user.uid,
      email: user.email,
      role,
    },
  });
}
