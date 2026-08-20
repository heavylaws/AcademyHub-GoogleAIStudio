/**
 * AcademyHub - Biomechanics & Performance Evaluation Service
 * 
 * Manages assessment evaluation routing governed by the feature flag:
 * NEXT_PUBLIC_ENABLE_AI_PIPELINE.
 * 
 * - When false: Processes assessments deterministically using the mathematical
 *   weighted scoring formula (W1=0.4, W2=0.4, W3=0.2) from manual coach inputs (data_source = 'manual').
 * - When true: Routes incoming assessment payloads to the server-side Gemini API /
 *   multi-agent LangGraph biomechanics processing pipeline (data_source = 'ai_agentic').
 */

import {
  Assessment,
  CreateAssessmentInput,
  DataSource,
  PipelineStatus,
  calculateComputedScore,
  deriveRubricGrade,
  RubricGrade,
} from '@/types/assessment';

export interface MultiAgentBiomechanicsOutput {
  kinematicAnalysis: string;
  fatigueAnalysis: string;
  faultDiagnostics: string[];
  prescriptiveDrills: string[];
  confidenceScore: number;
  processingPipeline: 'deterministic_manual' | 'gemini_multi_agent';
}

export interface EvaluatedAssessment extends Assessment {
  agent_insights?: MultiAgentBiomechanicsOutput;
}

/**
 * Checks whether the AI evaluation pipeline feature flag is enabled.
 * Evaluates process.env.NEXT_PUBLIC_ENABLE_AI_PIPELINE with support
 * for client-side local runtime toggling for coach testing.
 */
export function isAIPipelineEnabled(): boolean {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem('NEXT_PUBLIC_ENABLE_AI_PIPELINE');
    if (stored !== null) {
      return stored === 'true';
    }
  }
  return process.env.NEXT_PUBLIC_ENABLE_AI_PIPELINE === 'true';
}

/**
 * Allows coaches and administrators to dynamically toggle the feature flag
 * in the active session UI for testing both evaluation pipelines.
 */
export function setAIPipelineOverride(enabled: boolean | null): void {
  if (typeof window !== 'undefined') {
    if (enabled === null) {
      window.localStorage.removeItem('NEXT_PUBLIC_ENABLE_AI_PIPELINE');
    } else {
      window.localStorage.setItem('NEXT_PUBLIC_ENABLE_AI_PIPELINE', String(enabled));
    }
  }
}

/**
 * 1. Deterministic Scoring Evaluation Mode
 * Runs purely on client/local deterministic math when NEXT_PUBLIC_ENABLE_AI_PIPELINE is false.
 */
export function processDeterministicAssessment(
  input: CreateAssessmentInput,
  id?: string
): EvaluatedAssessment {
  const quantitative = {
    valid_reps: Number(input.quantitative_metrics.valid_reps || 0),
    avg_depth_angle: input.quantitative_metrics.avg_depth_angle,
    duration_seconds: Number(input.quantitative_metrics.duration_seconds || 0),
    target_reps: input.quantitative_metrics.target_reps,
    cadence_reps_per_minute:
      input.quantitative_metrics.duration_seconds > 0
        ? Math.round(
            (input.quantitative_metrics.valid_reps /
              (input.quantitative_metrics.duration_seconds / 60)) *
              10
          ) / 10
        : undefined,
  };

  const qualitative = {
    form_quality_score: Number(input.qualitative_observations.form_quality_score || 0),
    endurance_score: Number(input.qualitative_observations.endurance_score || 0),
    fault_tags: input.qualitative_observations.fault_tags || [],
    coach_notes: input.qualitative_observations.coach_notes || '',
  };

  const media = {
    video_storage_path: input.media_references?.video_storage_path,
    smart_grid_processed: input.media_references?.smart_grid_processed ?? false,
    thumbnail_url: input.media_references?.thumbnail_url,
    keypoints_json_path: input.media_references?.keypoints_json_path,
  };

  // Deterministic W1=0.4, W2=0.4, W3=0.2 scoring formula
  const computedScore = calculateComputedScore(
    quantitative,
    qualitative,
    input.custom_weights
  );
  const rubricGrade = deriveRubricGrade(computedScore);

  const docId = id || `asm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  return {
    id: docId,
    athlete_id: input.athlete_id,
    athlete_name: input.athlete_name,
    parent_email: input.parent_email,
    sport: input.sport,
    exercise_type: input.exercise_type,
    grading_rubric_sop: input.grading_rubric_sop || `${input.sport} - ${input.exercise_type} SOP`,
    coach_id: input.coach_id || 'coach_manual_entry',
    coach_name: input.coach_name || 'Coach Assessment',
    data_source: 'manual', // Explicitly marked as manual coach entry
    pipeline_status: 'deterministic_fallback' as PipelineStatus,
    quantitative_metrics: quantitative,
    qualitative_observations: qualitative,
    media_references: media,
    computed_score: computedScore,
    rubric_grade: rubricGrade,
    created_at: new Date().toISOString(),
  };
}

/**
 * 2. AI Multi-Agent Biomechanics Processing Pipeline Mode
 * Routes incoming payload to the server-side Gemini API / agent pipeline when NEXT_PUBLIC_ENABLE_AI_PIPELINE is true.
 */
export async function processAIAssessment(
  input: CreateAssessmentInput,
  id?: string
): Promise<EvaluatedAssessment> {
  const docId = id || `asm_ai_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  try {
    const response = await fetch('/api/biomechanics/evaluate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        ...input,
        id: docId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status} from AI evaluation pipeline`);
    }

    const data = await response.json();

    if (data && data.assessment) {
      return {
        ...data.assessment,
        id: docId,
        data_source: (data.assessment.data_source || 'ai_agentic') as DataSource,
        pipeline_status: (data.assessment.pipeline_status || 'ai_evaluated') as PipelineStatus,
        error_detail: data.assessment.error_detail,
        created_at: data.assessment.created_at || new Date().toISOString(),
      };
    }

    throw new Error('Invalid payload structure received from Gemini evaluation pipeline');
  } catch (error) {
    console.warn('AI pipeline invocation failed, returning deterministic fallback:', error);
    // Graceful fallback — no fake AI insights
    const fallback = processDeterministicAssessment(input, docId);
    return {
      ...fallback,
      pipeline_status: 'ai_error' as PipelineStatus,
      error_detail: error instanceof Error ? error.message : 'AI pipeline request failed',
    };
  }
}

/**
 * Main Evaluation Service Dispatcher:
 * Automatically evaluates the feature flag `NEXT_PUBLIC_ENABLE_AI_PIPELINE`:
 * - If false: uses deterministic scoring formula from manual coach inputs (data_source = 'manual')
 * - If true: routes to server-side Gemini API / LangGraph multi-agent pipeline (data_source = 'ai_agentic')
 */
export async function evaluateAssessment(
  input: CreateAssessmentInput,
  id?: string
): Promise<EvaluatedAssessment> {
  const isAI = isAIPipelineEnabled();

  if (isAI) {
    return await processAIAssessment(input, id);
  } else {
    return processDeterministicAssessment(input, id);
  }
}
