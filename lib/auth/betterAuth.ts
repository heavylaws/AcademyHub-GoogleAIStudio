import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '@/lib/prisma';
import { appEnv } from '@/lib/env';
import { getInitialUserRole } from './initialUserRole';

const secret = appEnv.betterAuthSecret;

export const auth = betterAuth({
  baseURL: appEnv.betterAuthUrl,
  secret,
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
    transaction: true,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
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
