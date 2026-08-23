import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * AsyncLocalStorage scope for programmatic invite sign-ups.
 * Internal user creation (invitation acceptance, bootstrap) runs inside
 * `internalInviteScope.run(true, async () => ...)` to be authorized by databaseHooks.
 */
export const internalInviteScope = new AsyncLocalStorage<boolean>();
