import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePlatformAdmin } from '@/lib/auth/requirePlatformAdmin';
import { AuthError } from '@/lib/auth/types';
import { appEnv } from '@/lib/env';
import { generateInviteToken } from '@/lib/auth/inviteToken';

export const dynamic = 'force-dynamic';

function authFailure(err: unknown) {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode });
  }
  return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
}

export async function POST(request: Request) {
  let adminUser;
  try {
    adminUser = await requirePlatformAdmin(request);
  } catch (err) {
    return authFailure(err);
  }

  try {
    const body = await request.json();
    const { email, academyId } = body ?? {};

    if (!email?.trim() || !academyId?.trim()) {
      return NextResponse.json({ error: 'email and academyId are required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const academy = await prisma.academy.findUnique({
      where: { id: academyId },
    });
    if (!academy || !academy.isActive) {
      return NextResponse.json({ error: 'Academy not found or inactive' }, { status: 400 });
    }

    // Check if user already has an ADMIN membership in this academy
    const existingMembership = await prisma.membership.findFirst({
      where: {
        academyId,
        user: { email: normalizedEmail },
      },
    });
    if (existingMembership) {
      return NextResponse.json(
        { error: 'User already holds a membership in this academy' },
        { status: 409 },
      );
    }

    // Revoke any existing pending invites for this email + academy (supersede duplicate pending invites)
    await prisma.invite.updateMany({
      where: {
        email: normalizedEmail,
        academyId,
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
        academyId,
        role: 'ADMIN',
        tokenHash,
        expiresAt,
        invitedByUserId: adminUser.uid,
      },
    });

    const acceptUrl = `${appEnv.betterAuthUrl}/invite/${rawToken}`;

    return NextResponse.json(
      {
        invite: {
          id: invite.id,
          email: invite.email,
          academyId: invite.academyId,
          role: invite.role,
          expiresAt: invite.expiresAt.toISOString(),
          acceptUrl,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    console.error('Error creating platform invite:', err);
    return NextResponse.json({ error: 'Failed to create platform invite' }, { status: 500 });
  }
}
