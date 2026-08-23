import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { AuthError } from '@/lib/auth/types';

const mockRequirePlatformAdmin = vi.fn();
const mockAcademyFindMany = vi.fn();
const mockAcademyFindUnique = vi.fn();
const mockAcademyCreate = vi.fn();

vi.mock('@/lib/auth/requirePlatformAdmin', () => ({
  requirePlatformAdmin: (req: Request) => mockRequirePlatformAdmin(req),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    academy: {
      findMany: (args: unknown) => mockAcademyFindMany(args),
      findUnique: (args: unknown) => mockAcademyFindUnique(args),
      create: (args: unknown) => mockAcademyCreate(args),
    },
  },
}));

describe('/api/platform/academies routes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects non-platform-admin GET requests with 403', async () => {
    mockRequirePlatformAdmin.mockRejectedValueOnce(
      new AuthError('Forbidden: Platform admin access required', 403),
    );

    const req = new NextRequest('http://localhost/api/platform/academies');
    const res = await GET(req);
    expect(res.status).toBe(403);
    expect(mockAcademyFindMany).not.toHaveBeenCalled();
  });

  it('lists academies with aggregate counts for platform admin', async () => {
    mockRequirePlatformAdmin.mockResolvedValueOnce({ uid: 'padmin_1' });
    mockAcademyFindMany.mockResolvedValueOnce([
      { id: 'acad_1', name: 'Alpha', slug: 'alpha', isActive: true, _count: { memberships: 5, athletes: 10 } },
    ]);

    const req = new NextRequest('http://localhost/api/platform/academies');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.academies).toHaveLength(1);
    expect(mockAcademyFindMany).toHaveBeenCalledOnce();
  });

  it('allows platform admin to create a new academy', async () => {
    mockRequirePlatformAdmin.mockResolvedValueOnce({ uid: 'padmin_1' });
    mockAcademyFindUnique.mockResolvedValueOnce(null);
    mockAcademyCreate.mockResolvedValueOnce({ id: 'acad_new', name: 'New Academy', slug: 'new-acad', isActive: true });

    const req = new NextRequest('http://localhost/api/platform/academies', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Academy', slug: 'new-acad' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(mockAcademyCreate).toHaveBeenCalledOnce();
  });
});
