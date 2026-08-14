'use client';

/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useState } from 'react';
import {
  Activity,
  Calendar,
  CreditCard,
  ShieldCheck,
  Zap,
  BarChart2,
  UserCheck,
  LogOut,
  Loader2
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { auth } from '@/lib/firebase';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUserRole?: string;
  currentUserName?: string;
}

function GoogleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export default function Navbar({
  activeTab,
  setActiveTab,
  currentUserRole = 'admin',
  currentUserName = 'Admin Director',
}: NavbarProps) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error?.code !== 'auth/popup-closed-by-user') {
        console.error('Firebase Google Sign-in error:', error);
      }
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Firebase Sign-out error:', error);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Overview & RAG', icon: BarChart2 },
    { id: 'profiles', label: 'Athlete Profiles', icon: UserCheck },
    { id: 'biomechanics', label: 'Biomechanics & AI', icon: Activity },
    { id: 'scheduling', label: 'Scheduling & Court', icon: Calendar },
    { id: 'billing', label: 'Billing & Ledger', icon: CreditCard },
    { id: 'auth', label: 'Auth & COPPA', icon: ShieldCheck },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-slate-900 dark:bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Zap className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">AcademyHub</span>
              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                PRO v2.5
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Sports Performance & Kinematic Analytics Engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <nav className="flex items-center gap-1 sm:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400'}`} />
                  <span className="hidden lg:inline">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('auth')}
              title="Click to switch role or view RBAC matrix"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-medium hover:border-cyan-500/50 transition-all"
            >
              <span className={`w-2 h-2 rounded-full ${
                currentUserRole === 'admin' ? 'bg-cyan-500' : currentUserRole === 'coach' ? 'bg-emerald-500' : 'bg-purple-500'
              }`} />
              <span className="font-semibold capitalize text-slate-800 dark:text-slate-200">{currentUserRole}:</span>
              <span className="text-slate-500 dark:text-slate-400 truncate max-w-[90px] hidden sm:inline">{currentUserName}</span>
            </button>

            {/* Persistent Firebase Auth Login / Sign Out Control */}
            {authLoading ? (
              <div className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              </div>
            ) : firebaseUser ? (
              <div className="flex items-center gap-2">
                <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  {firebaseUser.photoURL ? (
                    <img
                      src={firebaseUser.photoURL}
                      alt={firebaseUser.displayName || 'User'}
                      className="w-5 h-5 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-bold">
                      {firebaseUser.displayName?.charAt(0) || firebaseUser.email?.charAt(0) || 'U'}
                    </div>
                  )}
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[110px]">
                    {firebaseUser.displayName || firebaseUser.email}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  title="Sign Out of Firebase Auth"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 text-xs font-semibold transition-all shadow-sm"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                disabled={signingIn}
                title="Login with Google (Firebase Auth)"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-sm shadow-cyan-600/20 disabled:opacity-50"
              >
                {signingIn ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <GoogleIcon className="w-3.5 h-3.5" />
                )}
                <span>Login</span>
              </button>
            )}

            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}


