'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  FileText,
  UserCheck,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/lib/authContext';

export default function AuthSection() {
  const { user, role, loading: authLoading, signIn, signOut } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isDev = process.env.NODE_ENV !== 'production';

  const presetAccounts = [
    {
      role: 'admin' as const,
      name: 'Admin Director (Academy Executive)',
      email: 'admin@academyhub.io',
      password: 'password123',
      color: 'cyan',
      description: 'Full system access: Financial Ledger, Coach Analytics, COPPA Data Governance & Facility Reservations.',
    },
    {
      role: 'coach' as const,
      name: 'Coach Davis (Head Basketball & Plyometrics)',
      email: 'coach.davis@academyhub.io',
      password: 'password123',
      color: 'emerald',
      description: 'Coaching scope: Video Ingestion, Motion Kinematics, Class Rosters & Court Scheduling. Restricted from Financials.',
    },
    {
      role: 'parent' as const,
      name: 'Robert Vance (Parent of Marcus & Sarah)',
      email: 'robert.vance@gmail.com',
      password: 'password123',
      color: 'purple',
      description: 'Parent scope: Strictly linked youth profiles (Marcus Vance, Sarah Vance), COPPA Consent & Family Billing Invoices.',
    },
  ];

  const handlePresetSelect = (preset: typeof presetAccounts[0]) => {
    setEmail(preset.email);
    setPassword(preset.password);
    setErrorMessage(null);
    setSuccessMessage(`Loaded ${preset.role.toUpperCase()} credentials into form. Click "Sign In with Firebase Auth" to authenticate.`);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await signIn(email, password);
      setSuccessMessage(`Successfully signed in as ${email}`);
    } catch (err: any) {
      console.error('Firebase Auth sign-in error:', err);
      if (err?.code === 'auth/invalid-credential' || err?.code === 'auth/user-not-found' || err?.code === 'auth/wrong-password') {
        setErrorMessage('Invalid email or password. Please verify your credentials.');
      } else if (err?.code === 'auth/too-many-requests') {
        setErrorMessage('Access temporarily blocked due to many failed attempts. Try again later.');
      } else {
        setErrorMessage(err?.message || 'Authentication failed.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setSuccessMessage('Successfully signed out.');
      setErrorMessage(null);
    } catch (err: any) {
      console.error('Sign-out error:', err);
      setErrorMessage(err?.message || 'Failed to sign out.');
    }
  };

  return (
    <div className="space-y-6 transition-colors duration-200">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Secure Role-Based Authentication & COPPA Privacy Gate
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Firebase Authentication, role-based document authorization, and multi-tenant youth privacy filters.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-slate-500 dark:text-slate-400">Security Gate:</span>
          <span className={`font-bold uppercase ${
            role === 'admin'
              ? 'text-cyan-600 dark:text-cyan-400'
              : role === 'coach'
              ? 'text-emerald-600 dark:text-emerald-400'
              : role === 'parent'
              ? 'text-purple-600 dark:text-purple-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}>
            {role ? `${role} Active` : user ? 'Authenticated (No Role)' : 'Unauthenticated'}
          </span>
        </div>
      </div>

      {/* Demo Preset Accounts (DEV ONLY) */}
      {isDev ? (
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-amber-500/30 dark:border-amber-500/20 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Development Demo Login Credentials (NODE_ENV !== &apos;production&apos;)
            </h3>
            <span className="text-[10px] font-mono font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
              Dev Only
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            Click any demo profile to populate the sign-in form below. Production builds automatically hide these test accounts.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {presetAccounts.map((p) => (
              <button
                key={p.role}
                type="button"
                onClick={() => handlePresetSelect(p)}
                className="p-4 min-h-[44px] rounded-xl text-left border bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-amber-500/50 dark:hover:border-amber-500/40 transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                    p.role === 'admin'
                      ? 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20'
                      : p.role === 'coach'
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20'
                  }`}>
                    {p.role}
                  </span>
                  {user?.email === p.email && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Signed In
                    </span>
                  )}
                </div>
                <div className="font-bold text-xs text-slate-900 dark:text-white mt-1">{p.name}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{p.email}</div>
                <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                  {p.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Production Security Policy: Demo presets are disabled in production environments.</span>
        </div>
      )}

      {/* Success Notification */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {successMessage}
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 text-xs font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {errorMessage}
        </div>
      )}

      {/* Grid for Form & RBAC Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real Firebase Login Form */}
        <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <Key className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            Firebase Authentication Gateway
          </h3>

          {user ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">Active Firebase Session</div>
                <div className="text-slate-600 dark:text-slate-400">Email: <span className="font-mono text-slate-900 dark:text-white font-semibold">{user.email}</span></div>
                <div className="text-slate-600 dark:text-slate-400">UID: <span className="font-mono text-cyan-600 dark:text-cyan-400">{user.uid}</span></div>
                <div className="text-slate-600 dark:text-slate-400">Role: <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold uppercase">{role || 'None'}</span></div>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={authLoading}
                className="w-full min-h-[44px] bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          ) : (
            <form onSubmit={handleSignIn} className="max-w-md w-full mx-auto space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@academyhub.io"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 h-11 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 h-11 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || authLoading}
                className="w-full bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold py-2.5 h-11 min-h-[44px] rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <span>Sign In with Firebase Auth</span>
                )}
              </button>
            </form>
          )}

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
            <div className="font-bold text-slate-800 dark:text-slate-200">Active Session Claims:</div>
            <div>UID: <span className="font-mono text-cyan-600 dark:text-cyan-400">{user?.uid || 'Not signed in'}</span></div>
            <div>Role Claim: <span className="font-mono text-emerald-600 dark:text-emerald-400">{role || 'None'}</span></div>
          </div>
        </div>

        {/* Data Access Matrix & Privacy Standards */}
        <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <Lock className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            COPPA / CCPA / GDPR Privacy Permission Matrix
          </h3>

          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                <span>1. Youth Medical & Biometric Data</span>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  COPPA Enforced
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Joint kinematics, video motion captures, and physical assessments are encrypted and only readable by assigned Coaches and the student&apos;s verified Parent.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                <span>2. Financial Ledger & Credit Cards</span>
                <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  PCI-DSS Restricted
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Consolidated family billing and payment schedules are strictly visible to Admins and the specific Parent account. Coaches have zero visibility into payment history.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                <span>3. Court & Facility Schedules</span>
                <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                  Public Academy Scope
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Reservation slots, coach class assignments, and facility capacity indicators are readable by all authenticated academy members.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 space-y-1 text-[11px]">
            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              Active Firestore Security Policy:
            </div>
            <div className="font-mono text-cyan-600 dark:text-cyan-400">[DEFAULT_DENY] All reads/writes require valid JWT role claims</div>
            <div className="font-mono text-slate-500 dark:text-slate-400">[PARENT_SCOPE] isParentOf(parentEmail) enforced on athletes & invoices</div>
          </div>
        </div>
      </div>
    </div>
  );
}


