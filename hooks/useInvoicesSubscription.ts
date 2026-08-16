'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp,
  QueryConstraint,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FamilyInvoice } from '@/types/billing';
import { handleFirestoreError, isPermissionDeniedError, OperationType } from '@/lib/firestoreErrors';

export interface UseInvoicesOptions {
  parentEmail?: string;
  role?: string | null;
}

export interface UseInvoicesReturn {
  invoices: FamilyInvoice[];
  loading: boolean;
  error: string | null;
  isPermissionDenied: boolean;
  lastUpdated: Date | null;
  isLive: boolean;
  totalCount: number;
  seedSampleData: () => Promise<void>;
  refresh: () => void;
}

export const BASELINE_INVOICES: FamilyInvoice[] = [
  {
    id: 'INV-FAM-8042',
    parentName: 'Robert Vance',
    parentEmail: 'robert.vance@gmail.com',
    children: [
      { childName: 'Marcus Vance', sport: 'Football (Soccer)', monthlyFee: 300 },
      { childName: 'Sarah Vance', sport: 'Badminton', monthlyFee: 250 },
    ],
    subtotal: 550,
    discountedChildName: 'Sarah Vance',
    siblingDiscountAmount: 25,
    netTotal: 525,
    paymentSchedule: 'monthly',
    installmentBreakdown: [
      { label: 'Month 1 Installment', amount: 175, dueDate: 'Immediate', status: 'Paid' },
      { label: 'Month 2 Installment', amount: 175, dueDate: '30 Days', status: 'Scheduled' },
      { label: 'Month 3 Installment', amount: 175, dueDate: '60 Days', status: 'Scheduled' },
    ],
    payment_status: 'pending',
    issuedDate: '2026-08-01',
  },
  {
    id: 'INV-FAM-8044',
    parentName: 'Elena Johnson',
    parentEmail: 'parent.johnson@gmail.com',
    children: [
      { childName: 'Alex Johnson', sport: 'Basketball', monthlyFee: 300 },
    ],
    subtotal: 300,
    discountedChildName: null,
    siblingDiscountAmount: 0,
    netTotal: 300,
    paymentSchedule: 'upfront',
    installmentBreakdown: [
      { label: 'Single Upfront Payment', amount: 285, dueDate: 'Immediate', status: 'Paid' },
    ],
    payment_status: 'paid',
    issuedDate: '2026-08-05',
  },
];

/**
 * Custom React Hook for live onSnapshot subscription to the Firestore invoices collection.
 */
export function useInvoicesSubscription(options: UseInvoicesOptions = {}): UseInvoicesReturn {
  const { parentEmail, role } = options;

  const [invoices, setInvoices] = useState<FamilyInvoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const refresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const seedSampleData = useCallback(async () => {
    try {
      setLoading(true);
      for (const item of BASELINE_INVOICES) {
        const docRef = doc(db, 'invoices', item.id);
        await setDoc(
          docRef,
          {
            ...item,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
          },
          { merge: true }
        );
      }
      setLoading(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'invoices');
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;

    try {
      const constraints: QueryConstraint[] = [];

      // If user is parent or a specific email is requested and not admin, scope by parentEmail
      if (role === 'parent' && parentEmail) {
        constraints.push(where('parentEmail', '==', parentEmail));
      } else if (parentEmail && role !== 'admin') {
        constraints.push(where('parentEmail', '==', parentEmail));
      }

      const invoicesCollection = collection(db, 'invoices');
      const q = constraints.length > 0 ? query(invoicesCollection, ...constraints) : query(invoicesCollection);

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const docs = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              ...data,
              payment_status: data.payment_status || (data.status === 'Paid' ? 'paid' : 'pending'),
            } as FamilyInvoice;
          });

          // Sort descending by issuedDate
          docs.sort((a, b) => (b.issuedDate || '').localeCompare(a.issuedDate || ''));

          if (docs.length > 0) {
            setInvoices(docs);
          } else {
            // Provide filtered baseline items if collection is empty
            const filteredBaseline = BASELINE_INVOICES.filter((item) => {
              if (role === 'parent' && parentEmail) {
                return item.parentEmail === parentEmail;
              }
              return true;
            });
            setInvoices(filteredBaseline);
          }

          setLoading(false);
          setError(null);
          setIsPermissionDenied(false);
          setIsLive(true);
          setLastUpdated(new Date());
        },
        (err) => {
          handleFirestoreError(err, OperationType.LIST, 'invoices');
          const isPerm = isPermissionDeniedError(err);
          setIsPermissionDenied(isPerm);
          setError(err.message || 'Firestore snapshot error');
          setIsLive(false);

          const filteredBaseline = BASELINE_INVOICES.filter((item) => {
            if (role === 'parent' && parentEmail) {
              return item.parentEmail === parentEmail;
            }
            return true;
          });
          setInvoices(filteredBaseline);
          setLoading(false);
        }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'invoices');
      const isPerm = isPermissionDeniedError(err);
      queueMicrotask(() => {
        setIsPermissionDenied(isPerm);
        setError(err instanceof Error ? err.message : String(err));
        setIsLive(false);
        setInvoices(BASELINE_INVOICES);
        setLoading(false);
      });
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [parentEmail, role, refreshTrigger]);

  return {
    invoices,
    loading,
    error,
    isPermissionDenied,
    lastUpdated,
    isLive,
    totalCount: invoices.length,
    seedSampleData,
    refresh,
  };
}
