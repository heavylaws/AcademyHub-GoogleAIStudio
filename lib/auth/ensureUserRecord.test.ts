import { describe, expect, it } from 'vitest';
import { ensureUserRecord } from './ensureUserRecord';

describe('ensureUserRecord', () => {
  it('accepts the authoritative Better Auth identity without provisioning a second user record', async () => {
    await expect(ensureUserRecord({
      uid: 'parent_1',
      email: 'parent@example.com',
      role: 'parent',
      claims: { role: 'parent' },
    })).resolves.toBeUndefined();
  });

  it('rejects a request principal without an authoritative email address', async () => {
    await expect(ensureUserRecord({
      uid: 'unknown_1',
      claims: {},
    })).rejects.toThrow('Authenticated session is missing an authoritative user identity.');
  });
});
