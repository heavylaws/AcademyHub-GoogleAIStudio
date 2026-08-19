import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { AuthError } from '@/lib/auth/types';

const mockVerifyRequestAuth = vi.fn();
const mockRequireOwnership = vi.fn();
const mockGetAssessmentById = vi.fn();

vi.mock('@/lib/auth/verifyRequestAuth', () => ({ verifyRequestAuth: (request: Request) => mockVerifyRequestAuth(request) }));
vi.mock('@/lib/auth/requireOwnership', () => ({ requireOwnership: (user: unknown, type: string, id: string) => mockRequireOwnership(user, type, id) }));
vi.mock('@/services/assessmentService', () => ({ getAssessmentById: (id: string) => mockGetAssessmentById(id) }));

describe('/api/assessments/[id] GET', () => {
  beforeEach(() => vi.clearAllMocks());

  it('checks assessment ownership before returning data', async () => {
    const user = { uid: 'parent_1', role: 'parent' };
    mockVerifyRequestAuth.mockResolvedValueOnce(user);
    mockRequireOwnership.mockRejectedValueOnce(new AuthError('Forbidden: You do not own this resource', 403));

    const response = await GET(
      new NextRequest('http://localhost/api/assessments/assessment_2'),
      { params: Promise.resolve({ id: 'assessment_2' }) }
    );

    expect(response.status).toBe(403);
    expect(mockRequireOwnership).toHaveBeenCalledWith(user, 'assessment', 'assessment_2');
    expect(mockGetAssessmentById).not.toHaveBeenCalled();
  });
});
