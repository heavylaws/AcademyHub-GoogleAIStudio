import { NextResponse } from 'next/server';
import { verifyRequestAuth } from '@/lib/auth/verifyRequestAuth';
import { requireOwnership } from '@/lib/auth/requireOwnership';
import { AuthError } from '@/lib/auth/types';
import { getAssessmentById } from '@/services/assessmentService';

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
