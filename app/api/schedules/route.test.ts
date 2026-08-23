import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { AuthError } from '@/lib/auth/types';

const mockVerifyRequestAuth = vi.fn();
const mockRequireRole = vi.fn();
const mockFindMany = vi.fn();
const mockCreate = vi.fn();
const mockTransaction = vi.fn();

vi.mock('@/lib/auth/verifyRequestAuth', () => ({
  verifyRequestAuth: (request: Request) => mockVerifyRequestAuth(request),
}));
vi.mock('@/lib/auth/requireRole', () => ({
  requireRole: (user: unknown, roles: string[]) => mockRequireRole(user, roles),
}));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    schedule: {
      findMany: (args: unknown) => mockFindMany(args),
      create: (args: unknown) => mockCreate(args),
    },
    $transaction: (cb: any) => mockTransaction(cb),
  },
}));

describe('/api/schedules collection routes', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET', () => {
    it('scopes list requests to caller academyId', async () => {
      mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'user_1', role: 'coach', academyId: 'acad_1' });
      mockFindMany.mockResolvedValueOnce([]);

      const response = await GET(new NextRequest('http://localhost/api/schedules'));

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { academyId: 'acad_1', deletedAt: null },
        })
      );
    });

    it('fails closed with 403 if !user.academyId', async () => {
      mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'user_1', role: 'coach' });

      const response = await GET(new NextRequest('http://localhost/api/schedules'));

      expect(response.status).toBe(403);
    });
  });

  describe('POST', () => {
    it('uses academyId from user session and ignores body academyId', async () => {
      mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'coach_1', role: 'coach', academyId: 'acad_1' });
      mockTransaction.mockImplementationOnce(async (cb: any) => {
        const tx = {
          schedule: {
            findMany: vi.fn().mockResolvedValue([]),
            create: vi.fn().mockImplementation((args: any) => Promise.resolve({ id: 'sch_1', ...args.data })),
          },
        };
        return cb(tx);
      });

      const response = await POST(
        new NextRequest('http://localhost/api/schedules', {
          method: 'POST',
          body: JSON.stringify({
            title: 'Court Drill',
            sport: 'Basketball',
            facility: 'Court A',
            coachName: 'Coach Taylor',
            date: '2026-09-01',
            timeSlot: '14:00 - 15:30',
            maxCapacity: 20,
            academyId: 'acad_OTHER_HACKED',
          }),
        })
      );

      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.schedule.academyId).toBe('acad_1');
    });

    it('returns 409 Conflict when coach double-booking occurs inside transaction', async () => {
      mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'coach_1', role: 'coach', academyId: 'acad_1' });
      mockTransaction.mockImplementationOnce(async (cb: any) => {
        const tx = {
          schedule: {
            findMany: vi.fn().mockResolvedValue([
              {
                id: 'sch_existing',
                title: 'Existing Session',
                facility: 'Court B',
                coachName: 'Coach Taylor',
                date: '2026-09-01',
                timeSlot: '14:00 - 15:30',
              },
            ]),
          },
        };
        return cb(tx);
      });

      const response = await POST(
        new NextRequest('http://localhost/api/schedules', {
          method: 'POST',
          body: JSON.stringify({
            title: 'New Session',
            sport: 'Basketball',
            facility: 'Court A',
            coachName: 'Coach Taylor',
            date: '2026-09-01',
            timeSlot: '14:30 - 16:00',
            maxCapacity: 20,
          }),
        })
      );

      expect(response.status).toBe(409);
      const json = await response.json();
      expect(json.conflictType).toBe('COACH_OVERLAP');
    });

    it('rejects invalid date format with 400', async () => {
      mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'coach_1', role: 'coach', academyId: 'acad_1' });

      const response = await POST(
        new NextRequest('http://localhost/api/schedules', {
          method: 'POST',
          body: JSON.stringify({
            title: 'Drill',
            sport: 'Basketball',
            facility: 'Court A',
            coachName: 'Coach Taylor',
            date: 'not-a-date',
            timeSlot: '14:00 - 15:30',
          }),
        })
      );

      expect(response.status).toBe(400);
    });

    it('rejects negative capacity with 400', async () => {
      mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'coach_1', role: 'coach', academyId: 'acad_1' });

      const response = await POST(
        new NextRequest('http://localhost/api/schedules', {
          method: 'POST',
          body: JSON.stringify({
            title: 'Drill',
            sport: 'Basketball',
            facility: 'Court A',
            coachName: 'Coach Taylor',
            date: '2026-09-01',
            timeSlot: '14:00 - 15:30',
            maxCapacity: -5,
          }),
        })
      );

      expect(response.status).toBe(400);
    });
  });
});
