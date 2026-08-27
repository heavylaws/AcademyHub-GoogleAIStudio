import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { AuthProvider } from './authContext';

// Mock better-auth/react
const { mockGetSession } = vi.hoisted(() => {
  return { mockGetSession: vi.fn() };
});

vi.mock('better-auth/react', () => ({
  createAuthClient: () => ({
    getSession: mockGetSession,
    signIn: { email: vi.fn() },
    signUp: { email: vi.fn() },
    signOut: vi.fn(),
  }),
}));

// Mock React hooks
const mockSetUser = vi.fn();
const mockSetRole = vi.fn();
const mockSetLoading = vi.fn();
const mockSetAcademies = vi.fn();
const mockSetActiveAcademyId = vi.fn();
const mockSetAcademyLoading = vi.fn();

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof React>('react');
  return {
    ...actual,
    useState: vi.fn((initial: any) => {
      // Return a different mock setter based on the initial value to distinguish them
      if (initial === null && !mockSetUser.mock.calls.length) return [null, mockSetUser];
      if (initial === null && mockSetUser.mock.calls.length) return [null, mockSetRole];
      if (initial === true) return [true, mockSetLoading];
      if (Array.isArray(initial)) return [[], mockSetAcademies];
      if (initial === false) return [false, mockSetAcademyLoading];
      return [initial, mockSetActiveAcademyId];
    }),
    useEffect: vi.fn((cb) => {
      // immediately execute the effect for testing
      cb();
    }),
    useCallback: vi.fn((cb) => cb),
  };
});

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: null, error: null }); // default no-session
  });

  it('clears loading state when there is no session', async () => {
    // Calling AuthProvider directly as a function to trigger the hooks
    AuthProvider({ children: null });

    // Wait for the promises inside the useEffect to resolve
    await new Promise(process.nextTick);
    await new Promise(process.nextTick);

    // Verify setLoading(false) was called
    expect(mockSetLoading).toHaveBeenCalledWith(false);
  });
});
