import { describe, expect, it } from 'vitest';
import { getInitialUserRole } from './initialUserRole';

describe('initial Better Auth user role', () => {
  it('assigns ADMIN to the first registered user', () => {
    expect(getInitialUserRole(0)).toBe('ADMIN');
  });

  it('assigns PARENT to the second registered user', () => {
    expect(getInitialUserRole(1)).toBe('PARENT');
  });

  it('rejects an invalid user count rather than assigning a role unpredictably', () => {
    expect(() => getInitialUserRole(-1)).toThrow('User count must be a non-negative integer.');
  });
});
