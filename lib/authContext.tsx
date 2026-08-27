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
  academies: Array<{ id: string; name: string; slug: string; role: string }>;
  activeAcademyId: string | null;
  academyLoading: boolean;
  setActiveAcademy: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function getAcademyHeaders(academyId: string | null): Record<string, string> {
  if (!academyId) return {};
  return { 'X-Academy-Id': academyId };
}

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
  const [academies, setAcademies] = useState<Array<{ id: string; name: string; slug: string; role: string }>>([]);
  const [activeAcademyId, setActiveAcademyId] = useState<string | null>(null);
  const [academyLoading, setAcademyLoading] = useState<boolean>(false);

  const setActiveAcademy = useCallback((id: string) => {
    localStorage.setItem('academyhub_activeAcademyId', id);
    setActiveAcademyId(id);
  }, []);

  const fetchAcademies = useCallback(async () => {
    setAcademyLoading(true);
    try {
      const res = await fetch('/api/me/academies', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const loadedAcademies = data.academies || [];
        setAcademies(loadedAcademies);
        
        if (loadedAcademies.length === 1) {
          setActiveAcademy(loadedAcademies[0].id);
        } else if (loadedAcademies.length > 1) {
          const stored = localStorage.getItem('academyhub_activeAcademyId');
          if (stored && loadedAcademies.some((a: any) => a.id === stored)) {
            setActiveAcademyId(stored);
          } else {
            setActiveAcademyId(null);
          }
        } else {
          setActiveAcademyId(null);
        }
      } else {
        setAcademies([]);
        setActiveAcademyId(null);
      }
    } catch (e) {
      console.error('Failed to load academies', e);
      setAcademies([]);
      setActiveAcademyId(null);
    } finally {
      setAcademyLoading(false);
    }
  }, [setActiveAcademy]);

  const refreshSession = useCallback(async (): Promise<AuthenticatedUser | null> => {
    const result = await authClient.getSession();
    if (result.error) {
      throw new Error(getErrorMessage(result.error, 'Unable to load the authentication session.'));
    }

    const currentUser = toAuthenticatedUser(result.data?.user);
    setUser(currentUser);
    setRole(currentUser?.role ?? null);
    if (currentUser) {
      await fetchAcademies();
    }
    return currentUser;
  }, [fetchAcademies]);

  useEffect(() => {
    let active = true;

    async function initSession() {
      try {
        const result = await authClient.getSession();
        if (!active) return;

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

        if (currentUser) {
          await fetchAcademies();
        }
      } catch (error) {
        if (active) {
          console.error('Unable to resolve Better Auth session:', error);
          setUser(null);
          setRole(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void initSession();

    return () => {
      active = false;
    };
  }, [fetchAcademies]);

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
      setAcademies([]);
      setActiveAcademyId(null);
      localStorage.removeItem('academyhub_activeAcademyId');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signIn, register, signOut, academies, activeAcademyId, academyLoading, setActiveAcademy }}>
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
