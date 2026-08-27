import { PrismaClient } from '@prisma/client';
import { appEnv } from './env';

/**
 * Global Prisma Client singleton instance for Next.js.
 * Prevents multiple instances of Prisma Client in development during hot-reloading.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
   datasourceUrl: appEnv.databaseUrl,
   log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
