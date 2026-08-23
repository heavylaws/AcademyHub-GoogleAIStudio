import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from './route';
import { AuthError } from '@/lib/auth/types';

const mockVerifyRequestAuth = vi.fn();
const mockRequireOwnership = vi.fn();
const mockGetAssessmentById = vi.fn();
const mockUpdate = vi.fn();
const mockFindUnique = vi.fn();

vi.mock('@/lib/auth/verifyRequestAuth', () => ({
  verifyRequestAuth: (request: Request) => mockVerifyRequestAuth(request),
}));
vi.mock('@/lib/auth/requireOwnership', () => ({
  requireOwnership: (user: unknown, type: string, id: string) => mockRequireOwnership(user, type, id),
}));
vi.mock('@/services/assessmentService', () => ({
  getAssessmentById: (id: string) => mockGetAssessmentById(id),
}));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    assessment: {
      update: (args: unknown) => mockUpdate(args),
      findUnique: (args: unknown) => mockFindUnique(args),
    },
  },
}));

describe('/api/assessments/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('checks assessment ownership before returning data', async () => {
      const user = { uid: 'parent_1', role: 'parent', academyId: 'acad_1' };
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

  describe('PATCH', () => {
    it('rejects attempt to edit computed_score with 400', async () => {
      mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'coach_1', role: 'coach', academyId: 'acad_1' });
      mockRequireOwnership.mockResolvedValueOnce(undefined);

      const response = await PATCH(
        new NextRequest('http://localhost/api/assessments/asm_1', {
          method: 'PATCH',
          body: JSON.stringify({ computed_score: 95 }),
        }),
        { params: Promise.resolve({ id: 'asm_1' }) }
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain('Score, grade, provenance, athleteId, and academyId fields cannot be modified');
    });

    it('rejects parent modification attempt with 403', async () => {
      mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'parent_1', role: 'parent', academyId: 'acad_1' });
      mockRequireOwnership.mockResolvedValueOnce(undefined);

      const response = await PATCH(
        new NextRequest('http://localhost/api/assessments/asm_1', {
          method: 'PATCH',
          body: JSON.stringify({ coach_notes: 'Updated note' }),
        }),
        { params: Promise.resolve({ id: 'asm_1' }) }
      );

      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.error).toContain('Parents cannot modify assessments');
    });

    it('allows coach to update coach_notes and fault_tags', async () => {
      mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'coach_1', role: 'coach', academyId: 'acad_1' });
      mockRequireOwnership.mockResolvedValueOnce(undefined);
      mockFindUnique.mockResolvedValueOnce({
        qualitativeObservations: { coach_notes: 'Old note' },
        deletedAt: null,
      });
      mockUpdate.mockResolvedValueOnce({});
      mockGetAssessmentById.mockResolvedValueOnce({
        id: 'asm_1',
        coach_notes: 'New note',
      });

      const response = await PATCH(
        new NextRequest('http://localhost/api/assessments/asm_1', {
          method: 'PATCH',
          body: JSON.stringify({ coach_notes: 'New note' }),
        }),
        { params: Promise.resolve({ id: 'asm_1' }) }
      );

      expect(response.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'asm_1' },
        data: {
          qualitativeObservations: { coach_notes: 'New note' },
        },
      });
    });
  });

  describe('DELETE', () => {
    it('denies coach soft-delete request with 403', async () => {
      mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'coach_1', role: 'coach', academyId: 'acad_1' });
      mockRequireOwnership.mockResolvedValueOnce(undefined);

      const response = await DELETE(
        new NextRequest('http://localhost/api/assessments/asm_1', { method: 'DELETE' }),
        { params: Promise.resolve({ id: 'asm_1' }) }
      );

      expect(response.status).toBe(403);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('allows admin to soft-delete assessment with 200', async () => {
      mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'admin_1', role: 'admin', academyId: 'acad_1' });
      mockRequireOwnership.mockResolvedValueOnce(undefined);
      mockUpdate.mockResolvedValueOnce({ id: 'asm_1', deletedAt: new Date() });

      const response = await DELETE(
        new NextRequest('http://localhost/api/assessments/asm_1', { method: 'DELETE' }),
        { params: Promise.resolve({ id: 'asm_1' }) }
      );

      expect(response.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'asm_1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
