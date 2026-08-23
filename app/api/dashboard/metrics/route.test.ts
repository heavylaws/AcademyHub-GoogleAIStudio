import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

const mockVerifyRequestAuth = vi.fn();
const mockAthleteCount = vi.fn();
const mockAssessmentCount = vi.fn();
const mockAssessmentAggregate = vi.fn();
const mockAssessmentFindMany = vi.fn();
const mockScheduleCount = vi.fn();
const mockScheduleFindMany = vi.fn();
const mockInvoiceAggregate = vi.fn();

vi.mock('@/lib/auth/verifyRequestAuth', () => ({
  verifyRequestAuth: (request: Request) => mockVerifyRequestAuth(request),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    athlete: {
      count: (args: unknown) => mockAthleteCount(args),
    },
    assessment: {
      count: (args: unknown) => mockAssessmentCount(args),
      aggregate: (args: unknown) => mockAssessmentAggregate(args),
      findMany: (args: unknown) => mockAssessmentFindMany(args),
    },
    schedule: {
      count: (args: unknown) => mockScheduleCount(args),
      findMany: (args: unknown) => mockScheduleFindMany(args),
    },
    invoice: {
      aggregate: (args: unknown) => mockInvoiceAggregate(args),
    },
  },
}));

describe('/api/dashboard/metrics', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns full tenant aggregates for admin role including billing figures', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'admin_1', role: 'admin', academyId: 'acad_1' });
    mockAthleteCount.mockResolvedValueOnce(25);
    mockAssessmentCount.mockResolvedValueOnce(10);
    mockAssessmentAggregate.mockResolvedValueOnce({ _avg: { computedScore: 88.4 } });
    mockScheduleCount.mockResolvedValueOnce(5);
    mockInvoiceAggregate.mockResolvedValueOnce({ _sum: { netTotal: 1500.0 }, _count: 3 });
    mockAssessmentFindMany.mockResolvedValueOnce([]);
    mockScheduleFindMany.mockResolvedValueOnce([]);

    const response = await GET(new NextRequest('http://localhost/api/dashboard/metrics'));

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.metrics.athleteCount).toBe(25);
    expect(json.metrics.assessmentCount).toBe(10);
    expect(json.metrics.averageAssessmentScore).toBe(88);
    expect(json.metrics.sessionCount).toBe(5);
    expect(json.metrics.totalRevenue).toBe(1500);
    expect(json.metrics.paidInvoiceCount).toBe(3);

    // Verify deletedAt: null filter applied across models
    expect(mockAthleteCount).toHaveBeenCalledWith({ where: { academyId: 'acad_1', deletedAt: null } });
    expect(mockScheduleCount).toHaveBeenCalledWith({ where: { academyId: 'acad_1', deletedAt: null } });
  });

  it('hides billing figures for coach role', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'coach_1', role: 'coach', academyId: 'acad_1' });
    mockAthleteCount.mockResolvedValueOnce(12);
    mockAssessmentCount.mockResolvedValueOnce(4);
    mockAssessmentAggregate.mockResolvedValueOnce({ _avg: { computedScore: 92.0 } });
    mockScheduleCount.mockResolvedValueOnce(3);
    mockAssessmentFindMany.mockResolvedValueOnce([]);
    mockScheduleFindMany.mockResolvedValueOnce([]);

    const response = await GET(new NextRequest('http://localhost/api/dashboard/metrics'));

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.metrics.totalRevenue).toBeNull();
    expect(json.metrics.paidInvoiceCount).toBeNull();
    expect(mockInvoiceAggregate).not.toHaveBeenCalled();
  });

  it('scopes athlete and assessment counts to parent children for parent role', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'parent_1', role: 'parent', academyId: 'acad_1' });
    mockAthleteCount.mockResolvedValueOnce(2);
    mockAssessmentCount.mockResolvedValueOnce(1);
    mockAssessmentAggregate.mockResolvedValueOnce({ _avg: { computedScore: 90.0 } });
    mockScheduleCount.mockResolvedValueOnce(5);
    mockAssessmentFindMany.mockResolvedValueOnce([]);
    mockScheduleFindMany.mockResolvedValueOnce([]);

    const response = await GET(new NextRequest('http://localhost/api/dashboard/metrics'));

    expect(response.status).toBe(200);
    expect(mockAthleteCount).toHaveBeenCalledWith({
      where: { academyId: 'acad_1', parentUserId: 'parent_1', deletedAt: null },
    });
    expect(mockAssessmentCount).toHaveBeenCalledWith({
      where: { academyId: 'acad_1', deletedAt: null, athlete: { parentUserId: 'parent_1', deletedAt: null } },
    });
  });

  it('fails closed with 403 if user has no academyId', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'user_1', role: 'admin' });

    const response = await GET(new NextRequest('http://localhost/api/dashboard/metrics'));

    expect(response.status).toBe(403);
  });
});
