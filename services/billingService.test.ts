import { beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('billingService - authenticated API requests', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('creates an invoice through the API with the browser session cookie', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ invoice: { id: 'cuid_invoice' } }), { status: 201 })
    );

    await createInvoice(input);

    expect(fetchMock).toHaveBeenCalledWith('/api/invoices', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    }));
  });

  it('updates invoice writes through the browser session cookie', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ invoice: { id: 'invoice_1' } }), { status: 200 })
    );

    await updateInvoice('invoice_1', { payment_status: 'paid' });

    expect(fetchMock).toHaveBeenCalledWith('/api/invoices/invoice_1', expect.objectContaining({
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    }));
  });
});
