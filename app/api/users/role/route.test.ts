import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { AuthError } from '@/lib/auth/types';

const mockVerifyRequestAuth = vi.fn();
const mockRequireRole = vi.fn();
const mockFindMany = vi.fn();
const mockUserUpdate = vi.fn();

vi.mock('@/lib/auth/verifyRequestAuth', () => ({
  verifyRequestAuth: (request: Request) => mockVerifyRequestAuth(request),
}));

vi.mock('@/lib/auth/requireRole', () => ({
  requireRole: (user: unknown, roles: unknown) => mockRequireRole(user, roles),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      update: (...args: unknown[]) => mockUserUpdate(...args),
    },
  },
}));

describe('/api/users/role authorization rules', () => {
  beforeEach(() => vi.clearAllMocks());

  it('denies non-admin access to the user directory', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'parent_1', role: 'parent' });
    mockRequireRole.mockImplementationOnce(() => {
      throw new AuthError('Forbidden: Insufficient role permissions', 403);
    });

    const response = await GET(new NextRequest('http://localhost/api/users/role'));

    expect(response.status).toBe(403);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it('allows admins to fetch the user roster', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'admin_1', role: 'admin' });
    mockRequireRole.mockReturnValueOnce(undefined);
    mockFindMany.mockResolvedValueOnce([
      { id: 'user_1', email: 'admin@example.com', displayName: 'Admin', role: 'ADMIN' },
    ]);

    const response = await GET(new NextRequest('http://localhost/api/users/role'));

    expect(response.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledOnce();
  });

  it('rejects invalid role updates before writing to the database', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'admin_1', role: 'admin' });
    mockRequireRole.mockReturnValueOnce(undefined);

    const response = await POST(
      new NextRequest('http://localhost/api/users/role', {
        method: 'POST',
        body: JSON.stringify({ uid: 'user_1', role: 'executive' }),
      })
    );

    expect(response.status).toBe(400);
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });
});
