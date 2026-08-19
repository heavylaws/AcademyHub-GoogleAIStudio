import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyRequestAuth } from '@/lib/auth/verifyRequestAuth';
import { requireRole } from '@/lib/auth/requireRole';
import { AuthError } from '@/lib/auth/types';
import { ensureUserRecord } from '@/lib/auth/ensureUserRecord';

interface CreateAthleteInput {
  name: string;
  dob?: string | null;
  parentUserId: string;
  parentEmail: string;
  emergencyContact?: string | null;
  guardianConsent?: boolean;
  guardianConsentDate?: string | null;
  sports?: Array<{ sport: string; monthlyFee?: number }>;
}

export const dynamic = 'force-dynamic';

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
  const beforeBirthday =
    today.getMonth() < birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

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

const athleteInclude = {
  parent: { select: { displayName: true } },
  sports: { select: { sport: true }, orderBy: { createdAt: 'asc' as const } },
};

export async function GET(request: Request) {
  let user;
  try {
    user = await verifyRequestAuth(request);
    requireRole(user, ['parent', 'coach', 'admin']);
  } catch (err) {
    return authFailure(err);
  }

  try {
    const athletes = await prisma.athlete.findMany({
      where: user.role === 'parent' ? { parentUserId: user.uid } : undefined,
      include: athleteInclude,
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ athletes: athletes.map(toAthleteRecord) });
  } catch (err) {
    console.error('Error listing athletes:', err);
    return NextResponse.json({ error: 'Failed to list athletes' }, { status: 500 });
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
    const input = (await request.json()) as CreateAthleteInput;
    if (!input.name?.trim() || !input.parentUserId || !input.parentEmail?.trim()) {
      return NextResponse.json(
        { error: 'name, parentUserId, and parentEmail are required' },
        { status: 400 }
      );
    }

    if (input.parentUserId !== user.uid) {
      const targetParent = await prisma.user.findUnique({ where: { id: input.parentUserId } });
      if (!targetParent) {
        return NextResponse.json(
          { error: 'Parent account must sign in before an athlete can be registered for it.' },
          { status: 400 }
        );
      }
    }

    const athlete = await prisma.athlete.create({
      data: {
        name: input.name.trim(),
        dob: input.dob || null,
        parentUserId: input.parentUserId,
        parentEmail: input.parentEmail.trim(),
        emergencyContact: input.emergencyContact || null,
        guardianConsent: input.guardianConsent ?? true,
        guardianConsentDate: input.guardianConsentDate || new Date().toISOString(),
        sports: {
          create: (input.sports || []).filter((sport) => sport.sport?.trim()).map((sport) => ({
            sport: sport.sport.trim(),
            monthlyFee: sport.monthlyFee || 0,
          })),
        },
      },
      include: athleteInclude,
    });

    return NextResponse.json({ athlete: toAthleteRecord(athlete) }, { status: 201 });
  } catch (err) {
    console.error('Error creating athlete:', err);
    return NextResponse.json({ error: 'Failed to create athlete' }, { status: 500 });
  }
}
