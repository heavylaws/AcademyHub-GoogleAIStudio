'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  Lock, 
  UserCheck, 
  AlertTriangle, 
  KeyRound, 
  CheckCircle2, 
  FileText, 
  Users, 
  Database, 
  LogOut, 
  Sparkles,
  Eye,
  ShieldAlert
} from 'lucide-react';
import { UserProfile, UserRole } from '@/types/academy';

interface AuthSectionProps {
  userProfile: UserProfile | null;
  loading: boolean;
  onLoginGoogle: () => void;
  onLoginDemo: (role: UserRole) => void;
  onSwitchRole: (role: UserRole) => void;
  onLogout: () => void;
}

export const AuthSection: React.FC<AuthSectionProps> = ({
  userProfile,
  loading,
  onLoginGoogle,
  onLoginDemo,
  onSwitchRole,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'roles' | 'compliance'>('overview');

  const rolePermissions: Record<UserRole, { label: string; accessLevel: string; badgeColor: string; items: string[] }> = {
    admin: {
      label: 'Academy Administrator',
      accessLevel: 'Full Read / Write / Audit',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      items: [
        'Full Biomechanics & Kinematics Raw Data Access',
        'Youth Medical & Biometric Storage (COPPA Compliant)',
        'Coach Schedule & Facility Capacity Overrides',
        'Consolidated Billing & Sibling Discount Ledger Control',
        'Full Conversational RAG Query Authorization'
      ]
    },
    coach: {
      label: 'Verified Head Coach',
      accessLevel: 'Assigned Athletes & Biomechanics',
      badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      items: [
        'Athlete Video Ingestion & Agentic Vision Analysis',
        'Team Calendar & Facility Scheduling Management',
        'Athlete Performance Assessment Logging',
        'Unstructured RAG Narrative Search Access',
        'Restricted Access to Financial Billing Records'
      ]
    },
    parent: {
      label: 'Parent / Guardian',
      accessLevel: 'Restricted Personal Portal',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      items: [
        'Read-Only View of Registered Dependents',
        'Consolidated Family Billing & Invoices View',
        'Payment Schedule Selections (Upfront/Installments)',
        'No Access to Other Athletes\' Medical / Kinematic Data',
        'Restricted RAG Database Query Access'
      ]
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 p-6 border border-slate-800 shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <ShieldCheck className="w-64 h-64 text-emerald-400" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Firebase Authentication & Security Core</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Admin & Coach Authorization Center
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Enforcing zero-trust role access for youth personal, medical, and biometric datasets in compliance with COPPA, CCPA, and GDPR standards.
            </p>
          </div>

          <div className="flex items-center space-x-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Compliance Guard</div>
              <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                COPPA & GDPR Active
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Auth Box & Role Management */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-emerald-400" />
                Active Session
              </h2>
              <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full font-mono">
                {userProfile ? 'Authenticated' : 'Guest Mode'}
              </span>
            </div>

            {userProfile ? (
              <div className="space-y-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                      {userProfile.displayName ? userProfile.displayName.substring(0, 2).toUpperCase() : 'AH'}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{userProfile.displayName}</div>
                      <div className="text-xs text-slate-400 font-mono truncate max-w-[180px]">{userProfile.email}</div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Current Role:</span>
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold uppercase ${rolePermissions[userProfile.role].badgeColor}`}>
                      {userProfile.role}
                    </span>
                  </div>
                </div>

                {/* Role Switcher */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Switch Authorization Role
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['admin', 'coach', 'parent'] as UserRole[]).map((r) => (
                      <button
                        key={r}
                        onClick={() => onSwitchRole(r)}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold capitalize transition-all border ${
                          userProfile.role === r
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-lg shadow-emerald-500/20'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 italic">
                    Note: Testing role matrix dynamically updates permissions across Firestore security scopes.
                  </p>
                </div>

                <button
                  onClick={onLogout}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-800/50 text-xs font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out Session
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Sign in with Firebase Auth or select a simulated staff credential to access biometric tracking and scheduling logs.
                </p>

                <button
                  onClick={onLoginGoogle}
                  className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-3"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  Sign In with Google Auth
                </button>

                <div className="relative my-4 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-800"></div>
                  </div>
                  <span className="relative bg-slate-900 px-3 text-[10px] text-slate-500 uppercase font-mono tracking-wider">
                    Or Quick Demo Role
                  </span>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => onLoginDemo('admin')}
                    className="w-full py-2.5 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center justify-between transition-all"
                  >
                    <span>Login as Master Admin</span>
                    <Sparkles className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onLoginDemo('coach')}
                    className="w-full py-2.5 px-3 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-semibold flex items-center justify-between transition-all"
                  >
                    <span>Login as Head Coach</span>
                    <Users className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onLoginDemo('parent')}
                    className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-between transition-all"
                  >
                    <span>Login as Parent / Guardian</span>
                    <FileText className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Security Status Box */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              Firestore Security Setup
            </h3>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Default Rule:</span>
                <span className="text-rose-400 font-mono font-semibold">allow read, write: false</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Auth Validation:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Enforced
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Data Encryption:</span>
                <span className="text-emerald-400 font-semibold font-mono">AES-256 Cloud</span>
              </div>
            </div>
          </div>
        </div>

        {/* Permission Matrix & Privacy Standard Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-6">
            
            {/* Tab Navigation */}
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                  activeTab === 'overview'
                    ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                Role Permissions Matrix
              </button>
              <button
                onClick={() => setActiveTab('compliance')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                  activeTab === 'compliance'
                    ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                COPPA / CCPA / GDPR Rules
              </button>
            </div>

            {/* Tab 1: Role Permissions */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-400">
                  Active role authorization matrix defining data visibility and execution privileges for youth athletes and coaching staff.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(Object.keys(rolePermissions) as UserRole[]).map((rKey) => {
                    const perm = rolePermissions[rKey];
                    const isActive = userProfile?.role === rKey;

                    return (
                      <div
                        key={rKey}
                        className={`p-4 rounded-xl border transition-all ${
                          isActive
                            ? 'bg-slate-950 border-emerald-500/50 ring-1 ring-emerald-500/30'
                            : 'bg-slate-950/50 border-slate-800/80 opacity-80 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${perm.badgeColor}`}>
                            {rKey.toUpperCase()}
                          </span>
                          {isActive && (
                            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded uppercase">
                              Active Role
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-white mb-1">{perm.label}</h4>
                        <p className="text-[11px] text-slate-400 mb-3 font-mono">{perm.accessLevel}</p>

                        <ul className="space-y-2 text-xs text-slate-300">
                          {perm.items.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                              <span className="text-[11px] text-slate-300 leading-snug">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 2: Compliance Guidelines */}
            {activeTab === 'compliance' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <ShieldCheck className="w-5 h-5" />
                    Children&apos;s Online Privacy Protection Act (COPPA)
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    AcademyHub restricts youth biometric video ingestion to verifiable parental consent workflows. Video feeds, joint kinematics angles, and biomechanical scores are stored under encrypted Firestore documents accessible exclusively to verified coaching staff.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                      <Eye className="w-4 h-4" />
                      CCPA / Privacy Safeguards
                    </div>
                    <p className="text-xs text-slate-400">
                      Parents hold full right-to-know and deletion requests for youth biomechanic video logs and financial billing invoices.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                      <AlertTriangle className="w-4 h-4" />
                      GDPR Youth Data Protocols
                    </div>
                    <p className="text-xs text-slate-400">
                      Automatic pseudonymization of Athlete IDs (e.g. ATH-1092) in external AI model prompts and LLM-as-a-Judge audit routines.
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Audit Trail Log */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              Live Security Audit Trail
            </h3>
            <div className="space-y-2 font-mono text-[11px]">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between text-slate-300">
                <span className="text-emerald-400">[AUTH_SUCCESS] User session initialized via Firebase Auth</span>
                <span className="text-slate-500 text-[10px]">Just Now</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between text-slate-300">
                <span className="text-cyan-400">[ROLE_CHECK] Role set to &quot;{userProfile?.role || 'guest'}&quot; - Firestore Rules Active</span>
                <span className="text-slate-500 text-[10px]">1m ago</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between text-slate-300">
                <span className="text-slate-400">[COPPA_AUDIT] Biomechanical assessment collection &quot;athlete_assessments&quot; verified</span>
                <span className="text-slate-500 text-[10px]">3m ago</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
