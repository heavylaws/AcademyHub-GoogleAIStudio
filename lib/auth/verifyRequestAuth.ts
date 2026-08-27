import { prisma } from '@/lib/prisma';
import { auth } from './betterAuth';
import { AuthError, AuthUser } from './types';

/**
 * Resolves a Better Auth database-backed session and its authoritative user row.
 *
 * Membership resolution with X-Academy-Id header support:
 *   - No memberships → authenticated but unattached. Role and academyId are
 *     undefined; requireRole will reject downstream.
 *   - Exactly one membership, no header → use it.
 *   - Exactly one membership, header present → validate it matches; 403 if not.
 *   - More than one membership, no header → 409 with available academies list.
 *   - More than one membership, header present → find matching membership; 403 if
 *     not a member of the requested academy.
 *
 * The X-Academy-Id header is treated as a claim, not a credential. It is always
 * validated against the Membership table on every request.
 */
export async function verifyRequestAuth(request: Request): Promise<AuthUser> {
  let session;
  try {
    session = await auth.api.getSession({
      headers: request.headers,
    });
  } catch (error) {
    console.warn('Better Auth session verification failed:', error);
    throw new AuthError('Invalid or expired authentication session', 401);
  }

  try {
    if (!session?.user) {
      throw new AuthError('Missing authentication session', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        memberships: {
          select: {
            role: true,
            academyId: true,
            academy: { select: { name: true } },
          },
        },
      },
    });

    if (!user) {
      throw new AuthError('Authenticated user was not found', 401);
    }

    const { memberships } = user;
    const requestedAcademyId = request.headers.get('x-academy-id');

    // --- 0 memberships: unattached user ---
    if (memberships.length === 0) {
      return {
        uid: user.id,
        email: user.email,
        role: undefined,
        academyId: undefined,
        claims: { role: undefined },
      };
    }

    // --- 1 membership ---
    if (memberships.length === 1) {
      const membership = memberships[0];

      // If header is present, validate it matches the single membership
      if (requestedAcademyId && requestedAcademyId !== membership.academyId) {
        throw new AuthError('Forbidden: Not a member of the requested academy', 403);
      }

      const role = membership.role?.toLowerCase();
      return {
        uid: user.id,
        email: user.email,
        role,
        academyId: membership.academyId,
        claims: { role },
      };
    }

    // --- >1 memberships ---
    if (!requestedAcademyId) {
      // No header → 409 with academy list for the selector UI
      const academies = memberships.map((m) => ({
        id: m.academyId,
        name: m.academy.name,
        role: m.role?.toLowerCase(),
      }));

      const error = new AuthError(
        'Multiple academy memberships found. Select an academy to continue.',
        409,
      );
      // Attach academies list as a property for the route handler to include in the response
      (error as AuthError & { academies: typeof academies }).academies = academies;
      throw error;
    }

    // Header present → find matching membership
    const matched = memberships.find((m) => m.academyId === requestedAcademyId);

    if (!matched) {
      throw new AuthError('Forbidden: Not a member of the requested academy', 403);
    }

    const role = matched.role?.toLowerCase();
    return {
      uid: user.id,
      email: user.email,
      role,
      academyId: matched.academyId,
      claims: { role },
    };
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }

    console.error('Authentication context resolution failed:', error);
    throw new AuthError('Authentication context resolution failed', 500);
  }
}
