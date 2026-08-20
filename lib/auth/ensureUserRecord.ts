import { AuthUser } from './types';

export async function ensureUserRecord(user: AuthUser): Promise<void> {
  if (!user.uid || !user.email) {
    throw new Error('Authenticated session is missing an authoritative user identity.');
  }
}
