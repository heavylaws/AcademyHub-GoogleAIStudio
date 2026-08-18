import '@/lib/firebaseAdmin';
import { getAuth } from 'firebase-admin/auth';
import { AuthUser, AuthError } from './types';

/**
 * Verifies a Firebase ID token from the incoming Request's Authorization header.
 * 
 * Role and identity are sourced EXCLUSIVELY from decoded custom claims returned by verifyIdToken.
 * Rejects missing headers, malformed Bearer formats, and expired/invalid tokens.
 */
export async function verifyRequestAuth(request: Request): Promise<AuthUser> {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');

  if (!authHeader) {
    throw new AuthError('Missing Authorization header', 401);
  }

  if (!authHeader.startsWith('Bearer ')) {
    throw new AuthError('Malformed Authorization header: Must be Bearer token', 401);
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    throw new AuthError('Malformed Authorization header: Bearer token is empty', 401);
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    const role = decodedToken.role as string | undefined;

    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role,
      claims: decodedToken,
    };
  } catch (err: any) {
    console.warn('Firebase ID token verification failed:', err?.message || String(err));
    throw new AuthError('Invalid or expired authentication token', 401);
  }
}
