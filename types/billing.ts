/**
 * AcademyHub - Billing & Sibling Discount Types
 * Single source of truth for family invoice models, payment statuses, and discount calculations.
 */

export interface ChildRegistration {
  childName: string;
  sport: string;
  monthlyFee: number;
}

export type PaymentSchedule = 'upfront' | '2-part' | 'monthly';
export type PaymentStatus = 'pending' | 'paid' | 'overdue';

export interface InstallmentItem {
  label: string;
  amount: number;
  dueDate: string;
  status: string;
}

export interface FamilyInvoice {
  id: string;
  parentName: string;
  parentEmail: string;
  children: ChildRegistration[];
  subtotal: number;
  discountedChildName: string | null;
  siblingDiscountAmount: number;
  netTotal: number;
  paymentSchedule: PaymentSchedule;
  installmentBreakdown: InstallmentItem[];
  payment_status: PaymentStatus;
  issuedDate: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateInvoiceInput {
  id?: string;
  parentName: string;
  parentEmail: string;
  children: ChildRegistration[];
  subtotal: number;
  discountedChildName: string | null;
  siblingDiscountAmount: number;
  netTotal: number;
  paymentSchedule: PaymentSchedule;
  installmentBreakdown: InstallmentItem[];
  payment_status?: PaymentStatus;
  issuedDate?: string;
}

export interface UpdateInvoiceInput {
  parentName?: string;
  parentEmail?: string;
  children?: ChildRegistration[];
  subtotal?: number;
  discountedChildName?: string | null;
  siblingDiscountAmount?: number;
  netTotal?: number;
  paymentSchedule?: PaymentSchedule;
  installmentBreakdown?: InstallmentItem[];
  payment_status?: PaymentStatus;
  issuedDate?: string;
}

/**
 * Pure calculation helper for 10% Sibling Discount on lowest cost child registration
 */
export function calculateSiblingDiscount(items: ChildRegistration[]) {
  const subtotal = items.reduce((acc, item) => acc + item.monthlyFee, 0);

  if (items.length <= 1) {
    return {
      subtotal,
      discountedChildName: null,
      siblingDiscountAmount: 0,
      netTotal: subtotal,
    };
  }

  let lowestItem = items[0];
  for (let i = 1; i < items.length; i++) {
    if (items[i].monthlyFee < lowestItem.monthlyFee) {
      lowestItem = items[i];
    }
  }

  const discount = Math.round(lowestItem.monthlyFee * 0.10);
  const net = subtotal - discount;

  return {
    subtotal,
    discountedChildName: lowestItem.childName,
    siblingDiscountAmount: discount,
    netTotal: net,
  };
}

/**
 * Pure calculation helper for installment breakdown schedule
 */
export function getInstallments(net: number, schedule: PaymentSchedule): InstallmentItem[] {
  if (schedule === 'upfront') {
    return [
      { label: 'Single Upfront Payment (5% Early Pay Bonus applied)', amount: Math.round(net * 0.95), dueDate: 'Immediate', status: 'Due Now' }
    ];
  } else if (schedule === '2-part') {
    const half = Math.round(net / 2);
    return [
      { label: 'Part 1 of 2 (50%)', amount: half, dueDate: 'Immediate', status: 'Due Now' },
      { label: 'Part 2 of 2 (50%)', amount: net - half, dueDate: '30 Days', status: 'Scheduled' },
    ];
  } else {
    const monthly = Math.round(net / 3);
    return [
      { label: 'Month 1 Installment', amount: monthly, dueDate: 'Immediate', status: 'Due Now' },
      { label: 'Month 2 Installment', amount: monthly, dueDate: '30 Days', status: 'Scheduled' },
      { label: 'Month 3 Installment', amount: net - (monthly * 2), dueDate: '60 Days', status: 'Scheduled' },
    ];
  }
}
