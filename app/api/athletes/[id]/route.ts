import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyRequestAuth } from '@/lib/auth/verifyRequestAuth';
import { requireOwnership } from '@/lib/auth/requireOwnership';
import { authFailure } from '@/lib/auth/authFailure';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    if (!athlete || athlete.deletedAt !== null) {
      return NextResponse.json({ error: 'Athlete not found' }, { status: 404 });
    }
    return NextResponse.json({ athlete: toAthleteRecord(athlete) });
  } catch (err) {
    console.error(`Error reading athlete ${id}:`, err);
    return NextResponse.json({ error: 'Failed to read athlete' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  let user;
  try {
    user = await verifyRequestAuth(request);
    await requireOwnership(user, 'athlete', id);
  } catch (err) {
    return authFailure(err);
  }

  try {
    const body = await request.json();

    // 1. Reject attempts to modify immutable identifiers
    const uneditableFields = ['id', 'academyId', 'parentUserId', 'createdAt', 'updatedAt', 'deletedAt'];
    for (const field of uneditableFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        return NextResponse.json(
          { error: `Field '${field}' cannot be modified` },
          { status: 400 }
        );
      }
    }

    // 2. Role-based field allowlist check
    if (user.role === 'parent') {
      const parentAllowed = new Set(['emergencyContact', 'parentEmail']);
      const invalidKeys = Object.keys(body).filter((key) => !parentAllowed.has(key));
      if (invalidKeys.length > 0) {
        return NextResponse.json(
          { error: 'Forbidden: Parents can only update emergencyContact and parentEmail' },
          { status: 403 }
        );
      }
    }

    // 3. Input validation
    const updateData: Record<string, any> = {};

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 100) {
        return NextResponse.json({ error: 'Invalid name (1-100 characters required)' }, { status: 400 });
      }
      updateData.name = body.name.trim();
    }

    if (body.dob !== undefined) {
      if (body.dob !== null) {
        if (typeof body.dob !== 'string' || Number.isNaN(new Date(body.dob).getTime())) {
          return NextResponse.json({ error: 'Invalid date of birth' }, { status: 400 });
        }
        updateData.dob = body.dob;
      } else {
        updateData.dob = null;
      }
    }

    if (body.parentEmail !== undefined) {
      if (typeof body.parentEmail !== 'string' || !EMAIL_REGEX.test(body.parentEmail) || body.parentEmail.length > 255) {
        return NextResponse.json({ error: 'Invalid parentEmail' }, { status: 400 });
      }
      updateData.parentEmail = body.parentEmail.trim();
    }

    if (body.emergencyContact !== undefined) {
      if (body.emergencyContact !== null) {
        if (typeof body.emergencyContact !== 'string' || body.emergencyContact.length > 100) {
          return NextResponse.json({ error: 'Invalid emergencyContact (max 100 characters)' }, { status: 400 });
        }
        updateData.emergencyContact = body.emergencyContact.trim();
      } else {
        updateData.emergencyContact = null;
      }
    }

    if (body.guardianConsent !== undefined) {
      if (typeof body.guardianConsent !== 'boolean') {
        return NextResponse.json({ error: 'guardianConsent must be a boolean' }, { status: 400 });
      }
      updateData.guardianConsent = body.guardianConsent;
    }

    if (body.guardianConsentDate !== undefined) {
      updateData.guardianConsentDate = body.guardianConsentDate;
    }

    // 4. Perform update (transactional if sports updated)
    if (Array.isArray(body.sports)) {
      const validSports = body.sports.filter((s: any) => s && typeof s.sport === 'string' && s.sport.trim());
      await prisma.$transaction([
        prisma.athleteSport.deleteMany({ where: { athleteId: id } }),
        prisma.athleteSport.createMany({
          data: validSports.map((s: any) => ({
            athleteId: id,
            sport: s.sport.trim(),
            monthlyFee: typeof s.monthlyFee === 'number' ? s.monthlyFee : 0,
          })),
        }),
        prisma.athlete.update({
          where: { id },
          data: updateData,
        }),
      ]);
    } else {
      await prisma.athlete.update({
        where: { id },
        data: updateData,
      });
    }

    const updatedAthlete = await prisma.athlete.findUnique({
      where: { id },
      include: athleteInclude,
    });

    if (!updatedAthlete || updatedAthlete.deletedAt !== null) {
      return NextResponse.json({ error: 'Athlete not found' }, { status: 404 });
    }

    return NextResponse.json({ athlete: toAthleteRecord(updatedAthlete) });
  } catch (err) {
    console.error(`Error updating athlete ${id}:`, err);
    return NextResponse.json({ error: 'Failed to update athlete' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  let user;
  try {
    user = await verifyRequestAuth(request);
    await requireOwnership(user, 'athlete', id);
  } catch (err) {
    return authFailure(err);
  }

  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin role required to delete athlete' }, { status: 403 });
  }

  try {
    await prisma.athlete.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return NextResponse.json({ message: 'Athlete soft deleted successfully', id });
  } catch (err) {
    console.error(`Error soft deleting athlete ${id}:`, err);
    return NextResponse.json({ error: 'Failed to delete athlete' }, { status: 500 });
  }
}
