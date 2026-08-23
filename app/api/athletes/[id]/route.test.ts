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
    athlete: {
      findUnique: (args: unknown) => mockFindUnique(args),
      update: (args: unknown) => mockUpdate(args),
    },
    athleteSport: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: (args: unknown) => mockTransaction(args),
  },
}));

describe('/api/athletes/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('does not return an athlete when ownership fails', async () => {
      mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'parent_1', role: 'parent', academyId: 'acad_1' });
      mockRequireOwnership.mockRejectedValueOnce(new AuthError('Forbidden: You do not own this resource', 403));

      const response = await GET(
        new NextRequest('http://localhost/api/athletes/athlete_2'),
        { params: Promise.resolve({ id: 'athlete_2' }) }
      );

      expect(response.status).toBe(403);
      expect(mockRequireOwnership).toHaveBeenCalledWith(
        { uid: 'parent_1', role: 'parent', academyId: 'acad_1' },
        'athlete',
        'athlete_2'
      );
      expect(mockFindUnique).not.toHaveBeenCalled();
    });

    it('returns 404 for soft-deleted athlete', async () => {
      mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'admin_1', role: 'admin', academyId: 'acad_1' });
      mockRequireOwnership.mockResolvedValueOnce(undefined);
      mockFindUnique.mockResolvedValueOnce({
        id: 'ath_1',
        name: 'Alex',
        deletedAt: new Date(),
      });

      const response = await GET(
        new NextRequest('http://localhost/api/athletes/ath_1'),
        { params: Promise.resolve({ id: 'ath_1' }) }
      );

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH', () => {
    it('rejects attempt to modify immutable academyId with 400', async () => {
      mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'admin_1', role: 'admin', academyId: 'acad_1' });
      mockRequireOwnership.mockResolvedValueOnce(undefined);

      const response = await PATCH(
        new NextRequest('http://localhost/api/athletes/ath_1', {
          method: 'PATCH',
          body: JSON.stringify({ academyId: 'acad_other' }),
        }),
        { params: Promise.resolve({ id: 'ath_1' }) }
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain("Field 'academyId' cannot be modified");
    });

    it('rejects parent update on restricted field name with 403', async () => {
      mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'parent_1', role: 'parent', academyId: 'acad_1' });
      mockRequireOwnership.mockResolvedValueOnce(undefined);

      const response = await PATCH(
        new NextRequest('http://localhost/api/athletes/ath_1', {
          method: 'PATCH',
          body: JSON.stringify({ name: 'New Name' }),
        }),
        { params: Promise.resolve({ id: 'ath_1' }) }
      );

      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.error).toContain('Parents can only update emergencyContact and parentEmail');
    });

    it('allows parent to update emergencyContact and parentEmail', async () => {
      mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'parent_1', role: 'parent', academyId: 'acad_1' });
      mockRequireOwnership.mockResolvedValueOnce(undefined);
      mockUpdate.mockResolvedValueOnce({});
      mockFindUnique.mockResolvedValueOnce({
        id: 'ath_1',
        name: 'Alex',
        dob: '2015-05-10',
        parentUserId: 'parent_1',
        parentEmail: 'updated@example.com',
        emergencyContact: '+15559998888',
        guardianConsent: true,
        deletedAt: null,
        sports: [],
        parent: { displayName: 'Parent' },
      });

      const response = await PATCH(
        new NextRequest('http://localhost/api/athletes/ath_1', {
          method: 'PATCH',
          body: JSON.stringify({ emergencyContact: '+15559998888', parentEmail: 'updated@example.com' }),
        }),
        { params: Promise.resolve({ id: 'ath_1' }) }
      );

      expect(response.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'ath_1' },
        data: { emergencyContact: '+15559998888', parentEmail: 'updated@example.com' },
      });
    });

    it('rejects invalid dob with 400', async () => {
      mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'admin_1', role: 'admin', academyId: 'acad_1' });
      mockRequireOwnership.mockResolvedValueOnce(undefined);

      const response = await PATCH(
        new NextRequest('http://localhost/api/athletes/ath_1', {
          method: 'PATCH',
          body: JSON.stringify({ dob: 'not-a-date' }),
        }),
        { params: Promise.resolve({ id: 'ath_1' }) }
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain('Invalid date of birth');
    });

    it('rejects oversized name with 400', async () => {
      mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'admin_1', role: 'admin', academyId: 'acad_1' });
      mockRequireOwnership.mockResolvedValueOnce(undefined);

      const response = await PATCH(
        new NextRequest('http://localhost/api/athletes/ath_1', {
          method: 'PATCH',
          body: JSON.stringify({ name: 'a'.repeat(101) }),
        }),
        { params: Promise.resolve({ id: 'ath_1' }) }
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain('Invalid name');
    });
  });

  describe('DELETE', () => {
    it('denies coach soft-delete request with 403', async () => {
      mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'coach_1', role: 'coach', academyId: 'acad_1' });
      mockRequireOwnership.mockResolvedValueOnce(undefined);

      const response = await DELETE(
        new NextRequest('http://localhost/api/athletes/ath_1', { method: 'DELETE' }),
        { params: Promise.resolve({ id: 'ath_1' }) }
      );

      expect(response.status).toBe(403);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('allows admin to soft-delete athlete with 200', async () => {
      mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'admin_1', role: 'admin', academyId: 'acad_1' });
      mockRequireOwnership.mockResolvedValueOnce(undefined);
      mockUpdate.mockResolvedValueOnce({ id: 'ath_1', deletedAt: new Date() });

      const response = await DELETE(
        new NextRequest('http://localhost/api/athletes/ath_1', { method: 'DELETE' }),
        { params: Promise.resolve({ id: 'ath_1' }) }
      );

      expect(response.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'ath_1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
