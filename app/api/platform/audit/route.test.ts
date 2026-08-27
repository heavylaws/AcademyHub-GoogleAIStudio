import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { AuthError } from '@/lib/auth/types';

const mockRequirePlatformAdmin = vi.fn();
const mockAuditLogFindMany = vi.fn();

vi.mock('@/lib/auth/requirePlatformAdmin', () => ({
  requirePlatformAdmin: (req: Request) => mockRequirePlatformAdmin(req),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    auditLog: {
      findMany: (args: unknown) => mockAuditLogFindMany(args),
    },
  },
}));

describe('GET /api/platform/audit (Platform Admin Global Audit Log)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('4. Non-platform-admin calls GET /api/platform/audit -> 403', async () => {
    mockRequirePlatformAdmin.mockImplementationOnce(() => {
      throw new AuthError('Forbidden: Platform admin access required', 403);
    });

    const req = new NextRequest('http://localhost/api/platform/audit');
    const res = await GET(req);

    expect(res.status).toBe(403);
    expect(mockAuditLogFindMany).not.toHaveBeenCalled();
  });

  it('Platform admin can fetch audit logs across all academies with optional filters', async () => {
    mockRequirePlatformAdmin.mockResolvedValueOnce({
      uid: 'sysadmin_1',
      email: 'sys@example.com',
      claims: { isPlatformAdmin: true },
    });

    const fakeRows = [
      { id: 'log_1', academyId: 'acad_a', action: 'ACADEMY_CREATED', createdAt: new Date() },
      { id: 'log_2', academyId: 'acad_b', action: 'ROLE_CHANGED', createdAt: new Date() },
    ];
    mockAuditLogFindMany.mockResolvedValueOnce(fakeRows);

    const req = new NextRequest('http://localhost/api/platform/audit?academyId=acad_a&action=ACADEMY_CREATED');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.auditLogs).toHaveLength(2);

    expect(mockAuditLogFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          academyId: 'acad_a',
          action: 'ACADEMY_CREATED',
        },
      })
    );
  });

  it('Pagination returns at most 50 rows and a working cursor for platform audit', async () => {
    mockRequirePlatformAdmin.mockResolvedValueOnce({
      uid: 'sysadmin_1',
      email: 'sys@example.com',
      claims: { isPlatformAdmin: true },
    });

    const page1Rows = Array.from({ length: 51 }, (_, i) => ({
      id: `plog_${i + 1}`,
      academyId: i % 2 === 0 ? 'acad_a' : 'acad_b',
      action: 'ROLE_CHANGED',
      createdAt: new Date(),
    }));
    const page2Rows = [
      {
        id: 'plog_51',
        academyId: 'acad_a',
        action: 'ROLE_CHANGED',
        createdAt: new Date(),
      },
    ];

    mockAuditLogFindMany.mockResolvedValueOnce(page1Rows);

    const req = new NextRequest('http://localhost/api/platform/audit');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.auditLogs).toHaveLength(50);
    expect(body.nextCursor).toBe('plog_51');

    // Page 2
    mockRequirePlatformAdmin.mockResolvedValueOnce({
      uid: 'sysadmin_1',
      email: 'sys@example.com',
      claims: { isPlatformAdmin: true },
    });

    mockAuditLogFindMany.mockResolvedValueOnce(page2Rows);

    const req2 = new NextRequest(`http://localhost/api/platform/audit?cursor=${body.nextCursor}`);
    const res2 = await GET(req2);

    expect(res2.status).toBe(200);
    const body2 = await res2.json();

    expect(body2.auditLogs).toHaveLength(1);
    expect(body2.nextCursor).toBeNull();
    expect(mockAuditLogFindMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        cursor: { id: 'plog_51' },
        skip: 1,
        take: 51,
      })
    );
  });
});
