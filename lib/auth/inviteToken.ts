import crypto from 'node:crypto';

/**
 * Generates a CSPRNG raw token and its SHA-256 hash.
 * Only the hash is stored in Postgres (`tokenHash`).
 * The raw token is returned to the caller to construct the acceptance URL.
 */
export function generateInviteToken() {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashInviteToken(rawToken);
  return { rawToken, tokenHash };
}

export function hashInviteToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}
