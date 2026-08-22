import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '@/lib/prisma';
import { appEnv } from '@/lib/env';


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
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user, _context) => {
          return {
            data: {
              email: user.email.toLowerCase(),
            },
          };
        },
      },
    },
  },
});
