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
  listInvoicesAdmin: () => mockListInvoicesAdmin(),
  listInvoicesForParentUser: (uid: string) => mockListInvoicesForParentUser(uid),
  createInvoiceAdmin: (input: unknown) => mockCreateInvoiceAdmin(input),
}));

describe('/api/invoices collection routes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 before querying when authentication fails', async () => {
    mockVerifyRequestAuth.mockRejectedValueOnce(new AuthError('Missing Authorization header', 401));
    const response = await GET(new NextRequest('http://localhost/api/invoices'));
    expect(response.status).toBe(401);
    expect(mockListInvoicesAdmin).not.toHaveBeenCalled();
  });

  it('uses the parent-scoped Prisma service for parent list requests', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'parent_1', role: 'parent' });
    mockListInvoicesForParentUser.mockResolvedValueOnce([]);

    const response = await GET(new NextRequest('http://localhost/api/invoices'));

    expect(response.status).toBe(200);
    expect(mockListInvoicesForParentUser).toHaveBeenCalledWith('parent_1');
    expect(mockListInvoicesAdmin).not.toHaveBeenCalled();
  });

  it('lists all invoices for an authenticated coach', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'coach_1', role: 'coach' });
    mockListInvoicesAdmin.mockResolvedValueOnce([]);

    const response = await GET(new NextRequest('http://localhost/api/invoices'));

    expect(response.status).toBe(200);
    expect(mockListInvoicesAdmin).toHaveBeenCalledOnce();
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
