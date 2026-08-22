import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyRequestAuth } from '@/lib/auth/verifyRequestAuth';
import { requireRole } from '@/lib/auth/requireRole';
import { AuthError } from '@/lib/auth/types';
import { Prisma, UserRole } from '@prisma/client';

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

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        displayName: true,
        memberships: { select: { role: true }, take: 1 },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      users: users.map((entry) => ({
        uid: entry.id,
        email: entry.email,
        displayName: entry.displayName,
        role: entry.memberships[0]?.role ? String(entry.memberships[0].role).toLowerCase() : 'none',
      })),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error('Failed to list users:', error);
    return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await verifyRequestAuth(request);
    requireRole(user, ['admin']);

    const payload = await request.json();
    const { uid, role } = payload ?? {};

    if (!uid || typeof uid !== 'string') {
      return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
    }

    if (typeof role !== 'string' || !validRoles.has(role)) {
      return NextResponse.json({ error: 'Invalid role value. Allowed: admin, coach, parent.' }, { status: 400 });
    }

    const normalizedRole = role as keyof typeof roleMap;
    const existingUser = await prisma.user.findUnique({
      where: { id: uid },
      select: { id: true, memberships: { select: { id: true, role: true }, take: 1 } },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const membership = existingUser.memberships[0];
    if (!membership) {
      return NextResponse.json({ error: 'User has no membership to update' }, { status: 400 });
    }

    const demotingAdmin = membership.role === UserRole.ADMIN && normalizedRole !== 'admin';

    if (demotingAdmin) {
      await prisma.$transaction(async (tx) => {
        const adminCount = await tx.membership.count({
          where: { role: UserRole.ADMIN },
        });

        if (adminCount <= 1) {
          throw new AuthError('Cannot remove the last remaining admin.', 409);
        }

        await tx.membership.update({
          where: { id: membership.id },
          data: { role: roleMap[normalizedRole] },
        });
      });

      return NextResponse.json({ success: true, role: normalizedRole });
    }

    await prisma.membership.update({
      where: { id: membership.id },
      data: { role: roleMap[normalizedRole] },
    });

    return NextResponse.json({ success: true, role: normalizedRole });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.error('Failed to update user role:', error);
    return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 });
  }
}
