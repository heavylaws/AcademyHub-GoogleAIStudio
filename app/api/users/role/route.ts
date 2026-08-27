import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyRequestAuth } from '@/lib/auth/verifyRequestAuth';
import { requireRole } from '@/lib/auth/requireRole';
import { AuthError } from '@/lib/auth/types';
import { authFailure } from '@/lib/auth/authFailure';
import { Prisma, UserRole } from '@prisma/client';
import { writeAuditLog } from '@/lib/audit/writeAuditLog';

const validRoles = new Set(['admin', 'coach', 'parent']);
const roleMap = {
  admin: UserRole.ADMIN,
  coach: UserRole.COACH,
  parent: UserRole.PARENT,
} as const;

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await verifyRequestAuth(request);
    requireRole(user, ['admin']);

    if (!user.academyId) {
      return NextResponse.json({ error: 'Forbidden: No academy context' }, { status: 403 });
    }

    // Scope to caller's academy — only list users who are members of this academy
    const memberships = await prisma.membership.findMany({
      where: { academyId: user.academyId },
      select: {
        role: true,
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
      orderBy: { user: { createdAt: 'asc' } },
    });

    return NextResponse.json({
      users: memberships.map((entry) => ({
        uid: entry.user.id,
        email: entry.user.email,
        displayName: entry.user.displayName,
        role: entry.role ? String(entry.role).toLowerCase() : 'none',
      })),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return authFailure(error);
    }

    console.error('Failed to list users:', error);
    return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await verifyRequestAuth(request);
    requireRole(user, ['admin']);

    if (!user.academyId) {
      return NextResponse.json({ error: 'Forbidden: No academy context' }, { status: 403 });
    }

    const payload = await request.json();
    const { uid, role } = payload ?? {};

    if (!uid || typeof uid !== 'string') {
      return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
    }

    if (typeof role !== 'string' || !validRoles.has(role)) {
      return NextResponse.json({ error: 'Invalid role value. Allowed: admin, coach, parent.' }, { status: 400 });
    }

    const normalizedRole = role as keyof typeof roleMap;

    // Find the target user's membership in the CALLER's academy (not take: 1 globally)
    const membership = await prisma.membership.findUnique({
      where: {
        userId_academyId: {
          userId: uid,
          academyId: user.academyId,
        },
      },
      select: { id: true, role: true },
    });

    if (!membership) {
      return NextResponse.json({ error: 'User not found in this academy' }, { status: 404 });
    }

    const demotingAdmin = membership.role === UserRole.ADMIN && normalizedRole !== 'admin';

    if (demotingAdmin) {
      await prisma.$transaction(async (tx) => {
        // Count admins in THIS academy, not globally
        const adminCount = await tx.membership.count({
          where: { role: UserRole.ADMIN, academyId: user.academyId },
        });

        if (adminCount <= 1) {
          throw new AuthError('Cannot remove the last remaining admin.', 409);
        }

        await tx.membership.update({
          where: { id: membership.id },
          data: { role: roleMap[normalizedRole] },
        });

        await writeAuditLog(
          {
            academyId: user.academyId,
            actorUserId: user.uid,
            action: 'ROLE_CHANGED',
            targetType: 'Membership',
            targetId: membership.id,
            metadata: {
              before: membership.role,
              after: roleMap[normalizedRole],
            },
          },
          tx
        );
      });

      return NextResponse.json({ success: true, role: normalizedRole });
    }

    await prisma.membership.update({
      where: { id: membership.id },
      data: { role: roleMap[normalizedRole] },
    });

    await writeAuditLog({
      academyId: user.academyId,
      actorUserId: user.uid,
      action: 'ROLE_CHANGED',
      targetType: 'Membership',
      targetId: membership.id,
      metadata: {
        before: membership.role,
        after: roleMap[normalizedRole],
      },
    });

    return NextResponse.json({ success: true, role: normalizedRole });
  } catch (error) {
    if (error instanceof AuthError) {
      return authFailure(error);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.error('Failed to update user role:', error);
    return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 });
  }
}
