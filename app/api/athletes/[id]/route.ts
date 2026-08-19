import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyRequestAuth } from '@/lib/auth/verifyRequestAuth';
import { requireOwnership } from '@/lib/auth/requireOwnership';
import { AuthError } from '@/lib/auth/types';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

function authFailure(err: unknown) {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode });
  }
  return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
}

function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  const birthDate = new Date(dob);
  if (Number.isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  if (today.getMonth() < birthDate.getMonth() || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) age -= 1;
  return age;
}

const athleteInclude = {
  parent: { select: { displayName: true } },
  sports: { select: { sport: true }, orderBy: { createdAt: 'asc' as const } },
};

function toAthleteRecord(athlete: {
  id: string;
  name: string;
  dob: string | null;
  parentUserId: string;
  parentEmail: string;
  emergencyContact: string | null;
  guardianConsent: boolean;
  sports: Array<{ sport: string }>;
  parent: { displayName: string | null };
}) {
  return {
    id: athlete.id,
    name: athlete.name,
    age: ageFromDob(athlete.dob),
    dob: athlete.dob,
    parentUserId: athlete.parentUserId,
    parentEmail: athlete.parentEmail,
    parentName: athlete.parent.displayName || athlete.parentEmail,
    emergencyContact: athlete.emergencyContact,
    guardianConsent: athlete.guardianConsent,
    sportsEnrolled: athlete.sports.map(({ sport }) => sport),
  };
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const user = await verifyRequestAuth(request);
    await requireOwnership(user, 'athlete', id);
  } catch (err) {
    return authFailure(err);
  }

  try {
    const athlete = await prisma.athlete.findUnique({ where: { id }, include: athleteInclude });
    if (!athlete) return NextResponse.json({ error: 'Athlete not found' }, { status: 404 });
    return NextResponse.json({ athlete: toAthleteRecord(athlete) });
  } catch (err) {
    console.error(`Error reading athlete ${id}:`, err);
    return NextResponse.json({ error: 'Failed to read athlete' }, { status: 500 });
  }
}
