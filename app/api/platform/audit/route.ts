import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePlatformAdmin } from '@/lib/auth/requirePlatformAdmin';
import { authFailure } from '@/lib/auth/authFailure';
import { AuthError } from '@/lib/auth/types';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requirePlatformAdmin(request);
  } catch (err) {
    return authFailure(err);
  }

  try {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor') || undefined;
    const academyId = searchParams.get('academyId') || undefined;
    const action = searchParams.get('action') || undefined;
    const limitParam = searchParams.get('limit');
    
    const parsedLimit = limitParam ? parseInt(limitParam, 10) : 50;
    const limit = Math.min(isNaN(parsedLimit) || parsedLimit <= 0 ? 50 : parsedLimit, 50);

    const where: Prisma.AuditLogWhereInput = {};
    if (academyId) {
      where.academyId = academyId;
    }
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
    console.error('Error fetching platform audit log:', err);
    return NextResponse.json({ error: 'Failed to fetch platform audit log' }, { status: 500 });
  }
}
