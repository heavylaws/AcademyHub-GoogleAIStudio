'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createAuthClient } from 'better-auth/react';

const authClient = createAuthClient();

export type UserRole = 'admin' | 'coach' | 'parent' | string | null;

export interface AuthenticatedUser {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: UserRole;
}

export interface AuthContextType {
  user: AuthenticatedUser | null;
  role: UserRole;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthenticatedUser>;
  register: (email: string, password: string, displayName?: string) => Promise<AuthenticatedUser>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getErrorMessage(error: { message?: string } | null, fallback: string): string {
  return error?.message || fallback;
}

function toAuthenticatedUser(value: unknown): AuthenticatedUser | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const user = value as Record<string, unknown>;
  if (typeof user.id !== 'string' || typeof user.email !== 'string') {
    return null;
  }

  const role = typeof user.role === 'string' ? user.role.toLowerCase() : null;
  const displayName = typeof user.name === 'string' && user.name.trim()
    ? user.name
    : user.email.split('@')[0];

  return {
    id: user.id,
    uid: user.id,
    email: user.email,
    displayName,
    photoURL: typeof user.image === 'string' ? user.image : null,
    role,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshSession = useCallback(async (): Promise<AuthenticatedUser | null> => {
    const result = await authClient.getSession();
    if (result.error) {
      throw new Error(getErrorMessage(result.error, 'Unable to load the authentication session.'));
    }

    const currentUser = toAuthenticatedUser(result.data?.user);
    setUser(currentUser);
    setRole(currentUser?.role ?? null);
    return currentUser;
  }, []);

  useEffect(() => {
    let active = true;

    void authClient.getSession()
      .then((result) => {
        if (active) {
          if (result.error) {
            console.error(
              'Unable to resolve Better Auth session:',
              getErrorMessage(result.error, 'Unable to load the authentication session.')
            );
            setUser(null);
            setRole(null);
            return;
          }

          const currentUser = toAuthenticatedUser(result.data?.user);
          setUser(currentUser);
          setRole(currentUser?.role ?? null);
        }
      })
      .catch((error) => {
        if (active) {
          console.error('Unable to resolve Better Auth session:', error);
          setUser(null);
          setRole(null);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<AuthenticatedUser> => {
    setLoading(true);
    try {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) {
        throw new Error(getErrorMessage(result.error, 'Authentication failed.'));
      }

      const currentUser = await refreshSession();
      if (!currentUser) {
        throw new Error('Authentication succeeded but no session was created.');
      }

      return currentUser;
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    displayName?: string
  ): Promise<AuthenticatedUser> => {
    setLoading(true);
    try {
      const result = await authClient.signUp.email({
        email,
        password,
        name: displayName?.trim() || email.split('@')[0],
      });
      if (result.error) {
        throw new Error(getErrorMessage(result.error, 'Registration failed.'));
      }

      const currentUser = await refreshSession();
      if (!currentUser) {
        throw new Error('Registration succeeded but no session was created.');
      }

      return currentUser;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    setLoading(true);
    try {
      const result = await authClient.signOut();
      if (result.error) {
        throw new Error(getErrorMessage(result.error, 'Failed to sign out.'));
      }

      setUser(null);
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signIn, register, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
