import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyRequestAuth } from '@/lib/auth/verifyRequestAuth';
import { requireRole } from '@/lib/auth/requireRole';
import { authFailure } from '@/lib/auth/authFailure';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
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
    const invite = await prisma.invite.findFirst({
      where: {
        id,
        academyId: user.academyId,
      },
    });

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    const revoked = await prisma.invite.update({
      where: { id },
      data: { revokedAt: new Date() },
      select: { id: true, email: true, role: true, revokedAt: true },
    });

    return NextResponse.json({ invite: revoked });
  } catch (err) {
    console.error(`Error revoking invite ${id}:`, err);
    return NextResponse.json({ error: 'Failed to revoke invite' }, { status: 500 });
  }
}
