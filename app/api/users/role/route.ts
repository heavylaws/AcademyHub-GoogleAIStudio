import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyRequestAuth } from '@/lib/auth/verifyRequestAuth';
import { requireRole } from '@/lib/auth/requireRole';
import { AuthError } from '@/lib/auth/types';
import { getAuth } from 'firebase-admin/auth';
import '@/lib/firebaseAdmin';

const validRoles = new Set(['admin', 'coach', 'parent']);

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
        role: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      users: users.map((entry) => ({
        uid: entry.id,
        email: entry.email,
        displayName: entry.displayName,
        role: String(entry.role).toLowerCase(),
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

    const targetUser = await prisma.user.findUnique({ where: { id: uid } });
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const claimRole = role as 'admin' | 'coach' | 'parent';
    await getAuth().setCustomUserClaims(uid, { role: claimRole });
    await prisma.user.update({
      where: { id: uid },
      data: { role: claimRole.toUpperCase() as 'ADMIN' | 'COACH' | 'PARENT' },
    });

    return NextResponse.json({ success: true, role: claimRole });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error('Failed to update user role:', error);
    return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 });
  }
}
