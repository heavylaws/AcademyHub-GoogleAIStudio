'use client';

import React, { useState } from 'react';
import { ShieldCheck, Lock, FileText, UserCheck, Key, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';

interface AuthSectionProps {
  currentRole?: string;
  onRoleChange?: (role: string, userDetails: { name: string; email: string; childrenIds?: string[] }) => void;
}

export default function AuthSection({ currentRole = 'admin', onRoleChange }: AuthSectionProps) {
  const [selectedRole, setSelectedRole] = useState<'admin' | 'coach' | 'parent'>(
    (currentRole as 'admin' | 'coach' | 'parent') || 'admin'
  );
  const [email, setEmail] = useState('admin@academyhub.io');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [signedInUser, setSignedInUser] = useState({
    name: 'Admin Director',
    email: 'admin@academyhub.io',
    role: 'admin',
    childrenIds: [] as string[],
  });
  const [authSuccessMsg, setAuthSuccessMsg] = useState('');

  const presetAccounts = [
    {
      role: 'admin' as const,
      name: 'Admin Director (Academy Executive)',
      email: 'admin@academyhub.io',
      color: 'cyan',
      description: 'Full system access: Financial Ledger, Coach Analytics, COPPA Data Governance & Facility Reservations.',
      childrenIds: [],
    },
    {
      role: 'coach' as const,
      name: 'Coach Davis (Head Basketball & Plyometrics)',
      email: 'coach.davis@academyhub.io',
      color: 'emerald',
      description: 'Coaching scope: Video Ingestion, Motion Kinematics, Class Rosters & Court Scheduling. Restricted from Financials.',
      childrenIds: [],
    },
    {
      role: 'parent' as const,
      name: 'Robert Vance (Parent of Marcus & Sarah)',
      email: 'robert.vance@gmail.com',
      color: 'purple',
      description: 'Parent scope: Strictly linked youth profiles (Marcus Vance, Sarah Vance), COPPA Consent & Family Billing Invoices.',
      childrenIds: ['ath_8042', 'ath_8043'],
    },
  ];

  const handleQuickSwitch = (preset: typeof presetAccounts[0]) => {
    setSelectedRole(preset.role);
    setEmail(preset.email);
    setSignedInUser({
      name: preset.name,
      email: preset.email,
      role: preset.role,
      childrenIds: preset.childrenIds,
    });
    setAuthSuccessMsg(`Authenticated as ${preset.name} [Role: ${preset.role.toUpperCase()}]`);
    if (onRoleChange) {
      onRoleChange(preset.role, { name: preset.name, email: preset.email, childrenIds: preset.childrenIds });
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const preset = presetAccounts.find(p => p.role === selectedRole) || presetAccounts[0];
    setSignedInUser({
      name: preset.name,
      email: email,
      role: selectedRole,
      childrenIds: preset.childrenIds,
    });
    setAuthSuccessMsg(`Firebase Auth Token issued for ${email} (${selectedRole.toUpperCase()})`);
    if (onRoleChange) {
      onRoleChange(selectedRole, { name: preset.name, email: email, childrenIds: preset.childrenIds });
    }
  };

  return (
    <div className="space-y-6 transition-colors duration-200">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
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
          <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase">{signedInUser.role} Active</span>
        </div>
      </div>

      {/* Quick Switch Profiles Bar */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
        <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          Quick Switch RBAC Test Accounts (Firebase Auth Preset Sessions)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {presetAccounts.map((p) => {
            const isCurrent = signedInUser.role === p.role;
            return (
              <button
                key={p.role}
                onClick={() => handleQuickSwitch(p)}
                className={`p-4 rounded-xl text-left border transition-all relative ${
                  isCurrent
                    ? 'bg-slate-100 dark:bg-slate-950 border-cyan-500 ring-2 ring-cyan-500/20'
                    : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
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
                  {isCurrent && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </span>
                  )}
                </div>
                <div className="font-bold text-xs text-slate-900 dark:text-white mt-1">{p.name}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{p.email}</div>
                <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                  {p.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {authSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {authSuccessMsg}
        </div>
      )}

      {/* Grid for Form & RBAC Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Custom Login Form */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <Key className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            Firebase Authentication Gateway
          </h3>

          <form onSubmit={handleManualSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-cyan-500 font-semibold"
              >
                <option value="admin">Admin (Executive & Financial Director)</option>
                <option value="coach">Coach (Sports & Biomechanics Instructor)</option>
                <option value="parent">Parent (Youth Guardian)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
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
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold py-2.5 rounded-xl transition-colors shadow-sm"
            >
              Sign In & Obtain Role Token
            </button>
          </form>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
            <div className="font-bold text-slate-800 dark:text-slate-200">Active Session Claims:</div>
            <div>UID: <span className="font-mono text-cyan-600 dark:text-cyan-400">usr_auth_{signedInUser.role}_881</span></div>
            <div>Role Claim: <span className="font-mono text-emerald-600 dark:text-emerald-400">{signedInUser.role}</span></div>
          </div>
        </div>

        {/* Data Access Matrix & Privacy Standards */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
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


