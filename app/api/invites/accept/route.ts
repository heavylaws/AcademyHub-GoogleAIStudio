import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth/betterAuth';
import { verifyRequestAuth } from '@/lib/auth/verifyRequestAuth';
import { hashInviteToken } from '@/lib/auth/inviteToken';
import { internalInviteScope } from '@/lib/auth/internalInviteScope';

export const dynamic = 'force-dynamic';

const UNIFORM_TOKEN_ERROR = 'Invalid or expired invitation token.';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, password, displayName } = body ?? {};

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: UNIFORM_TOKEN_ERROR }, { status: 400 });
    }

    const tokenHash = hashInviteToken(token.trim());

    const invite = await prisma.invite.findUnique({
      where: { tokenHash },
      include: { academy: true },
    });

    const now = new Date();

    // 5 Invalid modes -> 400 Bad Request with identical response body
    if (
      !invite ||
      invite.expiresAt <= now ||
      invite.acceptedAt !== null ||
      invite.revokedAt !== null ||
      !invite.academy.isActive
    ) {
      return NextResponse.json({ error: UNIFORM_TOKEN_ERROR }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: invite.email },
      include: { memberships: true },
    });

    if (existingUser) {
      // Case 1: User exists and already has a membership -> reject 403
      if (existingUser.memberships.length > 0) {
        return NextResponse.json(
          { error: 'This account already belongs to an academy. Multi-academy access is not yet supported.' },
          { status: 403 },
        );
      }

      // Case 2: User exists and has no membership -> require authenticated session for that email
      let sessionUser;
      try {
        sessionUser = await verifyRequestAuth(request);
      } catch {
        return NextResponse.json(
          { error: 'Must be signed in as the invited user to accept this invitation.' },
          { status: 403 },
        );
      }

      if (!sessionUser.email || sessionUser.email.toLowerCase() !== invite.email.toLowerCase()) {
        return NextResponse.json(
          { error: 'Must be signed in as the invited user to accept this invitation.' },
          { status: 403 },
        );
      }

      // Existing user acceptance: create membership & consume invite (zero credential modification)
      await prisma.$transaction(async (tx) => {
        await tx.membership.create({
          data: {
            userId: sessionUser.uid,
            academyId: invite.academyId,
            role: invite.role,
          },
        });
        await tx.invite.update({
          where: { id: invite.id },
          data: { acceptedAt: new Date() },
        });
      });

      return NextResponse.json({
        success: true,
        user: { id: sessionUser.uid, email: invite.email },
        academyId: invite.academyId,
        role: String(invite.role).toLowerCase(),
      });
    }

    // Case 3: New User -> require password, create user via Better Auth inside internalInviteScope
    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long.' },
        { status: 400 },
      );
    }

    let createdAuth;
    try {
      createdAuth = await internalInviteScope.run(true, async () => {
        return await auth.api.signUpEmail({
          body: {
            email: invite.email,
            password,
            name: displayName?.trim() || invite.email,
          },
        });
      });
    } catch (err: unknown) {
      console.error('Error creating user credential during invite accept:', err);
      return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 });
    }

    if (!createdAuth?.user?.id) {
      return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 });
    }

    const userId = createdAuth.user.id;

    await prisma.$transaction(async (tx) => {
      await tx.membership.create({
        data: {
          userId,
          academyId: invite.academyId,
          role: invite.role,
        },
      });
      await tx.invite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });
    });

    return NextResponse.json({
      success: true,
      user: { id: userId, email: invite.email },
      academyId: invite.academyId,
      role: String(invite.role).toLowerCase(),
    });
  } catch (err) {
    console.error('Error accepting invite:', err);
    return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 });
  }
}
