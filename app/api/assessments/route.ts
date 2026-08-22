import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyRequestAuth } from '@/lib/auth/verifyRequestAuth';
import { requireRole } from '@/lib/auth/requireRole';
import { AuthError } from '@/lib/auth/types';
import { ensureUserRecord } from '@/lib/auth/ensureUserRecord';
import { createAssessment, listAssessmentsForUser } from '@/services/assessmentService';
import { Assessment } from '@/types/assessment';

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

  try {
    const assessments = await listAssessmentsForUser(user.uid, user.role);
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
    const input = (await request.json()) as Assessment & { agent_insights?: unknown };
    if (!input.athlete_id) {
      return NextResponse.json({ error: 'athlete_id is required' }, { status: 400 });
    }

    const athlete = await prisma.athlete.findUnique({
      where: { id: input.athlete_id },
      select: { id: true },
    });
    if (!athlete) {
      return NextResponse.json({ error: 'Athlete not found' }, { status: 400 });
    }

    if (!user.academyId) {
      return NextResponse.json(
        { error: 'No academy context. User must belong to an academy to create assessments.' },
        { status: 400 },
      );
    }

    const assessment = await createAssessment(input, user.uid, user.academyId);
    return NextResponse.json({ assessment }, { status: 201 });
  } catch (err) {
    console.error('Error creating assessment:', err);
    return NextResponse.json({ error: 'Failed to create assessment' }, { status: 500 });
  }
}
