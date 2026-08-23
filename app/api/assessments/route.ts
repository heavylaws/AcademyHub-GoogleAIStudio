import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyRequestAuth } from '@/lib/auth/verifyRequestAuth';
import { requireRole } from '@/lib/auth/requireRole';
import { AuthError } from '@/lib/auth/types';
import { ensureUserRecord } from '@/lib/auth/ensureUserRecord';
import { createAssessment, listAssessmentsForUser, PersistedAssessment } from '@/services/assessmentService';
import { Assessment, calculateComputedScore, deriveRubricGrade } from '@/types/assessment';

export const dynamic = 'force-dynamic';

function authFailure(err: unknown) {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode });
  }
  return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
}

export async function GET(request: Request) {
  let user;
  try {
    user = await verifyRequestAuth(request);
    requireRole(user, ['parent', 'coach', 'admin']);
  } catch (err) {
    return authFailure(err);
  }

  if (!user.academyId) {
    return NextResponse.json({ error: 'Forbidden: No academy context' }, { status: 403 });
  }

  try {
    const assessments = await listAssessmentsForUser(user.uid, user.academyId, user.role);
    return NextResponse.json({ assessments });
  } catch (err) {
    console.error('Error listing assessments:', err);
    return NextResponse.json({ error: 'Failed to list assessments' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let user;
  try {
    user = await verifyRequestAuth(request);
    requireRole(user, ['coach', 'admin']);
  } catch (err) {
    return authFailure(err);
  }

  try {
    await ensureUserRecord(user);
    const body = (await request.json()) as Record<string, any>;

    // 1. Reject score, grade, provenance, and pipeline_status fields on manual creation
    const forbiddenFields = [
      'computed_score',
      'computedScore',
      'rubric_grade',
      'rubricGrade',
      'data_source',
      'dataSource',
      'pipeline_status',
      'pipelineStatus',
    ];

    for (const field of forbiddenFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        return NextResponse.json(
          { error: `Field '${field}' cannot be specified on manual assessment creation` },
          { status: 400 }
        );
      }
    }

    if (!body.athlete_id) {
      return NextResponse.json({ error: 'athlete_id is required' }, { status: 400 });
    }

    // 2. Validate athlete belongs to caller's academy and is not soft-deleted
    const athlete = await prisma.athlete.findUnique({
      where: { id: body.athlete_id },
      select: { id: true, academyId: true, deletedAt: true, name: true, parentEmail: true },
    });

    if (!athlete || athlete.deletedAt !== null || athlete.academyId !== user.academyId) {
      return NextResponse.json({ error: 'Athlete not found' }, { status: 400 });
    }

    if (!user.academyId) {
      return NextResponse.json(
        { error: 'No academy context. User must belong to an academy to create assessments.' },
        { status: 400 }
      );
    }

    // 3. Compute score and grade server-side for manual assessment (Option b)
    const quantitative = {
      valid_reps: Number(body.quantitative_metrics?.valid_reps || 0),
      duration_seconds: Number(body.quantitative_metrics?.duration_seconds || 0),
      avg_depth_angle: body.quantitative_metrics?.avg_depth_angle !== undefined
        ? Number(body.quantitative_metrics.avg_depth_angle)
        : undefined,
      target_reps: body.quantitative_metrics?.target_reps,
    };

    const qualitative = {
      form_quality_score: Number(body.qualitative_observations?.form_quality_score || 85),
      endurance_score: Number(body.qualitative_observations?.endurance_score || 80),
      fault_tags: body.qualitative_observations?.fault_tags || [],
      coach_notes: body.qualitative_observations?.coach_notes || '',
    };

    const computedScore = calculateComputedScore(quantitative, qualitative, body.custom_weights);
    const rubricGrade = deriveRubricGrade(computedScore);

    const manualInput: PersistedAssessment = {
      ...body,
      athlete_id: athlete.id,
      athlete_name: body.athlete_name || athlete.name,
      parent_email: body.parent_email || athlete.parentEmail,
      sport: body.sport || 'Unspecified',
      exercise_type: body.exercise_type || 'General',
      data_source: 'manual',
      quantitative_metrics: quantitative,
      qualitative_observations: qualitative,
      computed_score: computedScore,
      rubric_grade: rubricGrade,
    };

    const assessment = await createAssessment(manualInput, user.uid, user.academyId);
    return NextResponse.json({ assessment }, { status: 201 });
  } catch (err) {
    console.error('Error creating assessment:', err);
    return NextResponse.json({ error: 'Failed to create assessment' }, { status: 500 });
  }
}
