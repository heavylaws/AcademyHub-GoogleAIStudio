import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { AuthError } from '@/lib/auth/types';

const mockVerifyRequestAuth = vi.fn();
const mockRequireOwnership = vi.fn();
const mockFindUnique = vi.fn();

vi.mock('@/lib/auth/verifyRequestAuth', () => ({
  verifyRequestAuth: (request: Request) => mockVerifyRequestAuth(request),
}));
vi.mock('@/lib/auth/requireOwnership', () => ({
  requireOwnership: (user: unknown, type: string, id: string) => mockRequireOwnership(user, type, id),
}));
vi.mock('@/lib/prisma', () => ({
  prisma: { athlete: { findUnique: (args: unknown) => mockFindUnique(args) } },
}));

describe('/api/athletes/[id] GET', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not return an athlete when ownership fails', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'parent_1', role: 'parent' });
    mockRequireOwnership.mockRejectedValueOnce(new AuthError('Forbidden: You do not own this resource', 403));

    const response = await GET(
      new NextRequest('http://localhost/api/athletes/athlete_2'),
      { params: Promise.resolve({ id: 'athlete_2' }) }
    );

    expect(response.status).toBe(403);
    expect(mockRequireOwnership).toHaveBeenCalledWith({ uid: 'parent_1', role: 'parent' }, 'athlete', 'athlete_2');
    expect(mockFindUnique).not.toHaveBeenCalled();
  });
});
