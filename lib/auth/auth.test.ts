import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyRequestAuth } from './verifyRequestAuth';
import { requireRole, hasRole } from './requireRole';
import { requireOwnership } from './requireOwnership';
import { AuthUser, AuthError } from './types';

// Mock Firebase Admin SDK Auth
const mockVerifyIdToken = vi.fn();
vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    verifyIdToken: mockVerifyIdToken,
  }),
}));

// Mock Prisma Client singleton
const mockAthleteFindUnique = vi.fn();
const mockInvoiceFindUnique = vi.fn();
const mockAssessmentFindUnique = vi.fn();
vi.mock('@/lib/prisma', () => ({
  prisma: {
    athlete: {
      findUnique: (...args: any[]) => mockAthleteFindUnique(...args),
    },
    invoice: {
      findUnique: (...args: any[]) => mockInvoiceFindUnique(...args),
    },
    assessment: {
      findUnique: (...args: any[]) => mockAssessmentFindUnique(...args),
    },
  },
}));

describe('Phase 1 Authorization Middleware (lib/auth)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================
  // 1. verifyRequestAuth Unit Tests
  // ==========================================
  describe('verifyRequestAuth', () => {
    it('returns AuthUser object on valid Authorization Bearer header', async () => {
      const mockDecodedToken = {
        uid: 'user_parent_123',
        email: 'parent@example.com',
        role: 'parent',
        iss: 'https://securetoken.google.com/test-app',
      };
      mockVerifyIdToken.mockResolvedValueOnce(mockDecodedToken);

      const request = new Request('http://localhost:3000/api/test', {
        headers: { Authorization: 'Bearer valid_id_token_123' },
      });

      const user = await verifyRequestAuth(request);
      expect(user).toBeDefined();
      expect(user.uid).toBe('user_parent_123');
      expect(user.email).toBe('parent@example.com');
      expect(user.role).toBe('parent');
      expect(user.claims).toEqual(mockDecodedToken);
      expect(mockVerifyIdToken).toHaveBeenCalledWith('valid_id_token_123');
    });

    it('rejects with AuthError 401 when Authorization header is missing', async () => {
      const request = new Request('http://localhost:3000/api/test');

      await expect(verifyRequestAuth(request)).rejects.toThrow(AuthError);
      await expect(verifyRequestAuth(request)).rejects.toThrow('Missing Authorization header');
    });

    it('rejects with AuthError 401 when Authorization header is malformed or empty', async () => {
      const reqBasic = new Request('http://localhost:3000/api/test', {
        headers: { Authorization: 'Basic dXNlcjpwYXNz' },
      });
      await expect(verifyRequestAuth(reqBasic)).rejects.toThrow('Malformed Authorization header');

      const reqEmpty = new Request('http://localhost:3000/api/test', {
        headers: { Authorization: 'Bearer ' },
      });
      await expect(verifyRequestAuth(reqEmpty)).rejects.toThrow('Malformed Authorization header');
    });

    it('rejects with AuthError 401 when token is expired or invalid', async () => {
      mockVerifyIdToken.mockRejectedValueOnce(new Error('auth/id-token-expired'));

      const request = new Request('http://localhost:3000/api/test', {
        headers: { Authorization: 'Bearer expired_token' },
      });

      await expect(verifyRequestAuth(request)).rejects.toThrow('Invalid or expired authentication token');
    });
  });

  // ==========================================
  // 2. requireRole Unit Tests
  // ==========================================
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

    it('rejects with AuthError 403 when user claims/role is missing or undefined', () => {
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
    });
  });

  // ==========================================
  // 3. requireOwnership Unit Tests
  // ==========================================
  describe('requireOwnership', () => {
    it('allows parent user who owns the athlete resource', async () => {
      mockAthleteFindUnique.mockResolvedValueOnce({ parentUserId: 'parent_uid_100' });
      const parentUser: AuthUser = { uid: 'parent_uid_100', role: 'parent', claims: { role: 'parent' } };

      await expect(requireOwnership(parentUser, 'athlete', 'ath_8042')).resolves.not.toThrow();
      expect(mockAthleteFindUnique).toHaveBeenCalledWith({
        where: { id: 'ath_8042' },
        select: { parentUserId: true },
      });
    });

    it('rejects parent user who does not own the athlete resource', async () => {
      mockAthleteFindUnique.mockResolvedValueOnce({ parentUserId: 'other_parent_uid' });
      const parentUser: AuthUser = { uid: 'parent_uid_100', role: 'parent', claims: { role: 'parent' } };

      await expect(requireOwnership(parentUser, 'athlete', 'ath_8042')).rejects.toThrow(
        'Forbidden: You do not own this resource'
      );
    });

    it('allows parent user who owns the invoice resource', async () => {
      mockInvoiceFindUnique.mockResolvedValueOnce({ parentUserId: 'parent_uid_100' });
      const parentUser: AuthUser = { uid: 'parent_uid_100', role: 'parent', claims: { role: 'parent' } };

      await expect(requireOwnership(parentUser, 'invoice', 'INV-8042')).resolves.not.toThrow();
      expect(mockInvoiceFindUnique).toHaveBeenCalledWith({
        where: { id: 'INV-8042' },
        select: { parentUserId: true },
      });
    });

    it('rejects parent user who does not own the invoice resource', async () => {
      mockInvoiceFindUnique.mockResolvedValueOnce({ parentUserId: 'other_parent_uid' });
      const parentUser: AuthUser = { uid: 'parent_uid_100', role: 'parent', claims: { role: 'parent' } };

      await expect(requireOwnership(parentUser, 'invoice', 'INV-8042')).rejects.toThrow(
        'Forbidden: You do not own this resource'
      );
    });

    it('allows parent user who owns an assessment through its athlete', async () => {
      mockAssessmentFindUnique.mockResolvedValueOnce({ athlete: { parentUserId: 'parent_uid_100' } });
      const parentUser: AuthUser = { uid: 'parent_uid_100', role: 'parent', claims: { role: 'parent' } };

      await expect(requireOwnership(parentUser, 'assessment', 'asm_8042')).resolves.not.toThrow();
      expect(mockAssessmentFindUnique).toHaveBeenCalledWith({
        where: { id: 'asm_8042' },
        select: { athlete: { select: { parentUserId: true } } },
      });
    });

    it('rejects a parent who does not own an assessment through its athlete', async () => {
      mockAssessmentFindUnique.mockResolvedValueOnce({ athlete: { parentUserId: 'other_parent_uid' } });
      const parentUser: AuthUser = { uid: 'parent_uid_100', role: 'parent', claims: { role: 'parent' } };

      await expect(requireOwnership(parentUser, 'assessment', 'asm_8042')).rejects.toThrow(
        'Forbidden: You do not own this resource'
      );
    });

    it('allows coach and admin roles to bypass ownership checks', async () => {
      const coachUser: AuthUser = { uid: 'coach_uid_1', role: 'coach', claims: { role: 'coach' } };
      const adminUser: AuthUser = { uid: 'admin_uid_1', role: 'admin', claims: { role: 'admin' } };

      await expect(requireOwnership(coachUser, 'athlete', 'ath_8042')).resolves.not.toThrow();
      await expect(requireOwnership(adminUser, 'invoice', 'INV-8042')).resolves.not.toThrow();
      await expect(requireOwnership(coachUser, 'assessment', 'asm_8042')).resolves.not.toThrow();

      expect(mockAthleteFindUnique).not.toHaveBeenCalled();
      expect(mockInvoiceFindUnique).not.toHaveBeenCalled();
    });

    it('rejects when an assessment is not found', async () => {
      mockAssessmentFindUnique.mockResolvedValueOnce(null);
      const parentUser: AuthUser = { uid: 'parent_uid_100', role: 'parent', claims: { role: 'parent' } };

      await expect(requireOwnership(parentUser, 'assessment', 'asm_nonexistent')).rejects.toThrow(
        'Forbidden: You do not own this resource'
      );
    });

    it('fails closed when the assessment ownership join errors', async () => {
      mockAssessmentFindUnique.mockRejectedValueOnce(new Error('Postgres connection pool error'));
      const parentUser: AuthUser = { uid: 'parent_uid_100', role: 'parent', claims: { role: 'parent' } };

      await expect(requireOwnership(parentUser, 'assessment', 'asm_8042')).rejects.toThrow(
        'Forbidden: Resource ownership check failed'
      );
    });

    it('rejects when target resource is not found in database', async () => {
      mockAthleteFindUnique.mockResolvedValueOnce(null);
      const parentUser: AuthUser = { uid: 'parent_uid_100', role: 'parent', claims: { role: 'parent' } };

      await expect(requireOwnership(parentUser, 'athlete', 'ath_nonexistent')).rejects.toThrow(
        'Forbidden: You do not own this resource'
      );
    });

    it('fails closed with AuthError 403 on simulated database error', async () => {
      mockInvoiceFindUnique.mockRejectedValueOnce(new Error('Postgres connection pool error'));
      const parentUser: AuthUser = { uid: 'parent_uid_100', role: 'parent', claims: { role: 'parent' } };

      await expect(requireOwnership(parentUser, 'invoice', 'INV-8042')).rejects.toThrow(
        'Forbidden: Resource ownership check failed'
      );
    });
  });
});
