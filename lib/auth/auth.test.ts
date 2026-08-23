import { beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyRequestAuth } from './verifyRequestAuth';
import { requireRole, hasRole } from './requireRole';
import { requireOwnership } from './requireOwnership';
import { AuthUser, AuthError } from './types';

const mockGetSession = vi.fn();
const mockUserFindUnique = vi.fn();
const mockUserCreate = vi.fn();
const mockUserUpdate = vi.fn();
const mockUserUpsert = vi.fn();

vi.mock('./betterAuth', () => ({
  auth: {
    api: {
      getSession: (args: unknown) => mockGetSession(args),
    },
  },
}));

const mockAthleteFindUnique = vi.fn();
const mockInvoiceFindUnique = vi.fn();
const mockAssessmentFindUnique = vi.fn();
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      create: (...args: unknown[]) => mockUserCreate(...args),
      update: (...args: unknown[]) => mockUserUpdate(...args),
      upsert: (...args: unknown[]) => mockUserUpsert(...args),
    },
    athlete: {
      findUnique: (...args: unknown[]) => mockAthleteFindUnique(...args),
    },
    invoice: {
      findUnique: (...args: unknown[]) => mockInvoiceFindUnique(...args),
    },
    assessment: {
      findUnique: (...args: unknown[]) => mockAssessmentFindUnique(...args),
    },
  },
}));

