import { prisma } from '@/lib/prisma';
import { auth } from './betterAuth';
import { AuthError, AuthUser } from './types';

/**
 * Guard for platform administration endpoints.
 *
 * Verifies that the authenticated session user has `isPlatformAdmin = true`
 * in the Postgres `users` table.
 *
 * Does NOT invoke membership resolution and does NOT return tenant context.
 */
export async function requirePlatformAdmin(request: Request): Promise<AuthUser> {
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
        isPlatformAdmin: true,
      },
    });

    if (!user || !user.isPlatformAdmin) {
      throw new AuthError('Forbidden: Platform admin access required', 403);
    }

    return {
      uid: user.id,
      email: user.email,
      claims: { isPlatformAdmin: true },
    };
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    throw new AuthError('Invalid or expired authentication session', 401);
  }
}
