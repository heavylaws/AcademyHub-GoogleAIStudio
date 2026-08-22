import { prisma } from '@/lib/prisma';
import { auth } from './betterAuth';
import { AuthError, AuthUser } from './types';

/**
 * Resolves a Better Auth database-backed session and its authoritative user row.
 */
export async function verifyRequestAuth(request: Request): Promise<AuthUser> {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      throw new AuthError('Missing authentication session', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        memberships: {
          select: { role: true },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new AuthError('Authenticated user was not found', 401);
    }

    const role = user.memberships[0]?.role?.toLowerCase();

    return {
      uid: user.id,
      email: user.email,
      role,
      // Vestigial compatibility field for existing authorization helpers.
      claims: { role },
    };
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }

    console.warn('Better Auth session verification failed:', error);
    throw new AuthError('Invalid or expired authentication session', 401);
  }
}
