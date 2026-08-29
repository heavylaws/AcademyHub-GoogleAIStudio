'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  FileText,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut,
  UserCheck,
  Zap,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/lib/authContext';

export default function AuthSection() {
  const { user, role, loading: authLoading, signIn, register, signOut } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await signIn(email, password);
      setSuccessMessage(`Successfully signed in as ${email}`);
    } catch (err) {
      const message = getErrorMessage(err, 'Authentication failed.');
      console.error('Sign-in error:', err);
      if (/invalid (email|password)|invalid credentials/i.test(message)) {
        setErrorMessage('Invalid email or password. Please verify your credentials.');
      } else {
        setErrorMessage(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const registeredUser = await register(email, password, displayName);
      setSuccessMessage(`Account created for ${registeredUser.email}. Assigned role: ${registeredUser.role || 'parent'}`);
    } catch (err) {
      const message = getErrorMessage(err, 'Registration failed.');
      console.error('Registration error:', err);
      if (/already exists|already registered|email.*taken/i.test(message)) {
        setErrorMessage('This email is already registered. Please sign in instead or use another address.');
      } else if (/password.*(weak|short)|password.*least/i.test(message)) {
        setErrorMessage('Password must be at least 8 characters long.');
      } else {
        setErrorMessage(message);
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
    } catch (err) {
      console.error('Sign-out error:', err);
      setErrorMessage(getErrorMessage(err, 'Failed to sign out.'));
    }
  };

  return (
    <div className="relative py-6 md:py-10 max-w-4xl mx-auto space-y-8 transition-colors duration-200">
      {/* Background Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-tr from-cyan-500/15 via-purple-500/10 to-transparent blur-3xl rounded-full pointer-events-none -z-10" />

      {/* Main Centered Login Card */}
      <div className="max-w-md mx-auto rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800/80 shadow-2xl dark:shadow-slate-950/60 overflow-hidden transition-all">
        {/* Header Header & Branding */}
        <div className="p-6 pb-4 text-center space-y-2 border-b border-slate-100 dark:border-slate-800/60">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-0.5 shadow-lg shadow-cyan-500/20 mb-1">
            <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
              <Zap className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            AcademyHub Portal
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Secure Role-Based Authentication & Youth Privacy Gate
          </p>

          <div className="pt-2 flex items-center justify-center gap-2">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Gate Status:
            </span>
            <span
              className={`text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                role === 'admin'
                  ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20'
                  : role === 'coach'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : role === 'parent'
                  ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              {role ? `${role} Active` : user ? 'Authenticated' : 'Unauthenticated'}
            </span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="p-1.5 mx-6 mt-4 rounded-2xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 flex text-xs font-semibold" role="tablist" aria-label="Authentication modes">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            onClick={() => setMode('login')}
            className={`flex-1 min-h-[44px] py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 active:scale-[0.98] ${
              mode === 'login'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-bold border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            onClick={() => setMode('register')}
            className={`flex-1 min-h-[44px] py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 active:scale-[0.98] ${
              mode === 'register'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-bold border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            Create Account
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={mode === 'login' ? handleSignIn : handleRegister} className="space-y-4 p-6 pt-4">
          {mode === 'register' && (
            <div className="space-y-1.5">
              <label htmlFor="auth-display-name" className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Display Name
              </label>
              <input
                id="auth-display-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 outline-none focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30 transition-all"
                placeholder="Full Name"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="auth-email" className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Email Address
            </label>
            <input
              id="auth-email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 outline-none focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30 transition-all"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="auth-password" className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Password
            </label>
            <div className="relative flex items-center">
              <input
                id="auth-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 pr-12 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 outline-none focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30 transition-all"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-0 top-0 bottom-0 flex min-h-[44px] min-w-[44px] items-center justify-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-r-xl"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-rose-300 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span className="leading-tight">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="leading-tight">{successMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || authLoading}
            className="w-full mt-2 min-h-[48px] rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-extrabold text-sm py-3 px-4 shadow-lg shadow-cyan-500/20 active:scale-[0.99] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {mode === 'login' ? 'Authenticating...' : 'Creating Account...'}
              </span>
            ) : mode === 'login' ? (
              'Sign In to Dashboard'
            ) : (
              'Create New Account'
            )}
          </button>
        </form>

        {user && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold truncate">
                <UserCheck className="h-4 w-4 shrink-0" />
                <span className="truncate">{user.email}</span>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Feature Value Cards */}
      <div className="grid gap-4 md:grid-cols-3 max-w-3xl mx-auto">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/60 p-4 backdrop-blur-md space-y-2">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
            <Lock className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 dark:text-white">Session Security</h3>
          <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">Better Auth database-backed session validation and cookie cache controls.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/60 p-4 backdrop-blur-md space-y-2">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <FileText className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 dark:text-white">COPPA Privacy</h3>
          <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">Guardian consent and youth athlete profiles remain gated by role boundaries.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/60 p-4 backdrop-blur-md space-y-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Key className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 dark:text-white">Role Scoping</h3>
          <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">Admins, coaches, and parents operate within explicitly scoped tenant roles.</p>
        </div>
      </div>
    </div>
  );
}

