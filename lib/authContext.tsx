'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  UserCredential,
  onAuthStateChanged,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

export type UserRole = 'admin' | 'coach' | 'parent' | string | null;

export interface AuthContextType {
  user: User | null;
  role: UserRole;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<UserCredential>;
  signInWithGoogle: () => Promise<UserCredential>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const resolveRole = async (currentUser: User | null) => {
      setUser(currentUser);
      if (!currentUser) {
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
    };

    const unsubscribeAuth = onAuthStateChanged(auth, resolveRole);
    const unsubscribeToken = onIdTokenChanged(auth, resolveRole);

    return () => {
      unsubscribeAuth();
      unsubscribeToken();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<UserCredential> => {
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
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
    <AuthContext.Provider value={{ user, role, loading, signIn, signInWithGoogle, signOut }}>
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
