'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { Assessment } from '@/types/assessment';

const POLL_INTERVAL_MS = 12_000;

export interface UseAssessmentsOptions {
  athleteId?: string;
  sport?: string;
  limitCount?: number;
}

export interface UseAssessmentsReturn {
  assessments: Assessment[];
  loading: boolean;
  error: string | null;
  isPermissionDenied: boolean;
  lastUpdated: Date | null;
  isLive: boolean;
  totalCount: number;
  refresh: () => void;
}

export function useAssessmentsSubscription(options: UseAssessmentsOptions = {}): UseAssessmentsReturn {
  const { user } = useAuth();
  const { athleteId = 'all', sport = 'all', limitCount } = options;
  const [assessments, setAssessments] = useState<Assessment[]>([]);
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

    const loadAssessments = async (isInitialLoad: boolean) => {
      try {
        if (!user) {
          const authError = new Error('Authentication required: Please sign in to view assessments.') as Error & { status?: number };
          authError.status = 401;
          throw authError;
        }

        const token = await user.getIdToken();
        const response = await fetch('/api/assessments', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const data = await response.json();
        if (!response.ok) {
          const requestError = new Error(data.error || `Assessment request failed with status ${response.status}`) as Error & { status?: number };
          requestError.status = response.status;
          throw requestError;
        }

        if (cancelled) return;
        const filtered = (data.assessments || []).filter((assessment: Assessment) =>
          (athleteId === 'all' || assessment.athlete_id === athleteId) &&
          (sport === 'all' || assessment.sport === sport)
        );
        setAssessments(typeof limitCount === 'number' ? filtered.slice(0, limitCount) : filtered);
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

    void loadAssessments(true);
    interval = setInterval(() => void loadAssessments(false), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [athleteId, limitCount, refreshTrigger, sport, user]);

  return { assessments, loading, error, isPermissionDenied, lastUpdated, isLive, totalCount: assessments.length, refresh };
}
