/**
 * AcademyHub - Firestore Assessment Converters & Utilities
 * Provides typed FirestoreDataConverter and serialization helpers
 * for Manual-First and AI-Ready biomechanics assessments.
 */

import {
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  DocumentData,
  serverTimestamp,
  Timestamp,
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Assessment,
  CreateAssessmentInput,
  calculateComputedScore,
  deriveRubricGrade,
  DataSource,
  PipelineStatus,
} from '../types/assessment';

/**
 * Firestore Data Converter for Assessment documents
 * Ensures strict schema enforcement and default value assignment on read/write.
 */
export const assessmentConverter: FirestoreDataConverter<Assessment> = {
  toFirestore(assessment: Assessment): DocumentData {
    return {
      athlete_id: assessment.athlete_id,
      athlete_name: assessment.athlete_name,
      parent_email: assessment.parent_email || null,
      sport: assessment.sport,
      exercise_type: assessment.exercise_type,
      grading_rubric_sop: assessment.grading_rubric_sop || null,
      coach_id: assessment.coach_id || null,
      coach_name: assessment.coach_name || null,
      data_source: assessment.data_source || ('manual' as DataSource),
      pipeline_status: assessment.pipeline_status || null,
      error_detail: assessment.error_detail || null,
      quantitative_metrics: {
        valid_reps: Number(assessment.quantitative_metrics?.valid_reps || 0),
        avg_depth_angle:
          assessment.quantitative_metrics?.avg_depth_angle !== undefined
            ? Number(assessment.quantitative_metrics.avg_depth_angle)
            : null,
        duration_seconds: Number(assessment.quantitative_metrics?.duration_seconds || 0),
        target_reps: assessment.quantitative_metrics?.target_reps || null,
        cadence_reps_per_minute: assessment.quantitative_metrics?.cadence_reps_per_minute || null,
      },
      qualitative_observations: {
        form_quality_score: Number(assessment.qualitative_observations?.form_quality_score || 0),
        endurance_score: Number(assessment.qualitative_observations?.endurance_score || 0),
        fault_tags: Array.isArray(assessment.qualitative_observations?.fault_tags)
          ? assessment.qualitative_observations.fault_tags
          : [],
        coach_notes: assessment.qualitative_observations?.coach_notes || '',
      },
      media_references: {
        video_storage_path: assessment.media_references?.video_storage_path || null,
        smart_grid_processed: Boolean(assessment.media_references?.smart_grid_processed || false),
        thumbnail_url: assessment.media_references?.thumbnail_url || null,
        keypoints_json_path: assessment.media_references?.keypoints_json_path || null,
      },
      computed_score: Number(assessment.computed_score || 0),
      rubric_grade: assessment.rubric_grade || deriveRubricGrade(assessment.computed_score || 0),
      created_at: assessment.created_at || serverTimestamp(),
      updated_at: serverTimestamp(),
    };
  },

  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options?: SnapshotOptions
  ): Assessment {
    const data = snapshot.data(options);

    const quantitative_metrics = {
      valid_reps: Number(data.quantitative_metrics?.valid_reps || 0),
      avg_depth_angle:
        data.quantitative_metrics?.avg_depth_angle !== undefined &&
        data.quantitative_metrics?.avg_depth_angle !== null
          ? Number(data.quantitative_metrics.avg_depth_angle)
          : undefined,
      duration_seconds: Number(data.quantitative_metrics?.duration_seconds || 0),
      target_reps: data.quantitative_metrics?.target_reps || undefined,
      cadence_reps_per_minute: data.quantitative_metrics?.cadence_reps_per_minute || undefined,
    };

    const qualitative_observations = {
      form_quality_score: Number(data.qualitative_observations?.form_quality_score || 0),
      endurance_score: Number(data.qualitative_observations?.endurance_score || 0),
      fault_tags: Array.isArray(data.qualitative_observations?.fault_tags)
        ? data.qualitative_observations.fault_tags
        : [],
      coach_notes: String(data.qualitative_observations?.coach_notes || ''),
    };

    const media_references = {
      video_storage_path: data.media_references?.video_storage_path || undefined,
      smart_grid_processed: Boolean(data.media_references?.smart_grid_processed ?? false),
      thumbnail_url: data.media_references?.thumbnail_url || undefined,
      keypoints_json_path: data.media_references?.keypoints_json_path || undefined,
    };

    const computed_score =
      data.computed_score !== undefined
        ? Number(data.computed_score)
        : calculateComputedScore(quantitative_metrics, qualitative_observations);

    let created_at: string | Timestamp = new Date().toISOString();
    if (data.created_at) {
      if (typeof data.created_at?.toDate === 'function') {
        created_at = data.created_at.toDate().toISOString();
      } else if (typeof data.created_at === 'string') {
        created_at = data.created_at;
      }
    }

    return {
      id: snapshot.id,
      athlete_id: data.athlete_id || '',
      athlete_name: data.athlete_name || 'Athlete',
      parent_email: data.parent_email || undefined,
      sport: data.sport || 'General',
      exercise_type: data.exercise_type || 'Exercise',
      grading_rubric_sop: data.grading_rubric_sop || undefined,
      coach_id: data.coach_id || undefined,
      coach_name: data.coach_name || undefined,
      data_source: (data.data_source as DataSource) || 'manual',
      pipeline_status: (data.pipeline_status as PipelineStatus) || undefined,
      error_detail: data.error_detail || undefined,
      quantitative_metrics,
      qualitative_observations,
      media_references,
      computed_score,
      rubric_grade: data.rubric_grade || deriveRubricGrade(computed_score),
      created_at,
    };
  },
};

