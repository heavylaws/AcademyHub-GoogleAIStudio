import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requirePlatformAdmin } from './requirePlatformAdmin';
import { AuthError } from './types';

const mockGetSession = vi.fn();
const mockUserFindUnique = vi.fn();

vi.mock('@/lib/auth/betterAuth', () => ({
  auth: {
    api: {
      getSession: (args: unknown) => mockGetSession(args),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: (args: unknown) => mockUserFindUnique(args),
    },
  },
}));

describe('requirePlatformAdmin guard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects unauthenticated requests with 401', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const req = new Request('http://localhost/api/platform/academies');
    await expect(requirePlatformAdmin(req)).rejects.toThrow('Missing authentication session');
  });

  it('rejects authenticated users who are not platform admins with 403', async () => {
    mockGetSession.mockResolvedValueOnce({ user: { id: 'user_regular' } });
    mockUserFindUnique.mockResolvedValueOnce({ id: 'user_regular', email: 'regular@example.com', isPlatformAdmin: false });

    const req = new Request('http://localhost/api/platform/academies');
    await expect(requirePlatformAdmin(req)).rejects.toThrow('Forbidden: Platform admin access required');
  });

  it('grants access to authenticated users with isPlatformAdmin: true', async () => {
    mockGetSession.mockResolvedValueOnce({ user: { id: 'user_platform_admin' } });
    mockUserFindUnique.mockResolvedValueOnce({ id: 'user_platform_admin', email: 'padmin@example.com', isPlatformAdmin: true });

    const req = new Request('http://localhost/api/platform/academies');
    const user = await requirePlatformAdmin(req);
    expect(user.uid).toBe('user_platform_admin');
    expect(user.claims.isPlatformAdmin).toBe(true);
  });
});
