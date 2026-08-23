import { prisma } from '@/lib/prisma';
import { AuthUser, ResourceType, AuthError } from './types';

/**
 * Verifies that the authenticated user's academy owns the target resource,
 * then applies role-based access rules.
 *
 * Check order:
 *   1. No user.academyId → 403.
 *   2. Load the resource and its academyId — for every role, including admin.
 *   3. Resource not found OR academyId mismatch → 404 (does not confirm
 *      whether the ID exists in another academy).
 *   4. Role rules:
 *      - admin  → allowed (tenant verified).
 *      - coach  → allowed for athlete and assessment; 403 for invoice.
 *      - parent → parentUserId must equal user.uid, else 403.
 */
export async function requireOwnership(
  user: AuthUser,
  resourceType: ResourceType,
  resourceId: string
): Promise<void> {
  if (!user || !user.uid) {
    throw new AuthError('Unauthorized', 401);
  }

  if (!user.academyId) {
    throw new AuthError('Forbidden: No academy context', 403);
  }

  if (!resourceId) {
    throw new AuthError('Forbidden: Resource identifier missing', 403);
  }

  try {
    let resourceAcademyId: string | undefined;
    let parentUserId: string | null | undefined;

    if (resourceType === 'athlete') {
      const athlete = await prisma.athlete.findUnique({
        where: { id: resourceId },
        select: { academyId: true, parentUserId: true, deletedAt: true },
      });
      if (athlete?.deletedAt !== null && athlete?.deletedAt !== undefined) {
        throw new AuthError('Resource not found', 404);
      }
      resourceAcademyId = athlete?.academyId;
      parentUserId = athlete?.parentUserId;
    } else if (resourceType === 'invoice') {
      const invoice = await prisma.invoice.findUnique({
        where: { id: resourceId },
        select: { academyId: true, parentUserId: true },
      });
      resourceAcademyId = invoice?.academyId;
      parentUserId = invoice?.parentUserId;
    } else if (resourceType === 'assessment') {
      const assessment = await prisma.assessment.findUnique({
        where: { id: resourceId },
        select: {
          academyId: true,
          deletedAt: true,
          athlete: { select: { parentUserId: true, deletedAt: true } },
        },
      });
      if (
        (assessment?.deletedAt !== null && assessment?.deletedAt !== undefined) ||
        (assessment?.athlete?.deletedAt !== null && assessment?.athlete?.deletedAt !== undefined)
      ) {
        throw new AuthError('Resource not found', 404);
      }
      resourceAcademyId = assessment?.academyId;
      parentUserId = assessment?.athlete?.parentUserId;
    } else if (resourceType === 'schedule') {
      const schedule = await prisma.schedule.findUnique({
        where: { id: resourceId },
        select: { academyId: true, deletedAt: true },
      });
      if (schedule?.deletedAt !== null && schedule?.deletedAt !== undefined) {
        throw new AuthError('Resource not found', 404);
      }
      resourceAcademyId = schedule?.academyId;
    } else {
      throw new AuthError('Forbidden: Unsupported resource type', 403);
    }

    // Resource not found or cross-tenant → 404 (information hiding)
    if (!resourceAcademyId || resourceAcademyId !== user.academyId) {
      throw new AuthError('Resource not found', 404);
    }

    // Tenant verified. Apply role rules.
    if (user.role === 'admin') {
      return;
    }

    if (user.role === 'coach') {
      if (resourceType === 'invoice') {
        throw new AuthError('Forbidden: Coaches do not have invoice access', 403);
      }
      return;
    }

    // Parent: allowed read-only schedule access within academy; athlete/invoice/assessment require parentUserId ownership
    if (resourceType === 'schedule') {
      return;
    }

    if (!parentUserId || parentUserId !== user.uid) {
      throw new AuthError('Forbidden: You do not own this resource', 403);
    }
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      throw err;
    }
    console.error(`Database error checking ${resourceType} ownership for ${resourceId}:`, err);
    throw new AuthError('Forbidden: Resource ownership check failed', 403);
  }
}
