import { describe, expect, it } from 'vitest';
import { getInitialUserRole } from './initialUserRole';

describe('initial Better Auth user role', () => {
  it('uses parent access for the first self-service registration', () => {
    expect(getInitialUserRole(0)).toBe('PARENT');
  });

  it('keeps parent access for subsequent registrations', () => {
    expect(getInitialUserRole(1)).toBe('PARENT');
  });

  it('rejects an invalid user count rather than assigning a role unpredictably', () => {
    expect(() => getInitialUserRole(-1)).toThrow('User count must be a non-negative integer.');
  });
});
