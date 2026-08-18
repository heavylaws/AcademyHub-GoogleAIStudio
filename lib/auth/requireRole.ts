import { AuthUser, UserRole, AuthError } from './types';

/**
 * Enforces role-based access control against the user's custom claims.
 * Role is sourced EXCLUSIVELY from decoded Firebase custom claims (user.role / user.claims.role).
 * ZERO Firestore or Postgres fallbacks.
 * 
 * Fails closed if claims are missing, role is undefined, or role is not in allowedRoles.
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
