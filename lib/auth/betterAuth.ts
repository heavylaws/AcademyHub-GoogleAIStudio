import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '@/lib/prisma';
import { getInitialUserRole } from './initialUserRole';

const secret = process.env.BETTER_AUTH_SECRET;

if (!secret) {
  throw new Error('BETTER_AUTH_SECRET is required.');
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || process.env.APP_URL,
  secret,
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
    transaction: true,
  }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    cookieCache: {
      enabled: false,
    },
  },
  user: {
    fields: {
      name: 'displayName',
    },
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        input: false,
        returned: true,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (_user, context) => {
          if (!context) {
            throw new Error('A request context is required to create a user.');
          }

          // Better Auth runs this hook inside the sign-up transaction.
          const userCount = await context.context.internalAdapter.countTotalUsers();
          return {
            data: {
              role: getInitialUserRole(userCount),
            },
          };
        },
      },
    },
  },
});
