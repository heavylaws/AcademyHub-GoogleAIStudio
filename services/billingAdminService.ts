import { prisma } from '@/lib/prisma';
import { toNumber } from '@/lib/money';
import { Prisma, InstallmentStatus } from '@prisma/client';
import {
  ChildRegistration,
  CreateInvoiceInput,
  FamilyInvoice,
  InstallmentItem,
  UpdateInvoiceInput,
} from '@/types/billing';

const invoiceInclude = { children: true, installments: true } as const;
type InvoiceWithRelations = Prisma.InvoiceGetPayload<{ include: typeof invoiceInclude }>;

const paymentScheduleToPrisma = {
  upfront: 'UPFRONT',
  '2-part': 'TWO_PART',
  monthly: 'MONTHLY',
} as const;

const paymentScheduleFromPrisma = {
  UPFRONT: 'upfront',
  TWO_PART: '2-part',
  MONTHLY: 'monthly',
} as const;

const paymentStatusToPrisma = {
  pending: 'PENDING',
  paid: 'PAID',
  overdue: 'OVERDUE',
} as const;

const paymentStatusFromPrisma = {
  PENDING: 'pending',
  PAID: 'paid',
  OVERDUE: 'overdue',
} as const;

const installmentStatusToPrisma: Record<string, InstallmentStatus> = {
  'Due Now': 'DUE_NOW',
  'Scheduled': 'SCHEDULED',
};

const installmentStatusFromPrisma: Record<InstallmentStatus, string> = {
  DUE_NOW: 'Due Now',
  SCHEDULED: 'Scheduled',
};

function toFamilyInvoice(invoice: InvoiceWithRelations): FamilyInvoice {
  return {
    id: invoice.id,
    parentName: invoice.parentName,
    parentEmail: invoice.parentEmail,
    children: invoice.children.map((child): ChildRegistration => ({
      childName: child.childName,
      sport: child.sport,
      monthlyFee: toNumber(child.monthlyFee),
    })),
    subtotal: toNumber(invoice.subtotal),
    discountedChildName: invoice.discountedChildName,
    siblingDiscountAmount: toNumber(invoice.siblingDiscountAmount),
    netTotal: toNumber(invoice.netTotal),
    paymentSchedule: paymentScheduleFromPrisma[invoice.paymentSchedule],
    installmentBreakdown: invoice.installments.map((installment): InstallmentItem => ({
      label: installment.label,
      amount: toNumber(installment.amount),
      dueDate: installment.dueDate,
      status: installmentStatusFromPrisma[installment.status] || installment.status,
    })),
    payment_status: paymentStatusFromPrisma[invoice.paymentStatus],
    issuedDate: invoice.issuedDate,
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
  };
}

export async function listInvoicesAdmin(): Promise<FamilyInvoice[]> {
  const invoices = await prisma.invoice.findMany({
    include: invoiceInclude,
    orderBy: { issuedDate: 'desc' },
  });
  return invoices.map(toFamilyInvoice);
}

export async function listInvoicesForParentUser(parentUserId: string): Promise<FamilyInvoice[]> {
  const invoices = await prisma.invoice.findMany({
    where: { parentUserId },
    include: invoiceInclude,
    orderBy: { issuedDate: 'desc' },
  });
  return invoices.map(toFamilyInvoice);
}

export async function getInvoiceByIdAdmin(invoiceId: string): Promise<FamilyInvoice | null> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: invoiceInclude,
  });
  return invoice ? toFamilyInvoice(invoice) : null;
}

export async function createInvoiceAdmin(
  input: CreateInvoiceInput & { parentUserId: string; academyId: string }
): Promise<FamilyInvoice> {
  const invoice = await prisma.invoice.create({
    data: {
      academyId: input.academyId,
      parentUserId: input.parentUserId,
      parentName: input.parentName,
      parentEmail: input.parentEmail,
      subtotal: input.subtotal,
      discountedChildName: input.discountedChildName,
      siblingDiscountAmount: input.siblingDiscountAmount,
      netTotal: input.netTotal,
      paymentSchedule: paymentScheduleToPrisma[input.paymentSchedule],
      paymentStatus: paymentStatusToPrisma[input.payment_status || 'pending'],
      issuedDate: input.issuedDate || new Date().toISOString().split('T')[0],
      children: {
        create: input.children.map((child) => ({
          childName: child.childName,
          sport: child.sport,
          monthlyFee: child.monthlyFee,
        })),
      },
      installments: {
        create: input.installmentBreakdown.map((installment) => ({
          label: installment.label,
          amount: installment.amount,
          dueDate: installment.dueDate,
          status: installmentStatusToPrisma[installment.status] || 'DUE_NOW',
        })),
      },
    },
    include: invoiceInclude,
  });
  return toFamilyInvoice(invoice);
}

export async function updateInvoiceAdmin(
  invoiceId: string,
  updates: UpdateInvoiceInput
): Promise<void> {
  const { children, installmentBreakdown, payment_status, paymentSchedule, ...scalarUpdates } = updates;

  await prisma.$transaction(async (transaction) => {
    await transaction.invoice.update({
      where: { id: invoiceId },
      data: {
        ...scalarUpdates,
        ...(payment_status ? { paymentStatus: paymentStatusToPrisma[payment_status] } : {}),
        ...(paymentSchedule
          ? { paymentSchedule: paymentScheduleToPrisma[paymentSchedule] }
          : {}),
      },
    });

    if (children) {
      await transaction.invoiceChild.deleteMany({ where: { invoiceId } });
      await transaction.invoiceChild.createMany({
        data: children.map((child) => ({ invoiceId, ...child })),
      });
    }

    if (installmentBreakdown) {
      await transaction.installment.deleteMany({ where: { invoiceId } });
      await transaction.installment.createMany({
        data: installmentBreakdown.map((installment) => ({
          invoiceId,
          ...installment,
          status: installmentStatusToPrisma[installment.status] || 'DUE_NOW',
        })),
      });
    }
  });
}
