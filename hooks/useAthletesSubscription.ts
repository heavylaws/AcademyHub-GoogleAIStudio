'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth, getAcademyHeaders } from '@/lib/authContext';

export interface AthleteRecord {
  id: string;
  name: string;
  age: number | null;
  dob: string | null;
  parentUserId: string;
  parentEmail: string;
  parentName: string;
  emergencyContact: string | null;
  guardianConsent: boolean;
  sportsEnrolled: string[];
}

const POLL_INTERVAL_MS = 12_000;

export interface UseAthletesReturn {
  athletes: AthleteRecord[];
  loading: boolean;
  error: string | null;
  isPermissionDenied: boolean;
  lastUpdated: Date | null;
  isLive: boolean;
  refresh: () => void;
}

export function useAthletesSubscription(): UseAthletesReturn {
  const { user, activeAcademyId } = useAuth();
  const [athletes, setAthletes] = useState<AthleteRecord[]>([]);
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

    const loadAthletes = async (isInitialLoad: boolean) => {
      setAthletes([]);
      setLoading(true);
      setError(null);
      setIsPermissionDenied(false);
      setLastUpdated(null);
      setIsLive(false);

      try {
        if (!user) {
          const authError = new Error('Authentication required: Please sign in to view athletes.') as Error & { status?: number };
          authError.status = 401;
          throw authError;
        }

        if (!activeAcademyId) return;

        const response = await fetch('/api/athletes', {
          credentials: 'include',
          cache: 'no-store',
          headers: {
            ...getAcademyHeaders(activeAcademyId),
          },
        });
        const data = await response.json();

        if (!response.ok) {
          const requestError = new Error(data.error || `Athlete request failed with status ${response.status}`) as Error & { status?: number };
          requestError.status = response.status;
          throw requestError;
        }

        if (cancelled) return;
        setAthletes(data.athletes || []);
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

    void loadAthletes(true);
    interval = setInterval(() => void loadAthletes(false), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [refreshTrigger, user, activeAcademyId]);

  return { athletes, loading, error, isPermissionDenied, lastUpdated, isLive, refresh };
}
