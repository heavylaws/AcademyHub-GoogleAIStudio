import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyRequestAuth } from '@/lib/auth/verifyRequestAuth';
import { requireOwnership } from '@/lib/auth/requireOwnership';
import { AuthError } from '@/lib/auth/types';
import { parseTimeSlot, doTimesOverlap } from '@/lib/scheduling/conflictEngine';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

function authFailure(err: unknown) {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode });
  }
  return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  try {
    const user = await verifyRequestAuth(request);
    await requireOwnership(user, 'schedule', id);
  } catch (err) {
    return authFailure(err);
  }

  try {
    const schedule = await prisma.schedule.findUnique({
      where: { id },
    });

    if (!schedule || schedule.deletedAt !== null) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    return NextResponse.json({ schedule });
  } catch (err) {
    console.error(`Error reading schedule ${id}:`, err);
    return NextResponse.json({ error: 'Failed to read schedule' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  let user;
  try {
    user = await verifyRequestAuth(request);
    await requireOwnership(user, 'schedule', id);
  } catch (err) {
    return authFailure(err);
  }

  if (user.role === 'parent') {
    return NextResponse.json({ error: 'Forbidden: Parents cannot modify schedules' }, { status: 403 });
  }

  try {
    const body = await request.json();

    // 1. Reject immutable fields
    const uneditableFields = ['id', 'academyId', 'createdAt', 'updatedAt', 'deletedAt'];
    for (const field of uneditableFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        return NextResponse.json(
          { error: `Field '${field}' cannot be modified` },
          { status: 400 }
        );
      }
    }

    // Load existing schedule
    const existingSchedule = await prisma.schedule.findUnique({ where: { id } });
    if (!existingSchedule || existingSchedule.deletedAt !== null) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // 2. Validate input updates
    const updateData: Record<string, any> = {};

    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 100) {
        return NextResponse.json({ error: 'Invalid title (1-100 characters required)' }, { status: 400 });
      }
      updateData.title = body.title.trim();
    }

    if (body.sport !== undefined) {
      if (typeof body.sport !== 'string' || !body.sport.trim() || body.sport.length > 50) {
        return NextResponse.json({ error: 'Invalid sport' }, { status: 400 });
      }
      updateData.sport = body.sport.trim();
    }

    if (body.facility !== undefined) {
      if (typeof body.facility !== 'string' || !body.facility.trim() || body.facility.length > 100) {
        return NextResponse.json({ error: 'Invalid facility' }, { status: 400 });
      }
      updateData.facility = body.facility.trim();
    }

    if (body.coachName !== undefined || body.coach !== undefined) {
      const nameVal = body.coachName || body.coach;
      if (typeof nameVal !== 'string' || !nameVal.trim() || nameVal.length > 100) {
        return NextResponse.json({ error: 'Invalid coachName' }, { status: 400 });
      }
      updateData.coachName = nameVal.trim();
    }

    if (body.date !== undefined) {
      if (typeof body.date !== 'string' || Number.isNaN(new Date(body.date).getTime())) {
        return NextResponse.json({ error: 'Invalid date (YYYY-MM-DD required)' }, { status: 400 });
      }
      updateData.date = body.date.trim();
    }

    if (body.timeSlot !== undefined || body.time !== undefined) {
      const timeVal = body.timeSlot || body.time;
      if (typeof timeVal !== 'string' || !parseTimeSlot(timeVal.trim())) {
        return NextResponse.json({ error: 'Invalid timeSlot format (HH:MM - HH:MM required)' }, { status: 400 });
      }
      updateData.timeSlot = timeVal.trim();
    }

    if (body.maxCapacity !== undefined) {
      const cap = typeof body.maxCapacity === 'number' ? body.maxCapacity : parseInt(body.maxCapacity, 10);
      if (isNaN(cap) || cap <= 0) {
        return NextResponse.json({ error: 'maxCapacity must be a positive integer > 0' }, { status: 400 });
      }
      updateData.maxCapacity = cap;
    }

    if (body.enrolledCount !== undefined) {
      const count = typeof body.enrolledCount === 'number' ? body.enrolledCount : parseInt(body.enrolledCount, 10);
      const targetMaxCap = updateData.maxCapacity || existingSchedule.maxCapacity;
      if (isNaN(count) || count < 0 || count > targetMaxCap) {
        return NextResponse.json({ error: 'enrolledCount must be between 0 and maxCapacity' }, { status: 400 });
      }
      updateData.enrolledCount = count;
    }

    // Target values for conflict evaluation
    const targetFacility = updateData.facility || existingSchedule.facility;
    const targetCoachName = updateData.coachName || existingSchedule.coachName;
    const targetDate = updateData.date || existingSchedule.date;
    const targetTimeSlot = updateData.timeSlot || existingSchedule.timeSlot;
    const targetRange = parseTimeSlot(targetTimeSlot)!;

    // 3. Transactional conflict detection & update
    const updatedSchedule = await prisma.$transaction(async (tx) => {
      const otherSchedules = await tx.schedule.findMany({
        where: {
          academyId: existingSchedule.academyId,
          date: targetDate,
          deletedAt: null,
          id: { not: id },
        },
      });

      for (const other of otherSchedules) {
        const otherRange = parseTimeSlot(other.timeSlot);
        if (!otherRange) continue;

        if (doTimesOverlap(targetRange, otherRange)) {
          if (other.facility.toLowerCase() === targetFacility.toLowerCase()) {
            throw new Error(`DOUBLE_BOOKING: Facility '${targetFacility}' is already reserved for '${other.title}' at ${other.timeSlot}`);
          }
          if (other.coachName.toLowerCase() === targetCoachName.toLowerCase()) {
            throw new Error(`COACH_OVERLAP: ${targetCoachName} is already scheduled for '${other.title}' at ${other.timeSlot}`);
          }
        }
      }

      return await tx.schedule.update({
        where: { id },
        data: updateData,
      });
    });

    return NextResponse.json({ schedule: updatedSchedule });
  } catch (err: any) {
    const errMsg = err?.message || '';
    if (errMsg.startsWith('DOUBLE_BOOKING:') || errMsg.startsWith('COACH_OVERLAP:')) {
      return NextResponse.json(
        {
          error: errMsg,
          conflictType: errMsg.startsWith('DOUBLE_BOOKING:') ? 'FACILITY_OVERLAP' : 'COACH_OVERLAP',
        },
        { status: 409 }
      );
    }
    console.error(`Error updating schedule ${id}:`, err);
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  let user;
  try {
    user = await verifyRequestAuth(request);
    await requireOwnership(user, 'schedule', id);
  } catch (err) {
    return authFailure(err);
  }

  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin role required to delete schedule' }, { status: 403 });
  }

  try {
    await prisma.schedule.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return NextResponse.json({ message: 'Schedule soft deleted successfully', id });
  } catch (err) {
    console.error(`Error soft deleting schedule ${id}:`, err);
    return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 });
  }
}
