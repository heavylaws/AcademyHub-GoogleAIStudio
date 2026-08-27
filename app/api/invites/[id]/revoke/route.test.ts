import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';
import { writeAuditLog } from '@/lib/audit/writeAuditLog';

const mockVerifyRequestAuth = vi.fn();
const mockRequireRole = vi.fn();
const mockInviteFindFirst = vi.fn();
const mockInviteUpdate = vi.fn();
const mockWriteAuditLog = vi.fn();

vi.mock('@/lib/auth/verifyRequestAuth', () => ({
  verifyRequestAuth: (req: Request) => mockVerifyRequestAuth(req),
}));

vi.mock('@/lib/auth/requireRole', () => ({
  requireRole: (user: unknown, roles: unknown) => mockRequireRole(user, roles),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    invite: {
      findFirst: (args: unknown) => mockInviteFindFirst(args),
      update: (args: unknown) => mockInviteUpdate(args),
    },
  },
}));

vi.mock('@/lib/audit/writeAuditLog', () => ({
  writeAuditLog: (...args: unknown[]) => mockWriteAuditLog(...args),
}));

describe('/api/invites/[id]/revoke', () => {
  beforeEach(() => vi.clearAllMocks());

  it('writes exactly one AuditLog row on successful revoke', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'admin_1', role: 'admin', academyId: 'acad_1' });
    mockRequireRole.mockReturnValueOnce(undefined);
    mockInviteFindFirst.mockResolvedValueOnce({ id: 'inv_1', academyId: 'acad_1' });
    mockInviteUpdate.mockResolvedValueOnce({ id: 'inv_1', email: 'test@example.com', role: 'COACH', revokedAt: new Date() });

    const res = await POST(new Request('http://localhost/api/invites/inv_1/revoke', { method: 'POST' }), {
      params: Promise.resolve({ id: 'inv_1' }),
    });

    expect(res.status).toBe(200);
    expect(mockWriteAuditLog).toHaveBeenCalledTimes(1);
    expect(mockWriteAuditLog).toHaveBeenCalledWith({
      academyId: 'acad_1',
      actorUserId: 'admin_1',
      action: 'INVITE_REVOKED',
      targetType: 'Invite',
      targetId: 'inv_1',
    });
  });
});
