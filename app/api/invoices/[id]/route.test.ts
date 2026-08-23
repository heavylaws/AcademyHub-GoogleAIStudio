import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH } from './route';
import { AuthError } from '@/lib/auth/types';

const mockVerifyRequestAuth = vi.fn();
const mockRequireOwnership = vi.fn();
const mockRequireRole = vi.fn();
const mockGetInvoiceByIdAdmin = vi.fn();
const mockUpdateInvoiceAdmin = vi.fn();

vi.mock('@/lib/auth/verifyRequestAuth', () => ({
  verifyRequestAuth: (request: Request) => mockVerifyRequestAuth(request),
}));
vi.mock('@/lib/auth/requireOwnership', () => ({
  requireOwnership: (user: unknown, type: string, id: string) => mockRequireOwnership(user, type, id),
}));
vi.mock('@/lib/auth/requireRole', () => ({
  requireRole: (user: unknown, roles: unknown) => mockRequireRole(user, roles),
}));
vi.mock('@/services/billingAdminService', () => ({
  getInvoiceByIdAdmin: (id: string) => mockGetInvoiceByIdAdmin(id),
  updateInvoiceAdmin: (id: string, updates: unknown) => mockUpdateInvoiceAdmin(id, updates),
}));

describe('/api/invoices/[id] routes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('checks ownership before returning a single invoice', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'parent_1', role: 'parent' });
    mockRequireOwnership.mockRejectedValueOnce(new AuthError('Forbidden: You do not own this resource', 403));

    const response = await GET(
      new NextRequest('http://localhost/api/invoices/invoice_2'),
      { params: Promise.resolve({ id: 'invoice_2' }) }
    );

    expect(response.status).toBe(403);
    expect(mockRequireOwnership).toHaveBeenCalledWith(
      { uid: 'parent_1', role: 'parent' },
      'invoice',
      'invoice_2'
    );
    expect(mockGetInvoiceByIdAdmin).not.toHaveBeenCalled();
  });

  it('returns an owned invoice after the ownership check succeeds', async () => {
    const invoice = { id: 'invoice_1' };
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'parent_1', role: 'parent' });
    mockGetInvoiceByIdAdmin.mockResolvedValueOnce(invoice);

    const response = await GET(
      new NextRequest('http://localhost/api/invoices/invoice_1'),
      { params: Promise.resolve({ id: 'invoice_1' }) }
    );

    expect(response.status).toBe(200);
    expect((await response.json()).invoice).toEqual(invoice);
  });

  it('requires admin role for updates', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'coach_1', role: 'coach' });
    mockRequireRole.mockImplementationOnce(() => {
      throw new AuthError('Forbidden: Insufficient role permissions', 403);
    });

    const response = await PATCH(
      new NextRequest('http://localhost/api/invoices/invoice_1', {
        method: 'PATCH',
        body: JSON.stringify({ payment_status: 'paid' }),
      }),
      { params: Promise.resolve({ id: 'invoice_1' }) }
    );

    expect(response.status).toBe(403);
    expect(mockUpdateInvoiceAdmin).not.toHaveBeenCalled();
  });

  it('checks tenant ownership before allowing PATCH update', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'admin_1', role: 'admin', academyId: 'acad_1' });
    mockRequireOwnership.mockRejectedValueOnce(new AuthError('Resource not found', 404));

    const response = await PATCH(
      new NextRequest('http://localhost/api/invoices/invoice_1', {
        method: 'PATCH',
        body: JSON.stringify({ payment_status: 'paid' }),
      }),
      { params: Promise.resolve({ id: 'invoice_1' }) }
    );

    expect(response.status).toBe(404);
    expect(mockUpdateInvoiceAdmin).not.toHaveBeenCalled();
  });
});
