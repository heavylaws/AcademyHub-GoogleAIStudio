/** Client-side invoice service. All invoice writes go through authenticated API routes. */

import { FamilyInvoice, CreateInvoiceInput, UpdateInvoiceInput } from '@/types/billing';

async function requestWithToken<T>(path: string, method: 'POST' | 'PATCH', body: unknown, authToken: string): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
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
  customId?: string,
  authToken?: string
): Promise<FamilyInvoice> {
  if (!authToken) {
    throw new Error('Authentication required to create an invoice.');
  }

  const data = await requestWithToken<{ invoice: FamilyInvoice }>(
    '/api/invoices',
    'POST',
    { ...input, ...(customId || input.id ? { id: customId || input.id } : {}) },
    authToken
  );
  return data.invoice;
}

export async function updateInvoice(
  invoiceId: string,
  updates: UpdateInvoiceInput,
  authToken?: string
): Promise<void> {
  if (!authToken) {
    throw new Error('Authentication required to update an invoice.');
  }

  await requestWithToken(`/api/invoices/${encodeURIComponent(invoiceId)}`, 'PATCH', updates, authToken);
}
