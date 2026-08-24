import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyRequestAuth } from '@/lib/auth/verifyRequestAuth';
import { requireRole } from '@/lib/auth/requireRole';
import { authFailure } from '@/lib/auth/authFailure';
import { appEnv } from '@/lib/env';
import { generateInviteToken } from '@/lib/auth/inviteToken';
import { UserRole } from '@prisma/client';

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
    const invites = await prisma.invite.findMany({
      where: {
        academyId: user.academyId,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ invites });
  } catch (err) {
    console.error('Error listing academy invites:', err);
    return NextResponse.json({ error: 'Failed to list invites' }, { status: 500 });
  }
}

export async function POST(request: Request) {
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
    const body = await request.json();
    const { email, role } = body ?? {};

    if (!email?.trim() || !role?.trim()) {
      return NextResponse.json({ error: 'email and role are required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedRole = role.trim().toLowerCase();

    if (normalizedRole === 'admin') {
      return NextResponse.json(
        { error: 'Academy admins can only invite coaches and parents.' },
        { status: 400 },
      );
    }

    if (normalizedRole !== 'coach' && normalizedRole !== 'parent') {
      return NextResponse.json(
        { error: 'Invalid role. Permitted roles: coach, parent.' },
        { status: 400 },
      );
    }

    const targetRole = normalizedRole === 'coach' ? UserRole.COACH : UserRole.PARENT;

    // Check if user already holds a membership in caller's academy
    const existingMembership = await prisma.membership.findFirst({
      where: {
        academyId: user.academyId,
        user: { email: normalizedEmail },
      },
    });
    if (existingMembership) {
      return NextResponse.json(
        { error: 'User is already a member of this academy.' },
        { status: 409 },
      );
    }

    // Revoke any existing pending invites for email + caller's academy (supersede duplicate invites)
    await prisma.invite.updateMany({
      where: {
        email: normalizedEmail,
        academyId: user.academyId,
        acceptedAt: null,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    const { rawToken, tokenHash } = generateInviteToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invite = await prisma.invite.create({
      data: {
        email: normalizedEmail,
        academyId: user.academyId,
        role: targetRole,
        tokenHash,
        expiresAt,
        invitedByUserId: user.uid,
      },
    });

    const acceptUrl = `${appEnv.betterAuthUrl}/invite/${rawToken}`;

    return NextResponse.json(
      {
        invite: {
          id: invite.id,
          email: invite.email,
          role: String(invite.role).toLowerCase(),
          expiresAt: invite.expiresAt.toISOString(),
          acceptUrl,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    console.error('Error creating academy invite:', err);
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
  }
}
