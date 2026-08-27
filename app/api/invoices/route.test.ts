import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { AuthError } from '@/lib/auth/types';

const mockVerifyRequestAuth = vi.fn();
const mockRequireRole = vi.fn();
const mockListInvoicesAdmin = vi.fn();
const mockListInvoicesForParentUser = vi.fn();
const mockCreateInvoiceAdmin = vi.fn();

vi.mock('@/lib/auth/verifyRequestAuth', () => ({
  verifyRequestAuth: (request: Request) => mockVerifyRequestAuth(request),
}));
vi.mock('@/lib/auth/requireRole', () => ({
  requireRole: (user: unknown, roles: unknown) => mockRequireRole(user, roles),
}));
vi.mock('@/services/billingAdminService', () => ({
  listInvoicesAdmin: (academyId: string) => mockListInvoicesAdmin(academyId),
  listInvoicesForParentUser: (uid: string, academyId: string) => mockListInvoicesForParentUser(uid, academyId),
  createInvoiceAdmin: (input: unknown) => mockCreateInvoiceAdmin(input),
}));
vi.mock('@/lib/auth/ensureUserRecord', () => ({ ensureUserRecord: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique: vi.fn() }, membership: { findUnique: vi.fn() } } }));

describe('/api/invoices collection routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('BILLING_ENABLED', 'true');
  });

  it('returns 503 when BILLING_ENABLED is false and request is authenticated', async () => {
    vi.stubEnv('BILLING_ENABLED', 'false');
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'admin_1', role: 'admin', academyId: 'acad_1' });

    const resGET = await GET(new NextRequest('http://localhost/api/invoices'));
    expect(resGET.status).toBe(503);
    const bodyGET = await resGET.json();
    expect(bodyGET.error).toMatch(/billing feature is currently disabled/i);

    const resPOST = await POST(new NextRequest('http://localhost/api/invoices', {
      method: 'POST',
      body: JSON.stringify({ parentName: 'Parent' }),
    }));
    expect(resPOST.status).toBe(503);
  });

  it('returns 401 unauthenticated error instead of 503 when BILLING_ENABLED is false', async () => {
    vi.stubEnv('BILLING_ENABLED', 'false');
    mockVerifyRequestAuth.mockRejectedValueOnce(new AuthError('Missing authentication session', 401));

    const response = await GET(new NextRequest('http://localhost/api/invoices'));
    expect(response.status).toBe(401);
  });

  it('returns 401 before querying when authentication fails', async () => {
    mockVerifyRequestAuth.mockRejectedValueOnce(new AuthError('Missing authentication session', 401));
    const response = await GET(new NextRequest('http://localhost/api/invoices'));
    expect(response.status).toBe(401);
    expect(mockListInvoicesAdmin).not.toHaveBeenCalled();
  });

  it('uses the parent-scoped Prisma service for parent list requests', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'parent_1', role: 'parent', academyId: 'acad_1' });
    mockListInvoicesForParentUser.mockResolvedValueOnce([]);

    const response = await GET(new NextRequest('http://localhost/api/invoices'));

    expect(response.status).toBe(200);
    expect(mockListInvoicesForParentUser).toHaveBeenCalledWith('parent_1', 'acad_1');
    expect(mockListInvoicesAdmin).not.toHaveBeenCalled();
  });

  it('denies coach access to invoice listing', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'coach_1', role: 'coach', academyId: 'acad_1' });
    mockRequireRole.mockImplementationOnce(() => {
      throw new AuthError('Forbidden: Insufficient role permissions', 403);
    });

    const response = await GET(new NextRequest('http://localhost/api/invoices'));

    expect(response.status).toBe(403);
    expect(mockListInvoicesAdmin).not.toHaveBeenCalled();
  });

  it('admin lists invoices scoped to their academy', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'admin_1', role: 'admin', academyId: 'acad_1' });
    mockListInvoicesAdmin.mockResolvedValueOnce([]);

    const response = await GET(new NextRequest('http://localhost/api/invoices'));

    expect(response.status).toBe(200);
    expect(mockListInvoicesAdmin).toHaveBeenCalledWith('acad_1');
  });

  it('fails closed with 403 if !user.academyId', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'parent_1', role: 'parent' });

    const response = await GET(new NextRequest('http://localhost/api/invoices'));

    expect(response.status).toBe(403);
  });

  it('allows only admins to create invoices', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'coach_1', role: 'coach' });
    mockRequireRole.mockImplementationOnce(() => {
      throw new AuthError('Forbidden: Insufficient role permissions', 403);
    });

    const response = await POST(new NextRequest('http://localhost/api/invoices', {
      method: 'POST',
      body: JSON.stringify({ parentName: 'Parent' }),
    }));

    expect(response.status).toBe(403);
    expect(mockCreateInvoiceAdmin).not.toHaveBeenCalled();
  });
});
