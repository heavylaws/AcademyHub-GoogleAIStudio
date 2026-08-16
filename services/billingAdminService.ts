/**
 * Server-only Billing Admin Service.
 *
 * Uses Firebase Admin SDK (adminDb) to perform administrative invoice operations
 * that bypass Firestore Security Rules on the server side (e.g. Stripe checkout & webhooks).
 *
 * CRITICAL: NEVER import this file from any React client component or 'use client' file.
 */

import { adminDb } from '@/lib/firebaseAdmin';
import { FamilyInvoice, UpdateInvoiceInput } from '@/types/billing';

const INVOICES_COLLECTION = 'invoices';

/**
 * Reads an invoice by ID with administrative privileges (bypassing client auth / rules).
 */
export async function getInvoiceByIdAdmin(invoiceId: string): Promise<FamilyInvoice | null> {
  const docRef = adminDb.collection(INVOICES_COLLECTION).doc(invoiceId);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    return null;
  }

  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...(data as Omit<FamilyInvoice, 'id'>),
  };
}

/**
 * Updates an invoice with administrative privileges.
 */
export async function updateInvoiceAdmin(
  invoiceId: string,
  updates: UpdateInvoiceInput
): Promise<void> {
  const docRef = adminDb.collection(INVOICES_COLLECTION).doc(invoiceId);

  const cleanUpdates: Record<string, any> = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  // Remove undefined fields
  Object.keys(cleanUpdates).forEach(
    (key) => cleanUpdates[key] === undefined && delete cleanUpdates[key]
  );

  await docRef.set(cleanUpdates, { merge: true });
}
