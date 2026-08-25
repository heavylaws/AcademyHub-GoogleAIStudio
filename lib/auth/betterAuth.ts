import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '../prisma';
import { appEnv } from '../env';
import { internalInviteScope } from './internalInviteScope';

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
          if (!internalInviteScope.getStore()) {
            throw new APIError('FORBIDDEN', {
              message: 'Public sign-up is disabled. Registration requires an invitation.',
            });
          }
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
