/**
 * AcademyHub Authorization Types & Interfaces (Phase 1)
 */

export type UserRole = 'admin' | 'coach' | 'parent';

export type ResourceType = 'athlete' | 'invoice';

export interface AuthUser {
  uid: string;
  email?: string;
  role?: UserRole | string;
  claims: Record<string, any>;
}

export class AuthError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode = 401) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}
