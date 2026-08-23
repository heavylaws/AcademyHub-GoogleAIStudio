import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { AuthError } from '@/lib/auth/types';

const mockVerifyRequestAuth = vi.fn();
const mockRequireRole = vi.fn();
const mockInviteFindMany = vi.fn();
const mockInviteCreate = vi.fn();
const mockInviteUpdateMany = vi.fn();
const mockMembershipFindFirst = vi.fn();

vi.mock('@/lib/auth/verifyRequestAuth', () => ({
  verifyRequestAuth: (req: Request) => mockVerifyRequestAuth(req),
}));

vi.mock('@/lib/auth/requireRole', () => ({
  requireRole: (user: unknown, roles: unknown) => mockRequireRole(user, roles),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    invite: {
      findMany: (args: unknown) => mockInviteFindMany(args),
      create: (args: unknown) => mockInviteCreate(args),
      updateMany: (args: unknown) => mockInviteUpdateMany(args),
    },
    membership: {
      findFirst: (args: unknown) => mockMembershipFindFirst(args),
    },
  },
}));

describe('/api/invites collection routes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects attempt to invite an ADMIN role with 400', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'admin_1', role: 'admin', academyId: 'acad_1' });

    const req = new NextRequest('http://localhost/api/invites', {
      method: 'POST',
      body: JSON.stringify({ email: 'newadmin@example.com', role: 'admin' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/coaches and parents/i);
    expect(mockInviteCreate).not.toHaveBeenCalled();
  });

  it('allows academy admin to invite a coach into their own academy', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'admin_1', role: 'admin', academyId: 'acad_1' });
    mockMembershipFindFirst.mockResolvedValueOnce(null);
    mockInviteCreate.mockResolvedValueOnce({
      id: 'inv_1',
      email: 'coach@example.com',
      academyId: 'acad_1',
      role: 'COACH',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const req = new NextRequest('http://localhost/api/invites', {
      method: 'POST',
      body: JSON.stringify({ email: 'coach@example.com', role: 'coach' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.invite.acceptUrl).toMatch(/\/invite\//);
    expect(mockInviteCreate).toHaveBeenCalledOnce();
  });
});
