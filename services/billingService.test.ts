import { describe, it, expect, vi } from 'vitest';
import { createInvoice } from './billingService';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn().mockResolvedValue(undefined),
  serverTimestamp: vi.fn().mockReturnValue('MOCK_TIMESTAMP'),
  collection: vi.fn(),
  updateDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({
  db: {},
}));

describe('billingService — Invoice ID Generation', () => {
  it('generates non-predictable invoice IDs using cryptographically random UUID with INV-FAM- prefix', async () => {
    const input = {
      parentName: 'Robert Vance',
      parentEmail: 'robert.vance@gmail.com',
      children: [{ childName: 'Marcus Vance', sport: 'Football', monthlyFee: 300 }],
      subtotal: 300,
      discountedChildName: null,
      siblingDiscountAmount: 0,
      netTotal: 300,
      paymentSchedule: 'monthly' as const,
      installmentBreakdown: [{ label: 'Installment 1', amount: 300, dueDate: 'Immediate', status: 'Pending' }],
    };

    const invoice1 = await createInvoice(input);
    const invoice2 = await createInvoice(input);

    expect(invoice1.id).toMatch(/^INV-FAM-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(invoice2.id).toMatch(/^INV-FAM-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(invoice1.id).not.toEqual(invoice2.id);
  });
});
