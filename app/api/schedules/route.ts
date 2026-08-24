import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyRequestAuth } from '@/lib/auth/verifyRequestAuth';
import { requireRole } from '@/lib/auth/requireRole';
import { authFailure } from '@/lib/auth/authFailure';
import { parseTimeSlot, doTimesOverlap } from '@/lib/scheduling/conflictEngine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  const whereClause: Record<string, any> = {
    academyId: user.academyId,
    deletedAt: null,
  };

  if (date) {
    whereClause.date = date;
  } else if (startDate || endDate) {
    whereClause.date = {};
    if (startDate) whereClause.date.gte = startDate;
    if (endDate) whereClause.date.lte = endDate;
  }

  try {
    const schedules = await prisma.schedule.findMany({
      where: whereClause,
      orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }],
    });
    return NextResponse.json({ schedules });
  } catch (err) {
    console.error('Error listing schedules:', err);
    return NextResponse.json({ error: 'Failed to list schedules' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await verifyRequestAuth(request);
    requireRole(user, ['coach', 'admin']);
  } catch (err) {
    return authFailure(err);
  }

  if (!user.academyId) {
    return NextResponse.json({ error: 'Forbidden: No academy context' }, { status: 403 });
  }

  try {
    const body = await request.json();

    // 1. Validation
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const sport = typeof body.sport === 'string' ? body.sport.trim() : '';
    const facility = typeof body.facility === 'string' ? body.facility.trim() : '';
    const coachName = typeof body.coachName === 'string' ? body.coachName.trim() : typeof body.coach === 'string' ? body.coach.trim() : '';
    const date = typeof body.date === 'string' ? body.date.trim() : '';
    const timeSlot = typeof body.timeSlot === 'string' ? body.timeSlot.trim() : typeof body.time === 'string' ? body.time.trim() : '';
    const maxCapacity = typeof body.maxCapacity === 'number' ? body.maxCapacity : parseInt(body.maxCapacity, 10);
    const enrolledCount = body.enrolledCount !== undefined ? (typeof body.enrolledCount === 'number' ? body.enrolledCount : parseInt(body.enrolledCount, 10)) : 0;

    if (!title || title.length > 100) {
      return NextResponse.json({ error: 'title is required (1-100 characters)' }, { status: 400 });
    }
    if (!sport || sport.length > 50) {
      return NextResponse.json({ error: 'sport is required (1-50 characters)' }, { status: 400 });
    }
    if (!facility || facility.length > 100) {
      return NextResponse.json({ error: 'facility is required (1-100 characters)' }, { status: 400 });
    }
    if (!coachName || coachName.length > 100) {
      return NextResponse.json({ error: 'coachName is required (1-100 characters)' }, { status: 400 });
    }
    if (!date || Number.isNaN(new Date(date).getTime())) {
      return NextResponse.json({ error: 'Invalid or missing date (YYYY-MM-DD required)' }, { status: 400 });
    }

    const parsedRange = parseTimeSlot(timeSlot);
    if (!parsedRange) {
      return NextResponse.json({ error: 'Invalid timeSlot format (HH:MM - HH:MM required)' }, { status: 400 });
    }

    if (isNaN(maxCapacity) || maxCapacity <= 0) {
      return NextResponse.json({ error: 'maxCapacity must be a positive integer > 0' }, { status: 400 });
    }

    if (isNaN(enrolledCount) || enrolledCount < 0 || enrolledCount > maxCapacity) {
      return NextResponse.json({ error: 'enrolledCount must be between 0 and maxCapacity' }, { status: 400 });
    }

    // 2. Transactional conflict detection & creation
    const academyId = user.academyId;

    const result = await prisma.$transaction(async (tx) => {
      // Find existing active schedules for the same date and academy
      const existingSchedules = await tx.schedule.findMany({
        where: {
          academyId,
          date,
          deletedAt: null,
        },
      });

      for (const existing of existingSchedules) {
        const existingRange = parseTimeSlot(existing.timeSlot);
        if (!existingRange) continue;

        if (doTimesOverlap(parsedRange, existingRange)) {
          // Check facility double-booking
          if (existing.facility.toLowerCase() === facility.toLowerCase()) {
            throw new Error(`DOUBLE_BOOKING: Facility '${facility}' is already reserved for '${existing.title}' at ${existing.timeSlot}`);
          }

          // Check coach double-booking
          if (existing.coachName.toLowerCase() === coachName.toLowerCase()) {
            throw new Error(`COACH_OVERLAP: ${coachName} is already scheduled for '${existing.title}' at ${existing.timeSlot}`);
          }
        }
      }

      return await tx.schedule.create({
        data: {
          academyId,
          title,
          sport,
          facility,
          coachName,
          coachId: body.coachId || user.uid,
          date,
          timeSlot,
          maxCapacity,
          enrolledCount,
        },
      });
    });

    return NextResponse.json({ schedule: result }, { status: 201 });
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
    console.error('Error creating schedule:', err);
    return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 });
  }
}
