'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth, getAcademyHeaders } from '@/lib/authContext';
import { FamilyInvoice } from '@/types/billing';

const POLL_INTERVAL_MS = 12_000;

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
  refresh: () => void;
}

export function useInvoicesSubscription(_options: UseInvoicesOptions = {}): UseInvoicesReturn {
  const { user, activeAcademyId } = useAuth();
  const [invoices, setInvoices] = useState<FamilyInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = useCallback(() => setRefreshTrigger((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | undefined;

    const loadInvoices = async (isInitialLoad: boolean) => {
      setInvoices([]);
      setLoading(true);
      setError(null);
      setIsPermissionDenied(false);
      setLastUpdated(null);
      setIsLive(false);
      
      try {
        if (!user) {
          throw new Error('Authentication required: Please sign in to view invoices.');
        }
        
        if (!activeAcademyId) return;

        const response = await fetch('/api/invoices', {
          credentials: 'include',
          cache: 'no-store',
          headers: {
            ...getAcademyHeaders(activeAcademyId),
          },
        });
        const data = await response.json();

        if (!response.ok) {
          const requestError = new Error(data.error || `Invoice request failed with status ${response.status}`);
          (requestError as Error & { status?: number }).status = response.status;
          throw requestError;
        }

        if (cancelled) return;
        setInvoices(data.invoices || []);
        setError(null);
        setIsPermissionDenied(false);
        setIsLive(true);
        setLastUpdated(new Date());
      } catch (requestError) {
        if (cancelled) return;
        const status = (requestError as Error & { status?: number }).status;
        setError(requestError instanceof Error ? requestError.message : String(requestError));
        setIsPermissionDenied(status === 401 || status === 403);
        setIsLive(false);
      } finally {
        if (!cancelled && isInitialLoad) setLoading(false);
      }
    };

    void loadInvoices(true);
    interval = setInterval(() => void loadInvoices(false), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [refreshTrigger, user, activeAcademyId]);

  return {
    invoices,
    loading,
    error,
    isPermissionDenied,
    lastUpdated,
    isLive,
    totalCount: invoices.length,
    refresh,
  };
}
