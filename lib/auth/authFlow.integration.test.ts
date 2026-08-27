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

  // --- Phase K: Multi-membership integration tests (Cases 7–10) ---

  const multiMemEmail = `c2_multi_${suffix}@example.com`;
  let multiMemUserId: string;
  let academyBId: string;
  let multiMemCookieHeader: string;

  it('Case 7: Multi-membership user with X-Academy-Id header for Academy A resolves coach role', async () => {
    // Create second academy
    const academyB = await prisma.academy.create({
      data: {
        name: `C2 Academy B ${suffix}`,
        slug: `c2_slug_b_${suffix}`,
        isActive: true,
      },
    });
    academyBId = academyB.id;

    // Create multi-membership user
    const createdMulti = await internalInviteScope.run(true, async () => {
      return await auth.api.signUpEmail({
        body: {
          email: multiMemEmail,
          password,
          name: 'Multi Membership User',
        },
      });
    });
    multiMemUserId = createdMulti.user.id;

    // Create membership as COACH in Academy A
    await prisma.membership.create({
      data: {
        userId: multiMemUserId,
        academyId,
        role: 'COACH',
      },
    });

    // Create membership as PARENT in Academy B
    await prisma.membership.create({
      data: {
        userId: multiMemUserId,
        academyId: academyBId,
        role: 'PARENT',
      },
    });

    // Sign in to get session
    const signIn = await auth.api.signInEmail({
      body: { email: multiMemEmail, password },
      returnHeaders: true,
    });
    const setCookie = signIn.headers.get('set-cookie');
    multiMemCookieHeader = setCookie!.split(';')[0];

    // Request with X-Academy-Id = Academy A → should resolve as coach
    const req = new Request('http://localhost:3000/api/test', {
      headers: {
        cookie: multiMemCookieHeader,
        'x-academy-id': academyId,
      },
    });

    const authUser = await verifyRequestAuth(req);
    expect(authUser.uid).toBe(multiMemUserId);
    expect(authUser.role).toBe('coach');
    expect(authUser.academyId).toBe(academyId);
  });

  it('Case 8: Multi-membership user with X-Academy-Id header for Academy B resolves parent role', async () => {
    // Request with X-Academy-Id = Academy B → should resolve as parent
    const req = new Request('http://localhost:3000/api/test', {
      headers: {
        cookie: multiMemCookieHeader,
        'x-academy-id': academyBId,
      },
    });

    const authUser = await verifyRequestAuth(req);
    expect(authUser.uid).toBe(multiMemUserId);
    expect(authUser.role).toBe('parent');
    expect(authUser.academyId).toBe(academyBId);
  });

  it('Case 9: Multi-membership user without X-Academy-Id header gets 409 with academy list', async () => {
    const req = new Request('http://localhost:3000/api/test', {
      headers: {
        cookie: multiMemCookieHeader,
      },
    });

    try {
      await verifyRequestAuth(req);
      expect.unreachable('Should have thrown AuthError(409)');
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      const authErr = err as AuthError & { academies?: Array<{ id: string; name: string; role: string }> };
      expect(authErr.statusCode).toBe(409);
      expect(authErr.academies).toBeDefined();
      expect(authErr.academies).toHaveLength(2);

      // Verify both academies are in the list with correct roles
      const academyA = authErr.academies!.find((a) => a.id === academyId);
      const academyB = authErr.academies!.find((a) => a.id === academyBId);
      expect(academyA).toBeDefined();
      expect(academyA!.role).toBe('coach');
      expect(academyB).toBeDefined();
      expect(academyB!.role).toBe('parent');
    }
  });

  it('Case 10: Multi-membership user with X-Academy-Id for non-member academy gets 403', async () => {
    const req = new Request('http://localhost:3000/api/test', {
      headers: {
        cookie: multiMemCookieHeader,
        'x-academy-id': 'nonexistent_academy_id_xyz',
      },
    });

    try {
      await verifyRequestAuth(req);
      expect.unreachable('Should have thrown AuthError(403)');
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      const authErr = err as AuthError;
      expect(authErr.statusCode).toBe(403);
      expect(authErr.message).toContain('Not a member of the requested academy');
    }
  });

  it('Case 11: Admin of Academy A creating athlete for parent whose only membership is in Academy B -> 400', async () => {
    const { POST: createAthlete } = await import('@/app/api/athletes/route');
    const { NextRequest } = await import('next/server');

    const adminAEmail = `admin_a_${Date.now()}@example.com`;
    const adminA = await internalInviteScope.run(true, async () => {
      return await auth.api.signUpEmail({ body: { email: adminAEmail, password, name: 'Admin A' }});
    });
    await prisma.membership.create({
      data: { userId: adminA.user.id, academyId: academyId, role: 'ADMIN' }
    });
    const signInA = await auth.api.signInEmail({ body: { email: adminAEmail, password }, returnHeaders: true });
    const adminACookie = signInA.headers.get('set-cookie')!.split(';')[0];

    const parentBEmail = `parent_b_${Date.now()}@example.com`;
    const parentB = await internalInviteScope.run(true, async () => {
      return await auth.api.signUpEmail({ body: { email: parentBEmail, password, name: 'Parent B' }});
    });
    await prisma.membership.create({
      data: { userId: parentB.user.id, academyId: academyBId, role: 'PARENT' }
    });

    const athleteCountBefore = await prisma.athlete.count();

    const req = new NextRequest('http://localhost:3000/api/athletes', {
      method: 'POST',
      headers: { cookie: adminACookie, 'x-academy-id': academyId },
      body: JSON.stringify({
        name: 'Test Athlete',
        parentUserId: parentB.user.id,
        parentEmail: 'fake@example.com'
      })
    });

    const response = await createAthlete(req);
    expect(response.status).toBe(400);

    const athleteCountAfter = await prisma.athlete.count();
    expect(athleteCountAfter).toBe(athleteCountBefore);
  });

  it('Case 12: Admin of Academy A creating athlete for parent who IS a member of Academy A -> 201', async () => {
    const { POST: createAthlete } = await import('@/app/api/athletes/route');
    const { NextRequest } = await import('next/server');

    const parentAEmail = `parent_a_${Date.now()}@example.com`;
    const parentA = await internalInviteScope.run(true, async () => {
      return await auth.api.signUpEmail({ body: { email: parentAEmail, password, name: 'Parent A' }});
    });
    await prisma.membership.create({
      data: { userId: parentA.user.id, academyId: academyId, role: 'PARENT' }
    });

    const adminAUser = await prisma.user.findFirst({ where: { memberships: { some: { role: 'ADMIN', academyId } } } });
    const signInA = await auth.api.signInEmail({ body: { email: adminAUser!.email, password }, returnHeaders: true });
    const adminACookie = signInA.headers.get('set-cookie')!.split(';')[0];

    const req = new NextRequest('http://localhost:3000/api/athletes', {
      method: 'POST',
      headers: { cookie: adminACookie, 'x-academy-id': academyId },
      body: JSON.stringify({
        name: 'Valid Athlete',
        parentUserId: parentA.user.id,
        parentEmail: 'fake@example.com'
      })
    });

    const response = await createAthlete(req);
    expect(response.status).toBe(201);

    const data = await response.json();
    expect(data.athlete.parentEmail).toBe(parentAEmail);
  });

  it('Case 13: Admin of Academy A creating invoice for parent whose only membership is in Academy B -> 400', async () => {
    const { POST: createInvoice } = await import('@/app/api/invoices/route');
    const { NextRequest } = await import('next/server');

    const parentB = await prisma.user.findFirst({ where: { memberships: { some: { role: 'PARENT', academyId: academyBId }, none: { academyId } } } });
    const adminAUser = await prisma.user.findFirst({ where: { memberships: { some: { role: 'ADMIN', academyId } } } });
    const signInA = await auth.api.signInEmail({ body: { email: adminAUser!.email, password }, returnHeaders: true });
    const adminACookie = signInA.headers.get('set-cookie')!.split(';')[0];

    const invoiceCountBefore = await prisma.invoice.count();

    process.env.BILLING_ENABLED = 'true';
    const req = new NextRequest('http://localhost:3000/api/invoices', {
      method: 'POST',
      headers: { cookie: adminACookie, 'x-academy-id': academyId },
      body: JSON.stringify({
        amount: 100,
        currency: 'USD',
        dueDate: new Date().toISOString(),
        description: 'Test Invoice',
        status: 'OPEN',
        parentUserId: parentB!.id,
        parentName: 'Test Parent B',
        parentEmail: 'parentb@example.com',
        subtotal: 100,
        netTotal: 100,
        paymentSchedule: 'monthly',
        children: [],
        installmentBreakdown: [],
      })
    });

    const response = await createInvoice(req);
    expect(response.status).toBe(400);

    const invoiceCountAfter = await prisma.invoice.count();
    expect(invoiceCountAfter).toBe(invoiceCountBefore);
    delete process.env.BILLING_ENABLED;
  });

  it('Case 14: Admin of Academy A creating invoice for parent who IS a member of Academy A -> 201', async () => {
    const { POST: createInvoice } = await import('@/app/api/invoices/route');
    const { NextRequest } = await import('next/server');

    const parentA = await prisma.user.findFirst({ where: { memberships: { some: { role: 'PARENT', academyId } } } });
    const adminAUser = await prisma.user.findFirst({ where: { memberships: { some: { role: 'ADMIN', academyId } } } });
    const signInA = await auth.api.signInEmail({ body: { email: adminAUser!.email, password }, returnHeaders: true });
    const adminACookie = signInA.headers.get('set-cookie')!.split(';')[0];

    process.env.BILLING_ENABLED = 'true';
    const req = new NextRequest('http://localhost:3000/api/invoices', {
      method: 'POST',
      headers: { cookie: adminACookie, 'x-academy-id': academyId },
      body: JSON.stringify({
        amount: 100,
        currency: 'USD',
        dueDate: new Date().toISOString(),
        description: 'Test Invoice',
        status: 'OPEN',
        parentUserId: parentA!.id,
        parentName: 'Test Parent A',
        parentEmail: 'parenta@example.com',
        subtotal: 100,
        netTotal: 100,
        paymentSchedule: 'monthly',
        children: [],
        installmentBreakdown: [],
      })
    });

    const response = await createInvoice(req);
    expect(response.status).toBe(201);
    delete process.env.BILLING_ENABLED;
  });

  it('Case 15: Invite acceptance transaction failure cleans up orphaned user', async () => {
    const { POST: acceptInvite } = await import('@/app/api/invites/accept/route');
    const { NextRequest } = await import('next/server');
    const { vi } = await import('vitest');
    const { generateInviteToken } = await import('@/lib/auth/inviteToken');

    const adminAUser = await prisma.user.findFirst({ where: { memberships: { some: { role: 'ADMIN', academyId } } } });
    
    const inviteEmail = `invite_failure_${Date.now()}@example.com`;
    const { rawToken, tokenHash } = generateInviteToken();

    const invite = await prisma.invite.create({
      data: {
        email: inviteEmail,
        academyId,
        role: 'PARENT',
        tokenHash: tokenHash,
        expiresAt: new Date(Date.now() + 1000000),
        invitedByUserId: adminAUser!.id,
      }
    });

    const originalTransaction = prisma.$transaction;
    prisma.$transaction = vi.fn().mockRejectedValue(new Error('Simulated transaction failure'));

    const req = new NextRequest('http://localhost:3000/api/invites/accept', {
      method: 'POST',
      body: JSON.stringify({
        token: rawToken,
        password: 'ValidPassword123!',
        displayName: 'Test User'
      })
    });

    const response = await acceptInvite(req);
    expect(response.status).toBe(500);

    prisma.$transaction = originalTransaction;

    const user = await prisma.user.findUnique({ where: { email: inviteEmail } });
    expect(user).toBeNull();
  });

  afterAll(async () => {
    const allEmails = [testEmail, noMemEmail, multiMemEmail];
    await prisma.session.deleteMany({
      where: { user: { email: { in: allEmails } } },
    });
    await prisma.account.deleteMany({
      where: { user: { email: { in: allEmails } } },
    });
    await prisma.membership.deleteMany({
      where: { user: { email: { in: allEmails } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: allEmails } },
    });
    const academyIds = [academyId, academyBId].filter(Boolean);
    if (academyIds.length > 0) {
      await prisma.academy.deleteMany({
        where: { id: { in: academyIds } },
      });
    }
    await prisma.$disconnect();
  });
});

