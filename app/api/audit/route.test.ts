import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { AuthError } from '@/lib/auth/types';

const mockVerifyRequestAuth = vi.fn();
const mockRequireRole = vi.fn();
const mockAuditLogFindMany = vi.fn();

vi.mock('@/lib/auth/verifyRequestAuth', () => ({
  verifyRequestAuth: (req: Request) => mockVerifyRequestAuth(req),
}));

vi.mock('@/lib/auth/requireRole', () => ({
  requireRole: (user: unknown, roles: unknown) => mockRequireRole(user, roles),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    auditLog: {
      findMany: (args: unknown) => mockAuditLogFindMany(args),
    },
  },
}));

describe('GET /api/audit (Academy Admin Scoped Audit Log)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Academy admin of Academy A receives only rows with academyId = A and no Academy B row appears', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({
      uid: 'admin_a',
      role: 'admin',
      academyId: 'acad_a',
    });
    mockRequireRole.mockReturnValueOnce(undefined);

    const rows = [
      { id: 'log_1', academyId: 'acad_a', action: 'ROLE_CHANGED', createdAt: new Date() },
      { id: 'log_2', academyId: 'acad_a', action: 'INVITE_CREATED', createdAt: new Date() },
    ];
    mockAuditLogFindMany.mockResolvedValueOnce(rows);

    const req = new NextRequest('http://localhost/api/audit');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.auditLogs).toHaveLength(2);
    expect(body.auditLogs.every((row: any) => row.academyId === 'acad_a')).toBe(true);
    expect(body.auditLogs.some((row: any) => row.academyId === 'acad_b')).toBe(false);

    expect(mockAuditLogFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { academyId: 'acad_a' },
      })
    );
  });

  it('2. Academy admin of Academy A calls GET /api/audit?academyId=acad_b -> param is ignored and only Academy A rows return', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({
      uid: 'admin_a',
      role: 'admin',
      academyId: 'acad_a',
    });
    mockRequireRole.mockReturnValueOnce(undefined);

    mockAuditLogFindMany.mockResolvedValueOnce([
      { id: 'log_1', academyId: 'acad_a', action: 'ROLE_CHANGED', createdAt: new Date() },
    ]);

    const req = new NextRequest('http://localhost/api/audit?academyId=acad_b');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.auditLogs).toHaveLength(1);
    expect(body.auditLogs[0].academyId).toBe('acad_a');

    // Confirm prisma query passed academyId: 'acad_a', not 'acad_b'
    expect(mockAuditLogFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ academyId: 'acad_a' }),
      })
    );
    expect(mockAuditLogFindMany).not.toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ academyId: 'acad_b' }),
      })
    );
  });

  it('3. Non-admin (coach, parent) calls GET /api/audit -> 403', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({
      uid: 'coach_1',
      role: 'coach',
      academyId: 'acad_a',
    });
    mockRequireRole.mockImplementationOnce(() => {
      throw new AuthError('Forbidden: Insufficient role permissions', 403);
    });

    const req = new NextRequest('http://localhost/api/audit');
    const res = await GET(req);

    expect(res.status).toBe(403);
    expect(mockAuditLogFindMany).not.toHaveBeenCalled();
  });

  it('5. Pagination returns at most 50 rows and a working cursor', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({
      uid: 'admin_a',
      role: 'admin',
      academyId: 'acad_a',
    });
    mockRequireRole.mockReturnValueOnce(undefined);

    // Generate 51 rows to simulate > 50 results
    const page1Rows = Array.from({ length: 51 }, (_, i) => ({
      id: `log_${i + 1}`,
      academyId: 'acad_a',
      action: 'ROLE_CHANGED',
      createdAt: new Date(),
    }));
    const page2Rows = [
      {
        id: 'log_51',
        academyId: 'acad_a',
        action: 'ROLE_CHANGED',
        createdAt: new Date(),
      },
    ];

    mockAuditLogFindMany.mockResolvedValueOnce(page1Rows);

    const req = new NextRequest('http://localhost/api/audit');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();

    // Max 50 items returned
    expect(body.auditLogs).toHaveLength(50);
    // Cursor for 51st item returned as nextCursor
    expect(body.nextCursor).toBe('log_51');

    // Page 2 request using cursor
    mockVerifyRequestAuth.mockResolvedValueOnce({
      uid: 'admin_a',
      role: 'admin',
      academyId: 'acad_a',
    });
    mockRequireRole.mockReturnValueOnce(undefined);

    mockAuditLogFindMany.mockResolvedValueOnce(page2Rows);

    const req2 = new NextRequest(`http://localhost/api/audit?cursor=${body.nextCursor}`);
    const res2 = await GET(req2);

    expect(res2.status).toBe(200);
    const body2 = await res2.json();

    expect(body2.auditLogs).toHaveLength(1);
    expect(body2.nextCursor).toBeNull();


    expect(mockAuditLogFindMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        cursor: { id: 'log_51' },
        skip: 1,
        take: 51,
      })
    );
  });
});
