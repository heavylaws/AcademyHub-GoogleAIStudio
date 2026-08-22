import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  Assessment,
  DataSource,
  PipelineStatus,
} from '@/types/assessment';

const dataSourceToPrisma = {
  manual: 'MANUAL',
  ai_agentic: 'AI_AGENTIC',
} as const;

const pipelineStatusToPrisma = {
  deterministic_fallback: 'DETERMINISTIC_FALLBACK',
  ai_evaluated: 'AI_EVALUATED',
  ai_error: 'AI_ERROR',
} as const;

const dataSourceFromPrisma = {
  MANUAL: 'manual',
  AI_AGENTIC: 'ai_agentic',
} as const;

const pipelineStatusFromPrisma = {
  DETERMINISTIC_FALLBACK: 'deterministic_fallback',
  AI_EVALUATED: 'ai_evaluated',
  AI_ERROR: 'ai_error',
} as const;

const assessmentInclude = {
  athlete: { select: { parentEmail: true } },
  coach: { select: { displayName: true } },
} as const;

type AssessmentWithRelations = Prisma.AssessmentGetPayload<{ include: typeof assessmentInclude }>;
type PersistedAssessment = Assessment & { agent_insights?: unknown };

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return (value ?? {}) as Prisma.InputJsonValue;
}

function toAssessment(record: AssessmentWithRelations): Assessment {
  return {
    id: record.id,
    athlete_id: record.athleteId,
    athlete_name: record.athleteName,
    parent_email: record.parentEmail || record.athlete.parentEmail || undefined,
    sport: record.sport,
    exercise_type: record.exerciseType,
    grading_rubric_sop: record.gradingRubricSop || undefined,
    coach_id: record.coachId || undefined,
    coach_name: record.coachName || record.coach?.displayName || undefined,
    data_source: dataSourceFromPrisma[record.dataSource],
    pipeline_status: record.pipelineStatus
      ? pipelineStatusFromPrisma[record.pipelineStatus]
      : undefined,
    error_detail: record.errorDetail || undefined,
    quantitative_metrics: record.quantitativeMetrics as unknown as Assessment['quantitative_metrics'],
    qualitative_observations: record.qualitativeObservations as unknown as Assessment['qualitative_observations'],
    media_references: record.mediaReferences as unknown as Assessment['media_references'],
    computed_score: record.computedScore,
    rubric_grade: (record.rubricGrade as Assessment['rubric_grade']) || undefined,
    created_at: record.createdAt.toISOString(),
    updated_at: record.updatedAt.toISOString(),
  };
}

export async function listAssessmentsForUser(userId: string, role?: string): Promise<Assessment[]> {
  const records = await prisma.assessment.findMany({
    where: role === 'parent' ? { athlete: { parentUserId: userId } } : undefined,
    include: assessmentInclude,
    orderBy: { createdAt: 'desc' },
  });
  return records.map(toAssessment);
}

export async function getAssessmentById(id: string): Promise<Assessment | null> {
  const record = await prisma.assessment.findUnique({ where: { id }, include: assessmentInclude });
  return record ? toAssessment(record) : null;
}

export async function createAssessment(
  input: PersistedAssessment,
  coachUserId: string,
  academyId: string,
): Promise<Assessment> {
  const record = await prisma.assessment.create({
    data: {
      ...(input.id ? { id: input.id } : {}),
      academyId,
      athleteId: input.athlete_id,
      athleteName: input.athlete_name,
      parentEmail: input.parent_email,
      sport: input.sport,
      exerciseType: input.exercise_type,
      gradingRubricSop: input.grading_rubric_sop,
      coachId: coachUserId,
      coachName: input.coach_name,
      dataSource: dataSourceToPrisma[input.data_source || 'manual'],
      pipelineStatus: input.pipeline_status
        ? pipelineStatusToPrisma[input.pipeline_status]
        : undefined,
      errorDetail: input.error_detail,
      quantitativeMetrics: jsonValue(input.quantitative_metrics),
      qualitativeObservations: jsonValue(input.qualitative_observations),
      mediaReferences: jsonValue(input.media_references),
      agentInsights: input.agent_insights ? jsonValue(input.agent_insights) : undefined,
      computedScore: input.computed_score,
      rubricGrade: input.rubric_grade,
    },
    include: assessmentInclude,
  });
  return toAssessment(record);
}
