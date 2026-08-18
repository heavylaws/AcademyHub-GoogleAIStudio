import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { AuthError } from '@/lib/auth/types';

const mockVerifyRequestAuth = vi.fn();
const mockRequireRole = vi.fn();
const mockGetInvoiceByIdAdmin = vi.fn();
const mockStripeCheckoutCreate = vi.fn();

vi.mock('@/lib/auth/verifyRequestAuth', () => ({
  verifyRequestAuth: (req: any) => mockVerifyRequestAuth(req),
}));

vi.mock('@/lib/auth/requireRole', () => ({
  requireRole: (user: any, allowedRoles: any) => mockRequireRole(user, allowedRoles),
}));

vi.mock('@/services/billingAdminService', () => ({
  getInvoiceByIdAdmin: (id: string) => mockGetInvoiceByIdAdmin(id),
}));

vi.mock('stripe', () => {
  return {
    default: class {
      checkout = {
        sessions: {
          create: mockStripeCheckoutCreate,
        },
      };
    },
  };
});

describe('POST /api/stripe/create-checkout-session', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, STRIPE_SECRET_KEY: 'sk_test_mock_key' };
  });

  it('rejects unauthenticated requests with status 401', async () => {
    mockVerifyRequestAuth.mockRejectedValueOnce(new AuthError('Missing Authorization header', 401));

    const req = new Request('http://localhost:3000/api/stripe/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({ invoiceId: 'INV-FAM-123' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Missing Authorization header');
  });

  it('rejects requests with unallowed role with status 403', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'coach_001', role: 'coach' });
    mockRequireRole.mockImplementationOnce(() => {
      throw new AuthError('Forbidden: Insufficient role permissions', 403);
    });

    const req = new Request('http://localhost:3000/api/stripe/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({ invoiceId: 'INV-FAM-123' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe('Forbidden: Insufficient role permissions');
  });

  it('returns 400 when invoiceId is missing', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'parent_123', role: 'parent' });
    mockRequireRole.mockReturnValue(undefined);

    const req = new Request('http://localhost:3000/api/stripe/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Missing required field: invoiceId');
  });

  it('returns 404 when invoice is not found', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'parent_123', role: 'parent' });
    mockRequireRole.mockReturnValue(undefined);
    mockGetInvoiceByIdAdmin.mockResolvedValueOnce(null);

    const req = new Request('http://localhost:3000/api/stripe/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({ invoiceId: 'INV-NONEXISTENT' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it('creates Stripe checkout session for authenticated parent user', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'parent_123', role: 'parent' });
    mockRequireRole.mockReturnValue(undefined);
    mockGetInvoiceByIdAdmin.mockResolvedValueOnce({
      id: 'INV-FAM-8042',
      parentEmail: 'robert.vance@gmail.com',
      netTotal: 525,
      payment_status: 'pending',
      children: [{ childName: 'Marcus Vance', sport: 'Football' }],
      installmentBreakdown: [{ amount: 175 }],
    });
    mockStripeCheckoutCreate.mockResolvedValueOnce({
      url: 'https://checkout.stripe.com/pay/cs_test_123',
    });

    const req = new Request('http://localhost:3000/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: { Origin: 'http://localhost:3000' },
      body: JSON.stringify({ invoiceId: 'INV-FAM-8042' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe('https://checkout.stripe.com/pay/cs_test_123');
  });
});