describe('Authorization middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('verifyRequestAuth', () => {
    it('returns the authoritative user for a valid Better Auth session cookie', async () => {
      mockGetSession.mockResolvedValueOnce({
        user: { id: 'user_parent_123' },
      });
      mockUserFindUnique.mockResolvedValueOnce({
        id: 'user_parent_123',
        email: 'parent@example.com',
        memberships: [{ role: 'PARENT', academyId: 'acad_1' }],
      });

      const request = new Request('http://localhost:3000/api/test', {
        headers: { Cookie: 'better-auth.session_token=valid_session_123' },
      });

      const user = await verifyRequestAuth(request);
      expect(user).toEqual({
        uid: 'user_parent_123',
        email: 'parent@example.com',
        role: 'parent',
        academyId: 'acad_1',
        claims: { role: 'parent' },
      });
      expect(mockGetSession).toHaveBeenCalledWith({ headers: request.headers });
      expect(mockUserFindUnique).toHaveBeenCalledWith({
        where: { id: 'user_parent_123' },
        select: {
          id: true,
          email: true,
          memberships: {
            select: { role: true, academyId: true },
          },
        },
      });
    });

    it('rejects with AuthError 401 when no session cookie resolves to a user', async () => {
      mockGetSession.mockResolvedValueOnce(null);

      const request = new Request('http://localhost:3000/api/test');

      await expect(verifyRequestAuth(request)).rejects.toMatchObject({
        message: 'Missing authentication session',
        statusCode: 401,
      });
    });

    it('rejects with AuthError 401 when the session is expired or invalid', async () => {
      mockGetSession.mockRejectedValueOnce(new Error('session expired'));

      const request = new Request('http://localhost:3000/api/test', {
        headers: { Cookie: 'better-auth.session_token=expired_session' },
      });

      await expect(verifyRequestAuth(request)).rejects.toMatchObject({
        message: 'Invalid or expired authentication session',
        statusCode: 401,
      });
    });

    it('rejects with AuthError 401 when the session user has no authoritative database row', async () => {
      mockGetSession.mockResolvedValueOnce({
        user: { id: 'deleted_user_123' },
      });
      mockUserFindUnique.mockResolvedValueOnce(null);

      await expect(verifyRequestAuth(new Request('http://localhost:3000/api/test'))).rejects.toMatchObject({
        message: 'Authenticated user was not found',
        statusCode: 401,
      });
    });

    it('preserves an existing role across repeated session verification without provisioning another user', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'coach_123' },
      });
      mockUserFindUnique.mockResolvedValue({
        id: 'coach_123',
        email: 'coach@example.com',
        memberships: [{ role: 'COACH', academyId: 'acad_1' }],
      });

      const request = new Request('http://localhost:3000/api/test', {
        headers: { Cookie: 'better-auth.session_token=repeat_session' },
      });

      await expect(verifyRequestAuth(request)).resolves.toMatchObject({ role: 'coach' });
      await expect(verifyRequestAuth(request)).resolves.toMatchObject({ role: 'coach' });

      expect(mockUserFindUnique).toHaveBeenCalledTimes(2);
      expect(mockUserCreate).not.toHaveBeenCalled();
      expect(mockUserUpdate).not.toHaveBeenCalled();
      expect(mockUserUpsert).not.toHaveBeenCalled();
    });

    it('returns undefined role and academyId when user has no memberships', async () => {
      mockGetSession.mockResolvedValueOnce({
        user: { id: 'unattached_1' },
      });
      mockUserFindUnique.mockResolvedValueOnce({
        id: 'unattached_1',
        email: 'new@example.com',
        memberships: [],
      });

      const request = new Request('http://localhost:3000/api/test', {
        headers: { Cookie: 'better-auth.session_token=unattached_session' },
      });

      const user = await verifyRequestAuth(request);
      expect(user.uid).toBe('unattached_1');
      expect(user.role).toBeUndefined();
      expect(user.academyId).toBeUndefined();
    });

    it('throws AuthError 403 when user has multiple memberships', async () => {
      mockGetSession.mockResolvedValueOnce({
        user: { id: 'multi_1' },
      });
      mockUserFindUnique.mockResolvedValueOnce({
        id: 'multi_1',
        email: 'multi@example.com',
        memberships: [
          { role: 'ADMIN', academyId: 'acad_1' },
          { role: 'PARENT', academyId: 'acad_2' },
        ],
      });

      const request = new Request('http://localhost:3000/api/test', {
        headers: { Cookie: 'better-auth.session_token=multi_session' },
      });

      await expect(verifyRequestAuth(request)).rejects.toMatchObject({
        message: 'Multiple academy memberships found. An active-academy selector is required to resolve tenant context.',
        statusCode: 403,
      });
    });

    it('zero-membership user is rejected by requireRole downstream', async () => {
      mockGetSession.mockResolvedValueOnce({
        user: { id: 'unattached_2' },
      });
      mockUserFindUnique.mockResolvedValueOnce({
        id: 'unattached_2',
        email: 'unattached2@example.com',
        memberships: [],
      });

      const request = new Request('http://localhost:3000/api/test', {
        headers: { Cookie: 'better-auth.session_token=unattached2_session' },
      });

      const user = await verifyRequestAuth(request);
      expect(() => requireRole(user, ['parent', 'coach', 'admin'])).toThrow(
        'Forbidden: Insufficient role permissions',
      );
    });
  });

  describe('requireRole', () => {
    it('allows access when user role matches single allowed role', () => {
      const user: AuthUser = { uid: 'user_1', role: 'admin', claims: { role: 'admin' } };
      expect(() => requireRole(user, ['admin'])).not.toThrow();
    });

    it('allows access when user role matches any allowed role in list', () => {
      const coachUser: AuthUser = { uid: 'user_2', role: 'coach', claims: { role: 'coach' } };
      expect(() => requireRole(coachUser, ['admin', 'coach'])).not.toThrow();
      expect(hasRole(coachUser, ['admin', 'coach'])).toBe(true);
    });

    it('rejects with AuthError 403 when user role is not in allowed roles', () => {
      const parentUser: AuthUser = { uid: 'user_3', role: 'parent', claims: { role: 'parent' } };
      expect(() => requireRole(parentUser, ['admin', 'coach'])).toThrow(AuthError);
      expect(() => requireRole(parentUser, ['admin', 'coach'])).toThrow('Forbidden: Insufficient role permissions');
      expect(hasRole(parentUser, ['admin', 'coach'])).toBe(false);
    });

    it('rejects with AuthError 403 when role is missing or invalid', () => {
      const noRoleUser: AuthUser = { uid: 'user_4', claims: {} };
      expect(() => requireRole(noRoleUser, ['parent'])).toThrow('Forbidden: Insufficient role permissions');

      const invalidRoleUser: AuthUser = { uid: 'user_5', role: 123 as any, claims: {} };
      expect(() => requireRole(invalidRoleUser, ['parent'])).toThrow('Forbidden: Insufficient role permissions');
    });

    it('never consults database or fallback resolution for role', () => {
      const parentUser: AuthUser = { uid: 'user_3', role: 'parent', claims: { role: 'parent' } };
      requireRole(parentUser, ['parent']);
      expect(mockAthleteFindUnique).not.toHaveBeenCalled();
      expect(mockInvoiceFindUnique).not.toHaveBeenCalled();
      expect(mockUserFindUnique).not.toHaveBeenCalled();
    });
  });

  describe('requireOwnership', () => {
    it('allows parent user who owns the athlete resource', async () => {
      mockAthleteFindUnique.mockResolvedValueOnce({ academyId: 'acad_test', parentUserId: 'parent_uid_100' });
      const parentUser: AuthUser = { uid: 'parent_uid_100', role: 'parent', academyId: 'acad_test', claims: { role: 'parent' } };

      await expect(requireOwnership(parentUser, 'athlete', 'ath_8042')).resolves.not.toThrow();
      expect(mockAthleteFindUnique).toHaveBeenCalledWith({
        where: { id: 'ath_8042' },
        select: { academyId: true, parentUserId: true, deletedAt: true },
      });
    });

    it('rejects parent user who does not own the athlete resource', async () => {
      mockAthleteFindUnique.mockResolvedValueOnce({ academyId: 'acad_test', parentUserId: 'other_parent_uid' });
      const parentUser: AuthUser = { uid: 'parent_uid_100', role: 'parent', academyId: 'acad_test', claims: { role: 'parent' } };

      await expect(requireOwnership(parentUser, 'athlete', 'ath_8042')).rejects.toThrow(
        'Forbidden: You do not own this resource'
      );
    });

    it('allows parent user who owns the invoice resource', async () => {
      mockInvoiceFindUnique.mockResolvedValueOnce({ academyId: 'acad_test', parentUserId: 'parent_uid_100' });
      const parentUser: AuthUser = { uid: 'parent_uid_100', role: 'parent', academyId: 'acad_test', claims: { role: 'parent' } };

      await expect(requireOwnership(parentUser, 'invoice', 'INV-8042')).resolves.not.toThrow();
      expect(mockInvoiceFindUnique).toHaveBeenCalledWith({
        where: { id: 'INV-8042' },
        select: { academyId: true, parentUserId: true },
      });
    });

    it('rejects parent user who does not own the invoice resource', async () => {
      mockInvoiceFindUnique.mockResolvedValueOnce({ academyId: 'acad_test', parentUserId: 'other_parent_uid' });
      const parentUser: AuthUser = { uid: 'parent_uid_100', role: 'parent', academyId: 'acad_test', claims: { role: 'parent' } };

      await expect(requireOwnership(parentUser, 'invoice', 'INV-8042')).rejects.toThrow(
        'Forbidden: You do not own this resource'
      );
    });

    it('allows parent user who owns an assessment through its athlete', async () => {
      mockAssessmentFindUnique.mockResolvedValueOnce({ academyId: 'acad_test', athlete: { parentUserId: 'parent_uid_100' } });
      const parentUser: AuthUser = { uid: 'parent_uid_100', role: 'parent', academyId: 'acad_test', claims: { role: 'parent' } };

      await expect(requireOwnership(parentUser, 'assessment', 'asm_8042')).resolves.not.toThrow();
      expect(mockAssessmentFindUnique).toHaveBeenCalledWith({
        where: { id: 'asm_8042' },
        select: {
          academyId: true,
          deletedAt: true,
          athlete: { select: { parentUserId: true, deletedAt: true } },
        },
      });
    });

    it('rejects a parent who does not own an assessment through its athlete', async () => {
      mockAssessmentFindUnique.mockResolvedValueOnce({ academyId: 'acad_test', athlete: { parentUserId: 'other_parent_uid' } });
      const parentUser: AuthUser = { uid: 'parent_uid_100', role: 'parent', academyId: 'acad_test', claims: { role: 'parent' } };

      await expect(requireOwnership(parentUser, 'assessment', 'asm_8042')).rejects.toThrow(
        'Forbidden: You do not own this resource'
      );
    });

    it('allows coach and admin roles to bypass ownership checks', async () => {
      mockAthleteFindUnique.mockResolvedValueOnce({ academyId: 'acad_test', parentUserId: 'parent_999' });
      mockInvoiceFindUnique.mockResolvedValueOnce({ academyId: 'acad_test', parentUserId: 'parent_999' });
      mockAssessmentFindUnique.mockResolvedValueOnce({ academyId: 'acad_test', athlete: { parentUserId: 'parent_999' } });

      const coachUser: AuthUser = { uid: 'coach_uid_1', role: 'coach', academyId: 'acad_test', claims: { role: 'coach' } };
      const adminUser: AuthUser = { uid: 'admin_uid_1', role: 'admin', academyId: 'acad_test', claims: { role: 'admin' } };

      await expect(requireOwnership(coachUser, 'athlete', 'ath_8042')).resolves.not.toThrow();
      await expect(requireOwnership(adminUser, 'invoice', 'INV-8042')).resolves.not.toThrow();
      await expect(requireOwnership(coachUser, 'assessment', 'asm_8042')).resolves.not.toThrow();
    });

    it('rejects when an assessment is not found', async () => {
      mockAssessmentFindUnique.mockResolvedValueOnce(null);
      const parentUser: AuthUser = { uid: 'parent_uid_100', role: 'parent', academyId: 'acad_test', claims: { role: 'parent' } };

      await expect(requireOwnership(parentUser, 'assessment', 'asm_nonexistent')).rejects.toMatchObject({
        statusCode: 404,
        message: 'Resource not found',
      });
    });

    it('fails closed when the assessment ownership join errors', async () => {
      mockAssessmentFindUnique.mockRejectedValueOnce(new Error('Postgres connection pool error'));
      const parentUser: AuthUser = { uid: 'parent_uid_100', role: 'parent', academyId: 'acad_test', claims: { role: 'parent' } };

      await expect(requireOwnership(parentUser, 'assessment', 'asm_8042')).rejects.toThrow(
        'Forbidden: Resource ownership check failed'
      );
    });

    it('rejects when target resource is not found in database', async () => {
      mockAthleteFindUnique.mockResolvedValueOnce(null);
      const parentUser: AuthUser = { uid: 'parent_uid_100', role: 'parent', academyId: 'acad_test', claims: { role: 'parent' } };

      await expect(requireOwnership(parentUser, 'athlete', 'ath_nonexistent')).rejects.toMatchObject({
        statusCode: 404,
        message: 'Resource not found',
      });
    });

    it('fails closed with AuthError 403 on simulated database error', async () => {
      mockInvoiceFindUnique.mockRejectedValueOnce(new Error('Postgres connection pool error'));
      const parentUser: AuthUser = { uid: 'parent_uid_100', role: 'parent', academyId: 'acad_test', claims: { role: 'parent' } };

      await expect(requireOwnership(parentUser, 'invoice', 'INV-8042')).rejects.toThrow(
        'Forbidden: Resource ownership check failed'
      );
    });

    it('denies admin access to a cross-tenant athlete', async () => {
      mockAthleteFindUnique.mockResolvedValueOnce({ academyId: 'acad_B', parentUserId: 'parent_999' });
      const adminUser: AuthUser = { uid: 'admin_uid_1', role: 'admin', academyId: 'acad_A', claims: { role: 'admin' } };

      await expect(requireOwnership(adminUser, 'athlete', 'ath_8042')).rejects.toMatchObject({
        statusCode: 404,
        message: 'Resource not found',
      });
    });

    it('denies coach access to invoices via requireOwnership', async () => {
      mockInvoiceFindUnique.mockResolvedValueOnce({ academyId: 'acad_test', parentUserId: 'parent_999' });
      const coachUser: AuthUser = { uid: 'coach_uid_1', role: 'coach', academyId: 'acad_test', claims: { role: 'coach' } };

      await expect(requireOwnership(coachUser, 'invoice', 'INV-8042')).rejects.toThrow(
        'Forbidden: Coaches do not have invoice access'
      );
    });

    it('denies user with no academyId', async () => {
      const userWithoutAcademy: AuthUser = { uid: 'user_uid_1', role: 'parent', claims: { role: 'parent' } };

      await expect(requireOwnership(userWithoutAcademy, 'athlete', 'ath_8042')).rejects.toThrow(
        'Forbidden: No academy context'
      );
    });
  });
});
