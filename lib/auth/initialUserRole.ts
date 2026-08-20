export type InitialUserRole = 'ADMIN' | 'PARENT';

export function getInitialUserRole(userCount: number): InitialUserRole {
  if (!Number.isSafeInteger(userCount) || userCount < 0) {
    throw new Error('User count must be a non-negative integer.');
  }

  return userCount === 0 ? 'ADMIN' : 'PARENT';
}
