import { PrismaClient } from '@prisma/client';

/**
 * Global Prisma Client singleton instance for Next.js.
 * Prevents multiple instances of Prisma Client in development during hot-reloading.
 * 
 * NOTE: Phase 0 setup only. This client is not imported or invoked in any application
 * route or service until Phase 1 / Phase 2 migration.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
