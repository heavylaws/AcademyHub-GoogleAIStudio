import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import { auth } from './betterAuth';
import { internalInviteScope } from './internalInviteScope';
import { verifyRequestAuth } from './verifyRequestAuth';
import { requireRole } from './requireRole';
import { AuthError } from './types';

/**
 * End-to-end integration test against real Postgres.
 * MOCKS NOTHING — exercises Better Auth, Prisma adapter, session persistence,
 * closed public sign-up, and verifyRequestAuth session resolution.
 */
describe('Auth flow end-to-end integration against live Postgres', () => {
  const suffix = Date.now().toString();
  const testEmail = `c2_user_${suffix}@example.com`;
  const password = 'TestPassword123!';
  const noMemEmail = `c2_nomem_${suffix}@example.com`;

  let createdUserId: string;
  let academyId: string;
  let validSessionToken: string;

  it('Case 1: Account creation through Better Auth persists User AND linked Account rows', async () => {
    const created = await internalInviteScope.run(true, async () => {
      return await auth.api.signUpEmail({
        body: {
          email: testEmail,
          password,
          name: 'C2 Integration User',
        },
      });
    });

    expect(created?.user?.id).toBeDefined();
    createdUserId = created.user.id;

    // Assert User row persisted in Postgres
    const userRow = await prisma.user.findUnique({
      where: { email: testEmail },
    });
    expect(userRow).not.toBeNull();
    expect(userRow?.id).toBe(createdUserId);

    // REGRESSION DETECTOR ASSERTION: Assert linked Account row with credential provider exists in Postgres.
    // If the Account model is removed from schema.prisma, prisma.account is undefined and this line fails!
    const accountRow = await prisma.account.findFirst({
      where: { userId: createdUserId },
    });
    expect(accountRow).not.toBeNull();
    expect(accountRow?.providerId).toBe('credential');
  });

  let sessionCookieHeader: string;

  it('Case 2: Sign-in returns a usable session and persists Session row in Postgres', async () => {
    const signInRes = await auth.api.signInEmail({
      body: {
        email: testEmail,
        password,
      },
      returnHeaders: true,
    });

    const setCookie = signInRes.headers.get('set-cookie');
    expect(setCookie).toBeDefined();
    sessionCookieHeader = setCookie!.split(';')[0]; // "better-auth.session_token=token.signature"

    expect(signInRes.response.token).toBeDefined();
    validSessionToken = signInRes.response.token;

    // REGRESSION DETECTOR ASSERTION: Assert Session row persisted in Postgres.
    // If the Session model is removed from schema.prisma, prisma.session is undefined and this line fails!
    const sessionRow = await prisma.session.findFirst({
      where: { userId: createdUserId },
    });
    expect(sessionRow).not.toBeNull();
    expect(sessionRow?.token).toBeDefined();
    expect(sessionRow?.userId).toBe(createdUserId);
  });

  it('Case 3: Session cookie authenticates a request and resolves uid, role, and academyId', async () => {
    // Create Academy and Membership for the user
    const academy = await prisma.academy.create({
      data: {
        name: `C2 Academy ${suffix}`,
        slug: `c2_slug_${suffix}`,
        isActive: true,
      },
    });
    academyId = academy.id;

    await prisma.membership.create({
      data: {
        userId: createdUserId,
        academyId,
        role: 'COACH',
      },
    });

    const req = new Request('http://localhost:3000/api/assessments', {
      headers: {
        cookie: sessionCookieHeader,
      },
    });

    const authUser = await verifyRequestAuth(req);
    expect(authUser.uid).toBe(createdUserId);
    expect(authUser.email).toBe(testEmail);
    expect(authUser.role).toBe('coach');
    expect(authUser.academyId).toBe(academyId);
  });

  it('Case 4: Wrong password is rejected and creates no new Session row', async () => {
    const sessionsBefore = await prisma.session.count({
      where: { userId: createdUserId },
    });

    await expect(
      auth.api.signInEmail({
        body: {
          email: testEmail,
          password: 'WrongPassword999!',
        },
      }),
    ).rejects.toThrow();

    const sessionsAfter = await prisma.session.count({
      where: { userId: createdUserId },
    });

    expect(sessionsAfter).toBe(sessionsBefore);
  });

  it('Case 5: Public sign-up outside internalInviteScope is closed and rejected', async () => {
    const closedEmail = `closed_signup_${suffix}@example.com`;

    await expect(
      auth.api.signUpEmail({
        body: {
          email: closedEmail,
          password,
          name: 'Closed Sign Up User',
        },
      }),
    ).rejects.toThrow(/Public sign-up is disabled/);

    const userRow = await prisma.user.findUnique({
      where: { email: closedEmail },
    });
    expect(userRow).toBeNull();
  });

  it('Case 6: User with no membership authenticates with undefined role/academyId and fails requireRole', async () => {
    await internalInviteScope.run(true, async () => {
      return await auth.api.signUpEmail({
        body: {
          email: noMemEmail,
          password,
          name: 'No Membership User',
        },
      });
    });

    const noMemSignIn = await auth.api.signInEmail({
      body: {
        email: noMemEmail,
        password,
      },
      returnHeaders: true,
    });

    const noMemSetCookie = noMemSignIn.headers.get('set-cookie');
    const noMemCookieHeader = noMemSetCookie!.split(';')[0];

    const req = new Request('http://localhost:3000/api/athletes', {
      headers: {
        cookie: noMemCookieHeader,
      },
    });

    const authUser = await verifyRequestAuth(req);
    expect(authUser.uid).toBe(noMemSignIn.response.user.id);
    expect(authUser.role).toBeUndefined();
    expect(authUser.academyId).toBeUndefined();

    expect(() => requireRole(authUser, ['admin', 'coach', 'parent'])).toThrow(AuthError);
  });

  afterAll(async () => {
    await prisma.session.deleteMany({
      where: { user: { email: { in: [testEmail, noMemEmail] } } },
    });
    await prisma.account.deleteMany({
      where: { user: { email: { in: [testEmail, noMemEmail] } } },
    });
    await prisma.membership.deleteMany({
      where: { user: { email: { in: [testEmail, noMemEmail] } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [testEmail, noMemEmail] } },
    });
    if (academyId) {
      await prisma.academy.deleteMany({
        where: { id: academyId },
      });
    }
    await prisma.$disconnect();
  });
});
