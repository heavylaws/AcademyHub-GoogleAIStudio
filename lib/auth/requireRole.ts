import { AuthUser, UserRole, AuthError } from './types';

/**
 * Enforces role-based access control against the verified request principal.
 * Role resolution is intentionally performed before this helper is called.
 * 
 * Fails closed if role is missing, undefined, or not in allowedRoles.
 */
export function requireRole(user: AuthUser, allowedRoles: UserRole[]): void {
  const role = user.role;

  if (!role || typeof role !== 'string' || !allowedRoles.includes(role as UserRole)) {
    throw new AuthError('Forbidden: Insufficient role permissions', 403);
  }
}

/**
 * Helper returning a boolean indicating whether the user has one of the allowed roles.
 */
export function hasRole(user: AuthUser, allowedRoles: UserRole[]): boolean {
  try {
    requireRole(user, allowedRoles);
    return true;
  } catch {
    return false;
  }
}
