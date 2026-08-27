import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { AuthError } from '@/lib/auth/types';
import { UserRole } from '@prisma/client';

const mockVerifyRequestAuth = vi.fn();
const mockRequireRole = vi.fn();
const mockFindMany = vi.fn();
const mockFindUnique = vi.fn();
const mockMembershipUpdate = vi.fn();
const mockMembershipCount = vi.fn();
const mockTransaction = vi.fn();

vi.mock('@/lib/auth/verifyRequestAuth', () => ({
  verifyRequestAuth: (request: Request) => mockVerifyRequestAuth(request),
}));

vi.mock('@/lib/auth/requireRole', () => ({
  requireRole: (user: unknown, roles: unknown) => mockRequireRole(user, roles),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    membership: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockMembershipUpdate(...args),
      count: (...args: unknown[]) => mockMembershipCount(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

describe('/api/users/role authorization rules', () => {
  beforeEach(() => vi.clearAllMocks());

  it('denies non-admin access to the user directory', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'parent_1', role: 'parent', academyId: 'academy_a' });
    mockRequireRole.mockImplementationOnce(() => {
      throw new AuthError('Forbidden: Insufficient role permissions', 403);
    });

    const response = await GET(new NextRequest('http://localhost/api/users/role'));

    expect(response.status).toBe(403);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it('allows admins to fetch the user roster', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'admin_1', role: 'admin', academyId: 'academy_a' });
    mockRequireRole.mockReturnValueOnce(undefined);
    mockFindMany.mockResolvedValueOnce([
      { role: UserRole.ADMIN, user: { id: 'user_1', email: 'admin@example.com', displayName: 'Admin' } },
    ]);

    const response = await GET(new NextRequest('http://localhost/api/users/role'));

    expect(response.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { academyId: 'academy_a' },
      select: {
        role: true,
        user: {
          select: { id: true, email: true, displayName: true },
        },
      },
      orderBy: { user: { createdAt: 'asc' } },
    });
  });

  it('rejects invalid role updates before writing to the database', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'admin_1', role: 'admin', academyId: 'academy_a' });
    mockRequireRole.mockReturnValueOnce(undefined);

    const response = await POST(
      new NextRequest('http://localhost/api/users/role', {
        method: 'POST',
        body: JSON.stringify({ uid: 'user_1', role: 'executive' }),
      })
    );

    expect(response.status).toBe(400);
    expect(mockMembershipUpdate).not.toHaveBeenCalled();
  });

  it('rejects demoting the last admin', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'admin_1', role: 'admin', academyId: 'academy_a' });
    mockRequireRole.mockReturnValueOnce(undefined);
    mockFindUnique.mockResolvedValueOnce({ id: 'mem_1', role: UserRole.ADMIN });
    
    mockTransaction.mockImplementationOnce(async (callback) => {
      const tx = {
        membership: {
          count: mockMembershipCount.mockResolvedValueOnce(1),
          update: mockMembershipUpdate,
        },
      };
      await callback(tx);
    });

    const response = await POST(
      new NextRequest('http://localhost/api/users/role', {
        method: 'POST',
        body: JSON.stringify({ uid: 'admin_1', role: 'parent' }),
      })
    );

    expect(response.status).toBe(409);
    expect(mockMembershipCount).toHaveBeenCalledWith({
      where: { role: UserRole.ADMIN, academyId: 'academy_a' },
    });
    expect(mockMembershipUpdate).not.toHaveBeenCalled();
  });

  it('allows demoting one of two admins', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'admin_1', role: 'admin', academyId: 'academy_a' });
    mockRequireRole.mockReturnValueOnce(undefined);
    mockFindUnique.mockResolvedValueOnce({ id: 'mem_1', role: UserRole.ADMIN });
    
    mockTransaction.mockImplementationOnce(async (callback) => {
      const tx = {
        membership: {
          count: mockMembershipCount.mockResolvedValueOnce(2),
          update: mockMembershipUpdate,
        },
      };
      await callback(tx);
    });
    mockMembershipUpdate.mockResolvedValueOnce({ id: 'mem_1', role: UserRole.PARENT });

    const response = await POST(
      new NextRequest('http://localhost/api/users/role', {
        method: 'POST',
        body: JSON.stringify({ uid: 'admin_1', role: 'parent' }),
      })
    );

    expect(response.status).toBe(200);
    expect(mockMembershipCount).toHaveBeenCalledWith({
      where: { role: UserRole.ADMIN, academyId: 'academy_a' },
    });
    expect(mockMembershipUpdate).toHaveBeenCalledOnce();
  });

  it('allows an admin to self-demote when another admin remains', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'admin_1', role: 'admin', academyId: 'academy_a' });
    mockRequireRole.mockReturnValueOnce(undefined);
    mockFindUnique.mockResolvedValueOnce({ id: 'mem_1', role: UserRole.ADMIN });
    
    mockTransaction.mockImplementationOnce(async (callback) => {
      const tx = {
        membership: {
          count: mockMembershipCount.mockResolvedValueOnce(2),
          update: mockMembershipUpdate,
        },
      };
      await callback(tx);
    });
    mockMembershipUpdate.mockResolvedValueOnce({ id: 'mem_1', role: UserRole.PARENT });

    const response = await POST(
      new NextRequest('http://localhost/api/users/role', {
        method: 'POST',
        body: JSON.stringify({ uid: 'admin_1', role: 'parent' }),
      })
    );

    expect(response.status).toBe(200);
    expect(mockMembershipCount).toHaveBeenCalledWith({
      where: { role: UserRole.ADMIN, academyId: 'academy_a' },
    });
    expect(mockMembershipUpdate).toHaveBeenCalledOnce();
  });

  it('scopes user roster to the caller academy', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'admin_1', role: 'admin', academyId: 'academy_a' });
    mockRequireRole.mockReturnValueOnce(undefined);
    mockFindMany.mockResolvedValueOnce([
      { role: UserRole.ADMIN, user: { id: 'user_1', email: 'user@a.com', displayName: 'A User' } }
    ]);

    const response = await GET(new NextRequest('http://localhost/api/users/role'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { academyId: 'academy_a' }
    }));
    expect(data.users).toHaveLength(1);
    expect(data.users[0].email).toBe('user@a.com');
  });

  it('rejects role changes for users outside the caller academy', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'admin_1', role: 'admin', academyId: 'academy_a' });
    mockRequireRole.mockReturnValueOnce(undefined);
    mockFindUnique.mockResolvedValueOnce(null);

    const response = await POST(
      new NextRequest('http://localhost/api/users/role', {
        method: 'POST',
        body: JSON.stringify({ uid: 'user_b', role: 'coach' }),
      })
    );

    expect(response.status).toBe(404);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: {
        userId_academyId: { userId: 'user_b', academyId: 'academy_a' }
      },
      select: { id: true, role: true }
    });
    expect(mockMembershipUpdate).not.toHaveBeenCalled();
  });

  it('rejects GET when caller has no academyId', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'superadmin', role: 'admin', academyId: undefined });
    mockRequireRole.mockReturnValueOnce(undefined);

    const response = await GET(new NextRequest('http://localhost/api/users/role'));
    
    expect(response.status).toBe(403);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it('rejects POST when caller has no academyId', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'superadmin', role: 'admin', academyId: undefined });
    mockRequireRole.mockReturnValueOnce(undefined);

    const response = await POST(
      new NextRequest('http://localhost/api/users/role', {
        method: 'POST',
        body: JSON.stringify({ uid: 'user_1', role: 'coach' }),
      })
    );
    
    expect(response.status).toBe(403);
    expect(mockFindUnique).not.toHaveBeenCalled();
  });
});
