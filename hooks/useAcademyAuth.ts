'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut as fbSignOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '@/lib/firebase';
import { UserProfile, UserRole } from '@/types/academy';

export function useAcademyAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            setUserProfile(userSnap.data() as UserProfile);
          } else {
            // Default new user as 'coach' or 'admin'
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || 'user@academyhub.com',
              displayName: currentUser.displayName || 'Academy Coach',
              role: 'admin', // Default admin for full functionality
              photoURL: currentUser.photoURL || undefined,
              sportSpecialties: ['Basketball', 'Soccer', 'Tennis'],
              createdAt: new Date().toISOString()
            };
            await setDoc(userRef, newProfile);
            setUserProfile(newProfile);
          }
        } catch (err) {
          console.error('Error fetching user profile:', err);
          // Fallback profile if Firestore read fails
          setUserProfile({
            uid: currentUser.uid,
            email: currentUser.email || 'coach@academyhub.com',
            displayName: currentUser.displayName || 'Head Coach',
            role: 'admin',
            sportSpecialties: ['Basketball', 'Soccer']
          });
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Google Sign-In failed:', err);
    }
  };

  const loginAsDemoRole = async (role: UserRole) => {
    // Simulated demo login without requiring Google account popup
    const demoProfile: UserProfile = {
      uid: `demo-${role}-101`,
      email: `${role}@academyhub.com`,
      displayName: role === 'admin' ? 'Master Admin' : role === 'coach' ? 'Coach Marcus Vance' : 'Parent Sarah Vance',
      role: role,
      sportSpecialties: role === 'coach' ? ['Basketball', 'Soccer'] : undefined,
      createdAt: new Date().toISOString()
    };
    setUserProfile(demoProfile);
  };

  const switchUserRole = async (newRole: UserRole) => {
    if (!userProfile) return;
    const updated = { ...userProfile, role: newRole };
    setUserProfile(updated);
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), updated, { merge: true });
      } catch (e) {
        console.error('Failed to update role in firestore:', e);
      }
    }
  };

  const logout = async () => {
    try {
      await fbSignOut(auth);
      setUser(null);
      setUserProfile(null);
    } catch (err) {
      console.error('Sign-out failed:', err);
    }
  };

  return {
    user,
    userProfile,
    loading,
    loginWithGoogle,
    loginAsDemoRole,
    switchUserRole,
    logout
  };
}
