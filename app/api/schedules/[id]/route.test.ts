import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from './route';
import { AuthError } from '@/lib/auth/types';

const mockVerifyRequestAuth = vi.fn();
const mockRequireOwnership = vi.fn();
const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();
const mockTransaction = vi.fn();

vi.mock('@/lib/auth/verifyRequestAuth', () => ({
  verifyRequestAuth: (request: Request) => mockVerifyRequestAuth(request),
}));
vi.mock('@/lib/auth/requireOwnership', () => ({
  requireOwnership: (user: unknown, type: string, id: string) => mockRequireOwnership(user, type, id),
}));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    schedule: {
      findUnique: (args: unknown) => mockFindUnique(args),
      update: (args: unknown) => mockUpdate(args),
    },
    $transaction: (cb: any) => mockTransaction(cb),
  },
}));

describe('/api/schedules/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('checks schedule ownership via requireOwnership', async () => {
      mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'user_1', role: 'parent', academyId: 'acad_1' });
      mockRequireOwnership.mockRejectedValueOnce(new AuthError('Resource not found', 404));

      const response = await GET(
        new NextRequest('http://localhost/api/schedules/sch_99'),
        { params: Promise.resolve({ id: 'sch_99' }) }
      );

      expect(response.status).toBe(404);
      expect(mockRequireOwnership).toHaveBeenCalledWith(
        { uid: 'user_1', role: 'parent', academyId: 'acad_1' },
        'schedule',
        'sch_99'
      );
    });
  });

  describe('PATCH', () => {
    it('rejects attempt to modify immutable academyId with 400', async () => {
      mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'coach_1', role: 'coach', academyId: 'acad_1' });
      mockRequireOwnership.mockResolvedValueOnce(undefined);

      const response = await PATCH(
        new NextRequest('http://localhost/api/schedules/sch_1', {
          method: 'PATCH',
          body: JSON.stringify({ academyId: 'acad_OTHER' }),
        }),
        { params: Promise.resolve({ id: 'sch_1' }) }
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain("Field 'academyId' cannot be modified");
    });

    it('rejects parent update attempt with 403', async () => {
      mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'parent_1', role: 'parent', academyId: 'acad_1' });
      mockRequireOwnership.mockResolvedValueOnce(undefined);

      const response = await PATCH(
        new NextRequest('http://localhost/api/schedules/sch_1', {
          method: 'PATCH',
          body: JSON.stringify({ title: 'Parent edit attempt' }),
        }),
        { params: Promise.resolve({ id: 'sch_1' }) }
      );

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE', () => {
    it('denies coach delete request with 403', async () => {
      mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'coach_1', role: 'coach', academyId: 'acad_1' });
      mockRequireOwnership.mockResolvedValueOnce(undefined);

      const response = await DELETE(
        new NextRequest('http://localhost/api/schedules/sch_1', { method: 'DELETE' }),
        { params: Promise.resolve({ id: 'sch_1' }) }
      );

      expect(response.status).toBe(403);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('allows admin to soft delete schedule with 200', async () => {
      mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'admin_1', role: 'admin', academyId: 'acad_1' });
      mockRequireOwnership.mockResolvedValueOnce(undefined);
      mockUpdate.mockResolvedValueOnce({ id: 'sch_1', deletedAt: new Date() });

      const response = await DELETE(
        new NextRequest('http://localhost/api/schedules/sch_1', { method: 'DELETE' }),
        { params: Promise.resolve({ id: 'sch_1' }) }
      );

      expect(response.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'sch_1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
