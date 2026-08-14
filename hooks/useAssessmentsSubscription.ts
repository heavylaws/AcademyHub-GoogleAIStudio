'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  QueryConstraint,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { assessmentConverter, formatAssessmentPayload } from '@/lib/assessmentConverters';
import { Assessment, CreateAssessmentInput } from '@/types/assessment';
import { handleFirestoreError, isPermissionDeniedError, OperationType } from '@/lib/firestoreErrors';

export interface UseAssessmentsOptions {
  athleteId?: string; // 'all' or specific ID
  sport?: string;     // 'all' or specific sport name
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
  seedSampleData: () => Promise<void>;
  refresh: () => void;
}

// Initial baseline mock data used as fallback if Firestore is initializing or offline
export const BASELINE_ASSESSMENTS: Assessment[] = [
  {
    id: 'asm_live_01',
    athlete_id: 'ath_8042',
    athlete_name: 'Marcus Vance',
    parent_email: 'robert.vance@gmail.com',
    sport: 'Football (Soccer)',
    exercise_type: 'Sprint Acceleration Start',
    grading_rubric_sop: 'Countermovement Jump SOP',
    coach_id: 'coach_taylor',
    coach_name: 'Coach Taylor',
    data_source: 'manual',
    quantitative_metrics: {
      valid_reps: 15,
      avg_depth_angle: 88,
      duration_seconds: 45,
      cadence_reps_per_minute: 20,
    },
    qualitative_observations: {
      form_quality_score: 94,
      endurance_score: 92,
      fault_tags: [],
      coach_notes: 'Explosive drive phase. Knee alignment remained centered over middle metatarsal with zero valgus collapse.',
    },
    media_references: {
      video_storage_path: 'assessments/vids/marcus_sprint_2026.mp4',
      smart_grid_processed: true,
    },
    computed_score: 94.2,
    rubric_grade: 'A',
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
  },
  {
    id: 'asm_live_02',
    athlete_id: 'ath_8043',
    athlete_name: 'Sarah Vance',
    parent_email: 'robert.vance@gmail.com',
    sport: 'Badminton',
    exercise_type: 'Overhead Smash Drive',
    grading_rubric_sop: 'Overhead Pronation SOP',
    coach_id: 'coach_morgan',
    coach_name: 'Coach Morgan',
    data_source: 'ai_agentic',
    quantitative_metrics: {
      valid_reps: 18,
      avg_depth_angle: 95,
      duration_seconds: 50,
      cadence_reps_per_minute: 21.6,
    },
    qualitative_observations: {
      form_quality_score: 96,
      endurance_score: 95,
      fault_tags: [],
      coach_notes: 'Peak internal shoulder rotation velocity recorded at 1450 deg/sec. Perfect recovery stance.',
    },
    media_references: {
      video_storage_path: 'assessments/vids/sarah_smash_2026.mp4',
      smart_grid_processed: true,
    },
    computed_score: 96.0,
    rubric_grade: 'A',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
  },
  {
    id: 'asm_live_03',
    athlete_id: 'ath_8044',
    athlete_name: 'Alex Johnson',
    parent_email: 'parent.johnson@gmail.com',
    sport: 'Basketball',
    exercise_type: 'Vertical Jump Explosiveness',
    grading_rubric_sop: 'Triple Extension Jump SOP',
    coach_id: 'coach_davis',
    coach_name: 'Coach Davis',
    data_source: 'manual',
    quantitative_metrics: {
      valid_reps: 12,
      avg_depth_angle: 70,
      duration_seconds: 40,
      cadence_reps_per_minute: 18,
    },
    qualitative_observations: {
      form_quality_score: 86,
      endurance_score: 84,
      fault_tags: ['asymmetric_landing'],
      coach_notes: 'Strong 30-inch vertical takeoff. Right knee dominant on landing contact; cueing soft bilateral toe-heel roll.',
    },
    media_references: {
      video_storage_path: 'assessments/vids/alex_jump_2026.mp4',
      smart_grid_processed: false,
    },
    computed_score: 87.2,
    rubric_grade: 'B',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
  },
  {
    id: 'asm_live_04',
    athlete_id: 'ath_8042',
    athlete_name: 'Marcus Vance',
    parent_email: 'robert.vance@gmail.com',
    sport: 'Football (Soccer)',
    exercise_type: 'Max Power Kick Hip Hinge',
    grading_rubric_sop: 'Squat Depth & Valgus SOP',
    coach_id: 'coach_taylor',
    coach_name: 'Coach Taylor',
    data_source: 'manual',
    quantitative_metrics: {
      valid_reps: 14,
      avg_depth_angle: 92,
      duration_seconds: 45,
      cadence_reps_per_minute: 18.6,
    },
    qualitative_observations: {
      form_quality_score: 91,
      endurance_score: 89,
      fault_tags: ['trunk_lean'],
      coach_notes: 'Good hip clearance and follow through arc. Minor trunk lean on last 2 reps due to quad fatigue.',
    },
    media_references: {
      video_storage_path: 'assessments/vids/marcus_kick_2026.mp4',
      smart_grid_processed: true,
    },
    computed_score: 90.8,
    rubric_grade: 'A',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
  },
  {
    id: 'asm_live_05',
    athlete_id: 'ath_8043',
    athlete_name: 'Sarah Vance',
    parent_email: 'robert.vance@gmail.com',
    sport: 'Badminton',
    exercise_type: 'Forehand Lunge Recovery',
    grading_rubric_sop: 'Lunge Deceleration SOP',
    coach_id: 'coach_morgan',
    coach_name: 'Coach Morgan',
    data_source: 'manual',
    quantitative_metrics: {
      valid_reps: 16,
      avg_depth_angle: 92,
      duration_seconds: 45,
      cadence_reps_per_minute: 21.3,
    },
    qualitative_observations: {
      form_quality_score: 93,
      endurance_score: 91,
      fault_tags: [],
      coach_notes: 'Excellent deceleration control. Lead knee tracked firmly over second toe.',
    },
    media_references: {
      video_storage_path: 'assessments/vids/sarah_lunge_2026.mp4',
      smart_grid_processed: false,
    },
    computed_score: 93.6,
    rubric_grade: 'A',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 days ago
  },
  {
    id: 'asm_live_06',
    athlete_id: 'ath_8045',
    athlete_name: 'Priya Sharma',
    parent_email: 'sharma.family@gmail.com',
    sport: 'Swimming',
    exercise_type: 'Freestyle Arm Rotation',
    grading_rubric_sop: 'High Elbow Catch SOP',
    coach_id: 'coach_patterson',
    coach_name: 'Coach Patterson',
    data_source: 'manual',
    quantitative_metrics: {
      valid_reps: 20,
      avg_depth_angle: 110,
      duration_seconds: 60,
      cadence_reps_per_minute: 20,
    },
    qualitative_observations: {
      form_quality_score: 95,
      endurance_score: 94,
      fault_tags: [],
      coach_notes: 'High elbow catch angle maintained at 105 degrees. Streamline drag coefficient minimal.',
    },
    media_references: {
      video_storage_path: 'assessments/vids/priya_swim_2026.mp4',
      smart_grid_processed: true,
    },
    computed_score: 95.2,
    rubric_grade: 'A',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(), // 4 days ago
  },
];

