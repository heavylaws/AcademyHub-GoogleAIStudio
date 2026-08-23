import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyRequestAuth } from '@/lib/auth/verifyRequestAuth';
import { AuthError } from '@/lib/auth/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  let user;
  try {
    user = await verifyRequestAuth(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }

  if (!user.academyId) {
    return NextResponse.json({ error: 'Forbidden: No academy context' }, { status: 403 });
  }

  const academyId = user.academyId;
  const role = user.role;

  try {
    // 1. Athlete count
    const athleteWhere: Record<string, any> = { academyId, deletedAt: null };
    if (role === 'parent') {
      athleteWhere.parentUserId = user.uid;
    }
    const athleteCount = await prisma.athlete.count({ where: athleteWhere });

    // 2. Assessment count & average score
    const assessmentWhere: Record<string, any> = {
      academyId,
      deletedAt: null,
      athlete: { deletedAt: null },
    };
    if (role === 'parent') {
      assessmentWhere.athlete = { parentUserId: user.uid, deletedAt: null };
    }

    const assessmentCount = await prisma.assessment.count({ where: assessmentWhere });
    const assessmentAvg = await prisma.assessment.aggregate({
      where: assessmentWhere,
      _avg: { computedScore: true },
    });

    const averageAssessmentScore =
      assessmentCount > 0 && assessmentAvg._avg.computedScore !== null
        ? Math.round(Number(assessmentAvg._avg.computedScore))
        : null;

    // 3. Schedule / Session count
    const sessionCount = await prisma.schedule.count({
      where: { academyId, deletedAt: null },
    });

    // 4. Billing figures (Admin only)
    let totalRevenue: number | null = null;
    let paidInvoiceCount: number | null = null;

    if (role === 'admin') {
      const paidInvoicesSum = await prisma.invoice.aggregate({
        where: { academyId, paymentStatus: 'PAID' },
        _sum: { netTotal: true },
        _count: true,
      });
      totalRevenue = paidInvoicesSum._sum.netTotal ? Number(paidInvoicesSum._sum.netTotal) : 0;
      paidInvoiceCount = paidInvoicesSum._count;
    }

    // 5. Recent assessments (up to 3)
    const recentAssessmentRows = await prisma.assessment.findMany({
      where: assessmentWhere,
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        id: true,
        athleteName: true,
        sport: true,
        computedScore: true,
        rubricGrade: true,
        createdAt: true,
      },
    });

    const recentAssessments = recentAssessmentRows.map((a) => ({
      id: a.id,
      athlete_name: a.athleteName,
      sport: a.sport,
      computed_score: a.computedScore,
      rubric_grade: a.rubricGrade,
      created_at: a.createdAt.toISOString(),
    }));

    // 6. Recent schedules (up to 3)
    const recentScheduleRows = await prisma.schedule.findMany({
      where: { academyId, deletedAt: null },
      orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }],
      take: 3,
      select: {
        id: true,
        title: true,
        facility: true,
        coachName: true,
        sport: true,
        date: true,
        timeSlot: true,
        maxCapacity: true,
        enrolledCount: true,
      },
    });

    return NextResponse.json({
      metrics: {
        athleteCount,
        assessmentCount,
        averageAssessmentScore,
        sessionCount,
        totalRevenue,
        paidInvoiceCount,
        recentAssessments,
        recentSchedules: recentScheduleRows,
      },
    });
  } catch (err) {
    console.error('Error computing dashboard metrics:', err);
    return NextResponse.json({ error: 'Failed to compute dashboard metrics' }, { status: 500 });
  }
}
