import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth/betterAuth';
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
      select: { id: true, email: true },
    });

    if (existingUser) {
      // Case 1: User already has a membership in the TARGET academy → reject
      const existingMembership = await prisma.membership.findUnique({
        where: {
          userId_academyId: {
            userId: existingUser.id,
            academyId: invite.academyId,
          },
        },
      });

      if (existingMembership) {
        return NextResponse.json(
          { error: 'This account is already a member of this academy.' },
          { status: 409 },
        );
      }

      // Case 2: User exists but not in this academy → require authenticated session
      // Use session-only auth (not verifyRequestAuth) to avoid the 409 that
      // multi-membership users would get without an X-Academy-Id header.
      let sessionUserId: string | undefined;
      try {
        const session = await auth.api.getSession({ headers: request.headers });
        if (session?.user?.id) {
          sessionUserId = session.user.id;
        }
      } catch {
        // Session resolution failed
      }

      if (!sessionUserId || sessionUserId !== existingUser.id) {
        return NextResponse.json(
          { error: 'Must be signed in as the invited user to accept this invitation.' },
          { status: 403 },
        );
      }

      // Existing user acceptance: create membership & consume invite (zero credential modification)
      await prisma.$transaction(async (tx) => {
        await tx.membership.create({
          data: {
            userId: sessionUserId,
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
        user: { id: sessionUserId, email: invite.email },
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

    try {
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
    } catch (err) {
      console.error(`Error in post-signup transaction for user ${userId}. Rolling back user creation.`, err);
      try {
        await prisma.user.delete({ where: { id: userId } });
      } catch (cleanupErr) {
        console.error(`FAILED to roll back (delete) user ${userId}. Manual intervention required.`, cleanupErr);
      }
      return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 });
    }

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