/**
 * Custom React Hook for live onSnapshot subscription to Firestore assessments collection
 */
export function useAssessmentsSubscription(options: UseAssessmentsOptions = {}): UseAssessmentsReturn {
  const { athleteId = 'all', sport = 'all' } = options;

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const refresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // Function to seed initial baseline data into live Firestore
  const seedSampleData = useCallback(async () => {
    try {
      setLoading(true);
      for (const item of BASELINE_ASSESSMENTS) {
        const docRef = doc(db, 'assessments', item.id).withConverter(assessmentConverter);
        await setDoc(docRef, item, { merge: true });
      }
      setLoading(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'assessments');
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;

    try {
      const constraints: QueryConstraint[] = [];

      if (athleteId && athleteId !== 'all') {
        constraints.push(where('athlete_id', '==', athleteId));
      }
      if (sport && sport !== 'all') {
        constraints.push(where('sport', '==', sport));
      }

      const assessmentsCollection = collection(db, 'assessments').withConverter(assessmentConverter);
      const q = constraints.length > 0 ? query(assessmentsCollection, ...constraints) : query(assessmentsCollection);

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const docs = snapshot.docs.map((docSnap) => docSnap.data());

          // Sort descending by created_at timestamp
          docs.sort((a, b) => {
            const timeA = typeof a.created_at === 'string' ? new Date(a.created_at).getTime() : 0;
            const timeB = typeof b.created_at === 'string' ? new Date(b.created_at).getTime() : 0;
            return timeB - timeA;
          });

          // If firestore returned documents, use them
          if (docs.length > 0) {
            setAssessments(docs);
          } else {
            // If empty in Firestore (first run), provide filtered baseline items so UI is instantly rich
            const filteredBaseline = BASELINE_ASSESSMENTS.filter((item) => {
              const matchAthlete = athleteId === 'all' || item.athlete_id === athleteId;
              const matchSport = sport === 'all' || item.sport === sport;
              return matchAthlete && matchSport;
            });
            setAssessments(filteredBaseline);
          }

          setLoading(false);
          setError(null);
          setIsPermissionDenied(false);
          setIsLive(true);
          setLastUpdated(new Date());
        },
        (err) => {
          handleFirestoreError(err, OperationType.LIST, 'assessments');
          const isPerm = isPermissionDeniedError(err);
          setIsPermissionDenied(isPerm);
          setError(err.message || 'Firestore snapshot error');
          setIsLive(false);

          // Graceful fallback to baseline mock items on permission denied or error
          const filteredBaseline = BASELINE_ASSESSMENTS.filter((item) => {
            const matchAthlete = athleteId === 'all' || item.athlete_id === athleteId;
            const matchSport = sport === 'all' || item.sport === sport;
            return matchAthlete && matchSport;
          });
          setAssessments(filteredBaseline);
          setLoading(false);
        }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'assessments');
      const isPerm = isPermissionDeniedError(err);
      queueMicrotask(() => {
        setIsPermissionDenied(isPerm);
        setError(err instanceof Error ? err.message : String(err));
        setIsLive(false);
        const filteredBaseline = BASELINE_ASSESSMENTS.filter((item) => {
          const matchAthlete = athleteId === 'all' || item.athlete_id === athleteId;
          const matchSport = sport === 'all' || item.sport === sport;
          return matchAthlete && matchSport;
        });
        setAssessments(filteredBaseline);
        setLoading(false);
      });
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [athleteId, sport, refreshTrigger]);

  return {
    assessments,
    loading,
    error,
    isPermissionDenied,
    lastUpdated,
    isLive,
    totalCount: assessments.length,
    seedSampleData,
    refresh,
  };
}
