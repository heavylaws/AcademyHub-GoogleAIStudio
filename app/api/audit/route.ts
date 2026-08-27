import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyRequestAuth } from '@/lib/auth/verifyRequestAuth';
import { requireRole } from '@/lib/auth/requireRole';
import { authFailure } from '@/lib/auth/authFailure';
import { AuthError } from '@/lib/auth/types';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  let user;
  try {
    user = await verifyRequestAuth(request);
    requireRole(user, ['admin']);
  } catch (err) {
    return authFailure(err);
  }

  if (!user.academyId) {
    return NextResponse.json({ error: 'Forbidden: No academy context' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor') || undefined;
    const action = searchParams.get('action') || undefined;
    const limitParam = searchParams.get('limit');
    
    const parsedLimit = limitParam ? parseInt(limitParam, 10) : 50;
    const limit = Math.min(isNaN(parsedLimit) || parsedLimit <= 0 ? 50 : parsedLimit, 50);

    // ALWAYS filter by user.academyId; any academyId query param is strictly ignored.
    const where: Prisma.AuditLogWhereInput = {
      academyId: user.academyId,
    };
    if (action) {
      where.action = action;
    }

    const auditLogs = await prisma.auditLog.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { createdAt: 'desc' },
    });

    let nextCursor: string | null = null;
    if (auditLogs.length > limit) {
      const nextItem = auditLogs.pop();
      nextCursor = nextItem?.id ?? null;
    }

    return NextResponse.json({ auditLogs, nextCursor });
  } catch (err) {
    if (err instanceof AuthError) {
      return authFailure(err);
    }
    console.error('Error fetching audit log:', err);
    return NextResponse.json({ error: 'Failed to fetch audit log' }, { status: 500 });
  }
}
