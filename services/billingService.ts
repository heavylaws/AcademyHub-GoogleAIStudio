/** Client-side invoice service. All invoice writes go through authenticated API routes. */

import { FamilyInvoice, CreateInvoiceInput, UpdateInvoiceInput } from '@/types/billing';

async function requestWithSession<T>(path: string, method: 'POST' | 'PATCH', body: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Invoice request failed with status ${response.status}`);
  }
  return data;
}

export async function createInvoice(
  input: CreateInvoiceInput,
  customId?: string
): Promise<FamilyInvoice> {
  const data = await requestWithSession<{ invoice: FamilyInvoice }>(
    '/api/invoices',
    'POST',
    { ...input, ...(customId || input.id ? { id: customId || input.id } : {}) }
  );
  return data.invoice;
}

export async function updateInvoice(
  invoiceId: string,
  updates: UpdateInvoiceInput
): Promise<void> {
  await requestWithSession(`/api/invoices/${encodeURIComponent(invoiceId)}`, 'PATCH', updates);
}
