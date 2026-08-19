import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createInvoice, updateInvoice } from './billingService';

const input = {
  parentName: 'Parent',
  parentEmail: 'parent@example.com',
  children: [{ childName: 'Child', sport: 'Football', monthlyFee: 300 }],
  subtotal: 300,
  discountedChildName: null,
  siblingDiscountAmount: 0,
  netTotal: 300,
  paymentSchedule: 'monthly' as const,
  installmentBreakdown: [{ label: 'Installment 1', amount: 300, dueDate: 'Immediate', status: 'Pending' }],
};

describe('billingService — authenticated API requests', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('creates an invoice through the API with a bearer token', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ invoice: { id: 'cuid_invoice' } }), { status: 201 })
    );

    await createInvoice(input, undefined, 'firebase-token');

    expect(fetchMock).toHaveBeenCalledWith('/api/invoices', expect.objectContaining({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer firebase-token',
      },
    }));
  });

  it('rejects invoice writes without an authentication token', async () => {
    await expect(createInvoice(input)).rejects.toThrow('Authentication required');
    await expect(updateInvoice('invoice_1', { payment_status: 'paid' })).rejects.toThrow('Authentication required');
  });
});
