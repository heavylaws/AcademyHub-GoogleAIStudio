'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  User,
  UserCredential,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

export type UserRole = 'admin' | 'coach' | 'parent' | string | null;

export interface AuthContextType {
  user: User | null;
  role: UserRole;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<UserCredential>;
  register: (email: string, password: string, displayName?: string) => Promise<UserCredential>;
  signInWithGoogle: () => Promise<UserCredential>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const bootstrapInFlightRef = useRef<Record<string, boolean>>({});

  const bootstrapUserRecord = useCallback(async (currentUser: User) => {
    const uid = currentUser.uid;
    if (bootstrapInFlightRef.current[uid]) {
      return;
    }

    bootstrapInFlightRef.current[uid] = true;

    try {
      const idToken = await currentUser.getIdToken();
      const response = await fetch('/api/auth/bootstrap', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Bootstrap failed');
      }

      const payload = (await response.json()) as { role?: string };
      const refreshedToken = await currentUser.getIdTokenResult(true);
      const claimRole = refreshedToken.claims.role as string | undefined;
      setRole(claimRole || payload.role || null);
    } catch (err) {
      console.error('Error bootstrapping user role:', err);
    } finally {
      bootstrapInFlightRef.current[uid] = false;
    }
  }, []);

  useEffect(() => {
    const resolveRole = async (currentUser: User | null) => {
      setUser(currentUser);
      if (!currentUser) {
        bootstrapInFlightRef.current = {};
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const idTokenResult = await currentUser.getIdTokenResult();
        const claimRole = idTokenResult.claims.role as string | undefined;
        setRole(claimRole || null);
      } catch (err) {
        console.error('Error resolving user role:', err);
        setRole(null);
      } finally {
        setLoading(false);
      }

      await bootstrapUserRecord(currentUser);
    };

    const unsubscribeAuth = onAuthStateChanged(auth, resolveRole);
    const unsubscribeToken = onIdTokenChanged(auth, resolveRole);

    return () => {
      unsubscribeAuth();
      unsubscribeToken();
    };
  }, [bootstrapUserRecord]);

  const signIn = async (email: string, password: string): Promise<UserCredential> => {
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await bootstrapUserRecord(cred.user);
      return cred;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, displayName?: string): Promise<UserCredential> => {
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName && displayName.trim()) {
        await updateProfile(cred.user, { displayName: displayName.trim() });
      }
      await bootstrapUserRecord(cred.user);
      return cred;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async (): Promise<UserCredential> => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      await bootstrapUserRecord(cred.user);
      return cred;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signIn, register, signInWithGoogle, signOut }}>
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
