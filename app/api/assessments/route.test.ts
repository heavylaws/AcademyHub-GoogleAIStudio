import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { AuthError } from '@/lib/auth/types';

const mockVerifyRequestAuth = vi.fn();
const mockRequireRole = vi.fn();
const mockEnsureUserRecord = vi.fn();
const mockListAssessmentsForUser = vi.fn();
const mockCreateAssessment = vi.fn();
const mockAthleteFindUnique = vi.fn();

vi.mock('@/lib/auth/verifyRequestAuth', () => ({ verifyRequestAuth: (request: Request) => mockVerifyRequestAuth(request) }));
vi.mock('@/lib/auth/requireRole', () => ({ requireRole: (user: unknown, roles: unknown) => mockRequireRole(user, roles) }));
vi.mock('@/lib/auth/ensureUserRecord', () => ({ ensureUserRecord: (user: unknown) => mockEnsureUserRecord(user) }));
vi.mock('@/lib/prisma', () => ({ prisma: { athlete: { findUnique: (args: unknown) => mockAthleteFindUnique(args) } } }));
vi.mock('@/services/assessmentService', () => ({
  listAssessmentsForUser: (uid: string, academyId: string, role?: string) => mockListAssessmentsForUser(uid, academyId, role),
  createAssessment: (input: unknown, uid: string) => mockCreateAssessment(input, uid),
}));

describe('/api/assessments collection routes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the athlete join scope for parent list requests', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'parent_1', role: 'parent', academyId: 'acad_1' });
    mockListAssessmentsForUser.mockResolvedValueOnce([]);

    const response = await GET(new NextRequest('http://localhost/api/assessments'));

    expect(response.status).toBe(200);
    expect(mockListAssessmentsForUser).toHaveBeenCalledWith('parent_1', 'acad_1', 'parent');
  });

  it('fails closed with 403 if !user.academyId', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'parent_1', role: 'parent' });

    const response = await GET(new NextRequest('http://localhost/api/assessments'));

    expect(response.status).toBe(403);
  });

  it('rejects unauthenticated requests before querying', async () => {
    mockVerifyRequestAuth.mockRejectedValueOnce(new AuthError('Missing authentication session', 401));
    const response = await GET(new NextRequest('http://localhost/api/assessments'));
    expect(response.status).toBe(401);
    expect(mockListAssessmentsForUser).not.toHaveBeenCalled();
  });

  it('allows only coaches and admins to create assessments', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'parent_1', role: 'parent' });
    mockRequireRole.mockImplementationOnce(() => { throw new AuthError('Forbidden: Insufficient role permissions', 403); });

    const response = await POST(new NextRequest('http://localhost/api/assessments', {
      method: 'POST',
      body: JSON.stringify({}),
    }));

    expect(response.status).toBe(403);
    expect(mockEnsureUserRecord).not.toHaveBeenCalled();
  });

  it('validates the athlete before creating an assessment', async () => {
    const coach = { uid: 'coach_1', email: 'coach@example.com', role: 'coach', academyId: 'acad_1' };
    mockVerifyRequestAuth.mockResolvedValueOnce(coach);
    mockEnsureUserRecord.mockResolvedValueOnce(undefined);
    mockAthleteFindUnique.mockResolvedValueOnce(null);

    const response = await POST(new NextRequest('http://localhost/api/assessments', {
      method: 'POST',
      body: JSON.stringify({ athlete_id: 'missing_athlete' }),
    }));

    expect(response.status).toBe(400);
    expect(mockCreateAssessment).not.toHaveBeenCalled();
  });

  it('rejects computed_score and data_source on manual creation with 400', async () => {
    const coach = { uid: 'coach_1', email: 'coach@example.com', role: 'coach', academyId: 'acad_1' };
    mockVerifyRequestAuth.mockResolvedValueOnce(coach);

    const response = await POST(new NextRequest('http://localhost/api/assessments', {
      method: 'POST',
      body: JSON.stringify({ athlete_id: 'ath_1', computed_score: 95, data_source: 'ai_agentic' }),
    }));

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain('cannot be specified on manual assessment creation');
    expect(mockCreateAssessment).not.toHaveBeenCalled();
  });
});
