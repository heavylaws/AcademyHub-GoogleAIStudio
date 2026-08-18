import { prisma } from '@/lib/prisma';
import { AuthUser, ResourceType, AuthError } from './types';

/**
 * Checks resource ownership for the given resource type ('athlete' | 'invoice') and resourceId.
 * 
 * Rules:
 * 1. Admin and Coach roles bypass ownership checks and are granted access.
 * 2. Parent users must match the parentUserId field on the resource in Postgres (via Prisma).
 * 3. Fails closed on resource not found or database errors.
 */
export async function requireOwnership(
  user: AuthUser,
  resourceType: ResourceType,
  resourceId: string
): Promise<void> {
  if (!user || !user.uid) {
    throw new AuthError('Unauthorized', 401);
  }

  // Admin and Coach roles are granted access to all athletes and invoices
  if (user.role === 'admin' || user.role === 'coach') {
    return;
  }

  if (!resourceId) {
    throw new AuthError('Forbidden: Resource identifier missing', 403);
  }

  try {
    let parentUserId: string | null | undefined = null;

    if (resourceType === 'athlete') {
      const athlete = await prisma.athlete.findUnique({
        where: { id: resourceId },
        select: { parentUserId: true },
      });
      parentUserId = athlete?.parentUserId;
    } else if (resourceType === 'invoice') {
      const invoice = await prisma.invoice.findUnique({
        where: { id: resourceId },
        select: { parentUserId: true },
      });
      parentUserId = invoice?.parentUserId;
    } else {
      throw new AuthError('Forbidden: Unsupported resource type', 403);
    }

    if (!parentUserId || parentUserId !== user.uid) {
      throw new AuthError('Forbidden: You do not own this resource', 403);
    }
  } catch (err: any) {
    if (err instanceof AuthError) {
      throw err;
    }
    console.error(`Database error checking ${resourceType} ownership for ${resourceId}:`, err);
    throw new AuthError('Forbidden: Resource ownership check failed', 403);
  }
}
