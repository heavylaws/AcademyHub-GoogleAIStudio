import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePlatformAdmin } from '@/lib/auth/requirePlatformAdmin';
import { authFailure } from '@/lib/auth/authFailure';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    await requirePlatformAdmin(request);
  } catch (err) {
    return authFailure(err);
  }

  try {
    const academy = await prisma.academy.findUnique({ where: { id } });
    if (!academy) {
      return NextResponse.json({ error: 'Academy not found' }, { status: 404 });
    }

    const updated = await prisma.academy.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, name: true, slug: true, isActive: true },
    });

    return NextResponse.json({ academy: updated });
  } catch (err) {
    console.error(`Error deactivating academy ${id}:`, err);
    return NextResponse.json({ error: 'Failed to deactivate academy' }, { status: 500 });
  }
}
