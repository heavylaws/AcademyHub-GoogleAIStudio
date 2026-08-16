/**
 * AcademyHub - Billing & Family Invoice Firestore Service
 * Provides Firestore CRUD operations targeting the `invoices` collection.
 */

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  FamilyInvoice,
  CreateInvoiceInput,
  UpdateInvoiceInput,
} from '@/types/billing';
import { handleFirestoreError, OperationType } from '@/lib/firestoreErrors';

const INVOICES_COLLECTION = 'invoices';

/**
 * Creates and persists a consolidated family invoice in Firestore.
 */
export async function createInvoice(
  input: CreateInvoiceInput,
  customId?: string
): Promise<FamilyInvoice> {
  try {
    const invoiceId = customId || input.id || `INV-FAM-${Math.floor(1000 + Math.random() * 9000)}`;
    const docRef = doc(db, INVOICES_COLLECTION, invoiceId);

    const invoiceData: FamilyInvoice = {
      id: invoiceId,
      parentName: input.parentName,
      parentEmail: input.parentEmail,
      children: input.children,
      subtotal: input.subtotal,
      discountedChildName: input.discountedChildName,
      siblingDiscountAmount: input.siblingDiscountAmount,
      netTotal: input.netTotal,
      paymentSchedule: input.paymentSchedule,
      installmentBreakdown: input.installmentBreakdown,
      payment_status: input.payment_status || 'pending',
      issuedDate: input.issuedDate || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(
      docRef,
      {
        ...invoiceData,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      },
      { merge: true }
    );

    return invoiceData;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, INVOICES_COLLECTION);
    throw err;
  }
}

/**
 * Fetches a single family invoice by its ID.
 */
export async function getInvoiceById(invoiceId: string): Promise<FamilyInvoice | null> {
  try {
    const docRef = doc(db, INVOICES_COLLECTION, invoiceId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return null;
    }
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      payment_status: data.payment_status || (data.status === 'Paid' ? 'paid' : 'pending'),
    } as FamilyInvoice;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `${INVOICES_COLLECTION}/${invoiceId}`);
    throw err;
  }
}

/**
 * Updates an existing invoice document in Firestore (e.g. payment_status or line items).
 */
export async function updateInvoice(
  invoiceId: string,
  updates: UpdateInvoiceInput
): Promise<void> {
  try {
    const docRef = doc(db, INVOICES_COLLECTION, invoiceId);

    const payload: Record<string, unknown> = {
      ...updates,
      updated_at: serverTimestamp(),
      updatedAt: new Date().toISOString(),
    };

    await updateDoc(docRef, payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${INVOICES_COLLECTION}/${invoiceId}`);
    throw err;
  }
}

/**
 * Fetches all invoices where parentEmail matches the given address.
 */
export async function listInvoicesForParent(parentEmail: string): Promise<FamilyInvoice[]> {
  try {
    const q = query(
      collection(db, INVOICES_COLLECTION),
      where('parentEmail', '==', parentEmail)
    );
    const snapshot = await getDocs(q);
    const results = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        payment_status: data.payment_status || (data.status === 'Paid' ? 'paid' : 'pending'),
      } as FamilyInvoice;
    });

    return results.sort((a, b) => (b.issuedDate || '').localeCompare(a.issuedDate || ''));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, INVOICES_COLLECTION);
    throw err;
  }
}

/**
 * Admin query: Fetches all family invoices in the system.
 */
export async function listInvoicesForAdmin(): Promise<FamilyInvoice[]> {
  try {
    const snapshot = await getDocs(collection(db, INVOICES_COLLECTION));
    const results = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        payment_status: data.payment_status || (data.status === 'Paid' ? 'paid' : 'pending'),
      } as FamilyInvoice;
    });

    return results.sort((a, b) => (b.issuedDate || '').localeCompare(a.issuedDate || ''));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, INVOICES_COLLECTION);
    throw err;
  }
}
