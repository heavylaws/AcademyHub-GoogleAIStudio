import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyRequestAuth } from '@/lib/auth/verifyRequestAuth';
import { requireOwnership } from '@/lib/auth/requireOwnership';
import { AuthError } from '@/lib/auth/types';
import { getAssessmentById } from '@/services/assessmentService';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

function authFailure(err: unknown) {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode });
  }
  return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const user = await verifyRequestAuth(request);
    await requireOwnership(user, 'assessment', id);
  } catch (err) {
    return authFailure(err);
  }

  try {
    const assessment = await getAssessmentById(id);
    if (!assessment) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    return NextResponse.json({ assessment });
  } catch (err) {
    console.error(`Error reading assessment ${id}:`, err);
    return NextResponse.json({ error: 'Failed to read assessment' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  let user;
  try {
    user = await verifyRequestAuth(request);
    await requireOwnership(user, 'assessment', id);
  } catch (err) {
    return authFailure(err);
  }

  if (user.role === 'parent') {
    return NextResponse.json({ error: 'Forbidden: Parents cannot modify assessments' }, { status: 403 });
  }

  try {
    const body = await request.json();

    // 1. Reject score, grade, provenance, athleteId, academyId modification attempts
    const uneditableFields = [
      'id',
      'computed_score',
      'computedScore',
      'rubric_grade',
      'rubricGrade',
      'data_source',
      'dataSource',
      'pipeline_status',
      'pipelineStatus',
      'athlete_id',
      'athleteId',
      'academy_id',
      'academyId',
      'created_at',
      'createdAt',
      'updated_at',
      'updatedAt',
      'deletedAt',
    ];

    for (const field of uneditableFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        return NextResponse.json(
          { error: 'Score, grade, provenance, athleteId, and academyId fields cannot be modified' },
          { status: 400 }
        );
      }
    }

    // 2. Validate input and construct update payload
    const updateData: Record<string, any> = {};

    if (body.exercise_type !== undefined) {
      if (typeof body.exercise_type !== 'string' || !body.exercise_type.trim() || body.exercise_type.length > 100) {
        return NextResponse.json({ error: 'Invalid exercise_type (1-100 characters required)' }, { status: 400 });
      }
      updateData.exerciseType = body.exercise_type.trim();
    }

    // Load existing qualitativeObservations to merge coach_notes / fault_tags if updated
    const existing = await prisma.assessment.findUnique({
      where: { id },
      select: { qualitativeObservations: true, deletedAt: true },
    });

    if (!existing || existing.deletedAt !== null) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    const currentQual = (existing.qualitativeObservations as Record<string, any>) || {};
    const updatedQual = { ...currentQual };
    let qualitativeChanged = false;

    if (body.coach_notes !== undefined) {
      if (body.coach_notes !== null && (typeof body.coach_notes !== 'string' || body.coach_notes.length > 2000)) {
        return NextResponse.json({ error: 'Invalid coach_notes (max 2000 characters)' }, { status: 400 });
      }
      updatedQual.coach_notes = body.coach_notes ? body.coach_notes.trim() : null;
      qualitativeChanged = true;
    }

    if (body.fault_tags !== undefined) {
      if (!Array.isArray(body.fault_tags) && typeof body.fault_tags !== 'string') {
        return NextResponse.json({ error: 'Invalid fault_tags (must be string array or string)' }, { status: 400 });
      }
      updatedQual.fault_tags = body.fault_tags;
      qualitativeChanged = true;
    }

    if (qualitativeChanged) {
      updateData.qualitativeObservations = updatedQual as Prisma.InputJsonValue;
    }

    await prisma.assessment.update({
      where: { id },
      data: updateData,
    });

    const updated = await getAssessmentById(id);
    if (!updated) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });

    return NextResponse.json({ assessment: updated });
  } catch (err) {
    console.error(`Error updating assessment ${id}:`, err);
    return NextResponse.json({ error: 'Failed to update assessment' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  let user;
  try {
    user = await verifyRequestAuth(request);
    await requireOwnership(user, 'assessment', id);
  } catch (err) {
    return authFailure(err);
  }

  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin role required to delete assessment' }, { status: 403 });
  }

  try {
    await prisma.assessment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return NextResponse.json({ message: 'Assessment soft deleted successfully', id });
  } catch (err) {
    console.error(`Error soft deleting assessment ${id}:`, err);
    return NextResponse.json({ error: 'Failed to delete assessment' }, { status: 500 });
  }
}