/**
 * Creates and formats an assessment payload from a client/coach input,
 * auto-computing the weighted score (W1=0.4, W2=0.4, W3=0.2).
 */
export function formatAssessmentPayload(
  input: CreateAssessmentInput,
  id?: string
): Assessment {
  const quantitative = {
    valid_reps: Number(input.quantitative_metrics.valid_reps || 0),
    avg_depth_angle: input.quantitative_metrics.avg_depth_angle,
    duration_seconds: Number(input.quantitative_metrics.duration_seconds || 0),
    target_reps: input.quantitative_metrics.target_reps,
    cadence_reps_per_minute: input.quantitative_metrics.cadence_reps_per_minute,
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

  const computed_score = calculateComputedScore(quantitative, qualitative, input.custom_weights);
  const rubric_grade = deriveRubricGrade(computed_score);

  return {
    id: id || `asm_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    athlete_id: input.athlete_id,
    athlete_name: input.athlete_name,
    parent_email: input.parent_email,
    sport: input.sport,
    exercise_type: input.exercise_type,
    grading_rubric_sop: input.grading_rubric_sop,
    coach_id: input.coach_id,
    coach_name: input.coach_name,
    data_source: input.data_source || 'manual',
    quantitative_metrics: quantitative,
    qualitative_observations: qualitative,
    media_references: media,
    computed_score,
    rubric_grade,
    created_at: new Date().toISOString(),
  };
}

/**
 * Saves an assessment to Firestore using the converter
 */
export async function saveAssessmentToFirestore(
  input: CreateAssessmentInput | Assessment,
  assessmentId?: string
): Promise<Assessment> {
  let assessment: Assessment;
  if ('computed_score' in input && input.id) {
    assessment = input as Assessment;
  } else {
    assessment = formatAssessmentPayload(input as CreateAssessmentInput, assessmentId);
  }
  const docRef = doc(db, 'assessments', assessment.id).withConverter(assessmentConverter);
  await setDoc(docRef, assessment, { merge: true });
  return assessment;
}

/**
 * Fetches all assessments for a specific athlete
 */
export async function getAssessmentsByAthlete(athleteId: string): Promise<Assessment[]> {
  const q = query(
    collection(db, 'assessments').withConverter(assessmentConverter),
    where('athlete_id', '==', athleteId),
    orderBy('created_at', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => docSnap.data());
}
