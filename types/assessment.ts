/**
 * AcademyHub - Athlete Assessment Data Models & Types
 * Supports Manual-First, AI-Ready Biomechanical & Skill Evaluation Workflows
 */

export type DataSource = 'manual' | 'ai_agentic';

export type PipelineStatus = 'ai_evaluated' | 'deterministic_fallback' | 'ai_error';

export interface QuantitativeMetrics {
  valid_reps: number;
  avg_depth_angle?: number;
  duration_seconds: number;
  target_reps?: number;
  cadence_reps_per_minute?: number;
}

export interface QualitativeObservations {
  form_quality_score: number; // 0 - 100 scale
  endurance_score: number;    // 0 - 100 scale
  fault_tags: string[];       // e.g., ["valgus_collapse", "asymmetric_loading", "lumbar_hyperextension"]
  coach_notes: string;
}

export interface MediaReferences {
  video_storage_path?: string;
  smart_grid_processed: boolean; // default false
  thumbnail_url?: string;
  keypoints_json_path?: string;
}

export interface ScoreWeights {
  w1_form: number;       // Default: 0.4 (40%)
  w2_endurance: number;  // Default: 0.4 (40%)
  w3_reps: number;       // Default: 0.2 (20%)
}

export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = {
  w1_form: 0.4,
  w2_endurance: 0.4,
  w3_reps: 0.2,
};

export type RubricGrade = 'A' | 'B' | 'C' | 'D' | 'Incomplete';

export interface Assessment {
  id: string;
  athlete_id: string;
  athlete_name: string;
  parent_email?: string;
  sport: string;
  exercise_type: string;
  grading_rubric_sop?: string; // e.g. "Countermovement Jump", "Squat Depth Threshold", "Dual-Task Agility"
  coach_id?: string;
  coach_name?: string;
  data_source: DataSource;
  pipeline_status?: PipelineStatus;
  error_detail?: string;
  quantitative_metrics: QuantitativeMetrics;
  qualitative_observations: QualitativeObservations;
  media_references: MediaReferences;
  computed_score: number; // Dynamic weighted calculation (0 - 100)
  rubric_grade?: RubricGrade;
  created_at: string;
  updated_at?: string;
}

export interface CreateAssessmentInput {
  athlete_id: string;
  athlete_name: string;
  parent_email?: string;
  sport: string;
  exercise_type: string;
  grading_rubric_sop?: string;
  coach_id?: string;
  coach_name?: string;
  data_source?: DataSource; // defaults to 'manual'
  quantitative_metrics: {
    valid_reps: number;
    avg_depth_angle?: number;
    duration_seconds: number;
    target_reps?: number;
    cadence_reps_per_minute?: number;
  };
  qualitative_observations: {
    form_quality_score: number;
    endurance_score: number;
    fault_tags?: string[];
    coach_notes?: string;
  };
  media_references?: {
    video_storage_path?: string;
    smart_grid_processed?: boolean;
    thumbnail_url?: string;
    keypoints_json_path?: string;
  };
  custom_weights?: Partial<ScoreWeights>;
}

/**
 * Calculates the dynamic computed score for an assessment using weighted factors:
 * - W1 (0.4): Form Quality Score (0-100)
 * - W2 (0.4): Endurance Score (0-100)
 * - W3 (0.2): Quantitative Reps/Execution Score (0-100)
 *
 * @param quantitative Quantitative metrics (valid_reps, duration, etc.)
 * @param qualitative Qualitative observations (form_quality, endurance, faults)
 * @param customWeights Optional custom weights (defaults to W1=0.4, W2=0.4, W3=0.2)
 * @returns Computed score clamped between 0 and 100 (rounded to 1 decimal)
 */
export function calculateComputedScore(
  quantitative: QuantitativeMetrics,
  qualitative: QualitativeObservations,
  customWeights: Partial<ScoreWeights> = {}
): number {
  const weights: ScoreWeights = {
    w1_form: customWeights.w1_form ?? DEFAULT_SCORE_WEIGHTS.w1_form,
    w2_endurance: customWeights.w2_endurance ?? DEFAULT_SCORE_WEIGHTS.w2_endurance,
    w3_reps: customWeights.w3_reps ?? DEFAULT_SCORE_WEIGHTS.w3_reps,
  };

  // 1. Form Quality Component (Clamped 0 - 100)
  const formScore = Math.max(0, Math.min(100, qualitative.form_quality_score || 0));

  // 2. Endurance Component (Clamped 0 - 100)
  const enduranceScore = Math.max(0, Math.min(100, qualitative.endurance_score || 0));

  // 3. Quantitative Execution Component (0 - 100)
  // Calculates rep efficiency against target or standard pacing
  let repScore = 0;
  if (quantitative.target_reps && quantitative.target_reps > 0) {
    repScore = Math.min(100, (quantitative.valid_reps / quantitative.target_reps) * 100);
  } else {
    // Standard baseline: 12-15 valid reps as 100% capacity in typical set duration
    const baselineTarget = Math.max(8, Math.min(25, Math.round((quantitative.duration_seconds || 30) / 2.5)));
    repScore = Math.min(100, (quantitative.valid_reps / baselineTarget) * 100);
  }

  // Deduct small penalty per severe fault tag if present (max 15% reduction)
  const faultPenalty = Math.min(15, (qualitative.fault_tags?.length || 0) * 3);

  const rawScore =
    formScore * weights.w1_form +
    enduranceScore * weights.w2_endurance +
    repScore * weights.w3_reps -
    faultPenalty;

  const finalScore = Math.max(0, Math.min(100, Math.round(rawScore * 10) / 10));
  return finalScore;
}

/**
 * Derives letter grade rubric from numeric score
 */
export function deriveRubricGrade(score: number): RubricGrade {
  if (score >= 88) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score > 0) return 'D';
  return 'Incomplete';
}
