import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { AuthError } from '@/lib/auth/types';

const mockVerifyRequestAuth = vi.fn();
const mockRequireRole = vi.fn();
const mockEnsureUserRecord = vi.fn();
const mockFindMany = vi.fn();
const mockCreate = vi.fn();
const mockFindUser = vi.fn();

vi.mock('@/lib/auth/verifyRequestAuth', () => ({
  verifyRequestAuth: (request: Request) => mockVerifyRequestAuth(request),
}));
vi.mock('@/lib/auth/requireRole', () => ({
  requireRole: (user: unknown, roles: unknown) => mockRequireRole(user, roles),
}));
vi.mock('@/lib/auth/ensureUserRecord', () => ({
  ensureUserRecord: (user: unknown) => mockEnsureUserRecord(user),
}));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    athlete: { findMany: (args: unknown) => mockFindMany(args), create: (args: unknown) => mockCreate(args) },
    user: { findUnique: (args: unknown) => mockFindUser(args) },
  },
}));

describe('/api/athletes collection routes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('filters parent lists by authenticated UID at the Prisma query boundary', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'parent_1', role: 'parent', academyId: 'acad_1' });
    mockFindMany.mockResolvedValueOnce([]);

    const response = await GET(new NextRequest('http://localhost/api/athletes'));

    expect(response.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { academyId: 'acad_1', parentUserId: 'parent_1', deletedAt: null } }));
  });

  it('fails closed with 403 if !user.academyId on GET', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'parent_1', role: 'parent' });

    const response = await GET(new NextRequest('http://localhost/api/athletes'));

    expect(response.status).toBe(403);
  });

  it('rejects athlete creation for non-coaches before provisioning or writing', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'parent_1', role: 'parent', academyId: 'acad_1' });
    mockRequireRole.mockImplementationOnce(() => {
      throw new AuthError('Forbidden: Insufficient role permissions', 403);
    });

    const response = await POST(new NextRequest('http://localhost/api/athletes', {
      method: 'POST',
      body: JSON.stringify({}),
    }));

    expect(response.status).toBe(403);
    expect(mockEnsureUserRecord).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('provisions the caller and creates an athlete for an existing target parent UID', async () => {
    const coach = { uid: 'coach_1', email: 'coach@example.com', role: 'coach', academyId: 'acad_1' };
    mockVerifyRequestAuth.mockResolvedValueOnce(coach);
    mockEnsureUserRecord.mockResolvedValueOnce(undefined);
    mockFindUser.mockResolvedValueOnce({ id: 'parent_1' });
    mockCreate.mockResolvedValueOnce({
      id: 'athlete_1',
      name: 'Athlete One',
      dob: '2012-01-15',
      parentUserId: 'parent_1',
      parentEmail: 'parent@example.com',
      emergencyContact: null,
      guardianConsent: true,
      sports: [{ sport: 'Football' }],
      parent: { displayName: 'Parent One' },
    });

    const response = await POST(new NextRequest('http://localhost/api/athletes', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Athlete One',
        parentUserId: 'parent_1',
        parentEmail: 'parent@example.com',
        sports: [{ sport: 'Football' }],
      }),
    }));

    expect(response.status).toBe(201);
    expect(mockEnsureUserRecord).toHaveBeenCalledWith(coach);
    expect(mockFindUser).toHaveBeenCalledWith({ where: { id: 'parent_1' } });
    expect(mockCreate).toHaveBeenCalledOnce();
  });

  it('rejects athlete creation when user has no academy context', async () => {
    const coachNoAcademy = { uid: 'coach_2', email: 'coach2@example.com', role: 'coach' };
    mockVerifyRequestAuth.mockResolvedValueOnce(coachNoAcademy);
    mockEnsureUserRecord.mockResolvedValueOnce(undefined);
    mockFindUser.mockResolvedValueOnce({ id: 'parent_1' });

    const response = await POST(new NextRequest('http://localhost/api/athletes', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Athlete Two',
        parentUserId: 'parent_1',
        parentEmail: 'parent@example.com',
      }),
    }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/academy/);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
