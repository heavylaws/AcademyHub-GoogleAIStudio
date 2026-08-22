import { prisma } from '@/lib/prisma';
import { auth } from './betterAuth';
import { AuthError, AuthUser } from './types';

/**
 * Resolves a Better Auth database-backed session and its authoritative user row.
 *
 * Membership resolution:
 *   - Exactly one membership → use it. Role and academyId come from that row.
 *   - No memberships → authenticated but unattached. Role and academyId are
 *     undefined; requireRole will reject downstream.
 *   - More than one membership → refuse the request. An active-academy selector
 *     is required before multi-academy users can be supported.
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
          select: { role: true, academyId: true },
        },
      },
    });

    if (!user) {
      throw new AuthError('Authenticated user was not found', 401);
    }

    const { memberships } = user;

    if (memberships.length > 1) {
      throw new AuthError(
        'Multiple academy memberships found. An active-academy selector is required to resolve tenant context.',
        403,
      );
    }

    const membership = memberships[0];
    const role = membership?.role?.toLowerCase();
    const academyId = membership?.academyId;

    return {
      uid: user.id,
      email: user.email,
      role,
      academyId,
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
