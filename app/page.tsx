'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import GeminiAdvisor from '@/components/GeminiAdvisor';
import BiomechanicsSection from '@/components/biomechanics/BiomechanicsSection';
import SchedulingSection from '@/components/scheduling/SchedulingSection';
import BillingSection from '@/components/billing/BillingSection';
import AuthSection from '@/components/auth/AuthSection';
import AthleteProfileSection from '@/components/profiles/AthleteProfileSection';
import { useAuth } from '@/lib/authContext';
import {
  Activity,
  Users,
  Calendar,
  CreditCard,
  TrendingUp,
  CheckCircle2,
  Zap,
  ArrowUpRight,
  Flame,
  Award,
  UserCheck,
} from 'lucide-react';

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, role, loading } = useAuth();
  const [users, setUsers] = useState<Array<{ uid: string; email: string; displayName: string | null; role: string }>>([]);
  const [adminBusy, setAdminBusy] = useState(false);

  useEffect(() => {
    if (!user || role !== 'admin') {
      return;
    }

    const loadUsers = async () => {
      const currentToken = await user.getIdToken();
      const response = await fetch('/api/users/role', {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      });

      if (!response.ok) {
        return;
      }

      const payload = await response.json();
      setUsers(payload.users ?? []);
    };

    loadUsers();
  }, [role, user]);

  const activeTab = searchParams.get('tab') ?? 'dashboard';
  const setActiveTab = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`/?${params.toString()}`);
  };

  const handleRoleChange = async (uid: string, nextRole: string) => {
    if (!user) return;
    setAdminBusy(true);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/users/role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ uid, role: nextRole }),
      });

      if (!response.ok) {
        throw new Error('Role update failed');
      }

      const payload = await response.json();
      setUsers((current) => current.map((entry) => entry.uid === uid ? { ...entry, role: payload.role } : entry));
    } catch (err) {
      console.error('Unable to update role:', err);
    } finally {
      setAdminBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-5 text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm">
          Loading AcademyHub…
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <AuthSection />
      </div>
    );
  }

  const currentRole = role || 'Authenticated';
  const currentUserName = user.displayName || user.email?.split('@')[0] || 'User';
  const athleteCount = 0;
  const sessionCount = 0;

  const renderDashboard = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
        <div className="p-4 md:p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Active Athletes</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-3 font-mono">{athleteCount} Registered</div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
            <TrendingUp className="w-3 h-3" /> Live counts will load in Phase 4
          </div>
        </div>

        <div className="p-4 md:p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-sans">Avg Form Quality Index</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-3 font-mono">--</div>
          <div className="flex items-center gap-1 text-[11px] text-cyan-600 dark:text-cyan-400 mt-1 font-semibold">
            <Zap className="w-3 h-3" /> Real API data pending
          </div>
        </div>

        <div className="p-4 md:p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Facility Capacity</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-3 font-mono">{sessionCount}</div>
          <div className="flex items-center gap-1 text-[11px] text-purple-600 dark:text-purple-400 mt-1 font-semibold">
            <CheckCircle2 className="w-3 h-3" /> Scheduled sessions will be live in Phase 5
          </div>
        </div>

        <div className="p-4 md:p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Monthly Revenue</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-3 font-mono">
            {role === 'coach' ? '🔒 Restricted' : '—'}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-semibold">
            <Award className="w-3 h-3" /> Admin analytics land in Phase 7
          </div>
        </div>
      </div>

      <GeminiAdvisor />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="p-4 md:p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
              Recent Cross-Sport Assessments
            </h3>
            <button
              onClick={() => setActiveTab('biomechanics')}
              className="min-h-[44px] text-sm sm:text-xs text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 self-start sm:self-auto"
            >
              View All <ArrowUpRight className="w-4 h-4 sm:w-3 sm:h-3" />
            </button>
          </div>
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-slate-900 dark:text-white">Assessment history</div>
                <div className="text-slate-500 dark:text-slate-400 text-[11px]">Seeded data begins in Phase 2</div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-cyan-600 dark:text-cyan-400">--</div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Pending seed</div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-500 dark:text-purple-400" />
              Upcoming Facility Reservations
            </h3>
            <button
              onClick={() => setActiveTab('scheduling')}
              className="min-h-[44px] text-sm sm:text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 self-start sm:self-auto"
            >
              Manage Calendar <ArrowUpRight className="w-4 h-4 sm:w-3 sm:h-3" />
            </button>
          </div>
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-slate-900 dark:text-white">Scheduling</div>
                <div className="text-slate-500 dark:text-slate-400 text-[11px]">Server-side scheduling is Phase 5</div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-purple-600 dark:text-purple-400">{sessionCount}</div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Seed pending</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950 transition-colors duration-200">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="w-full max-w-screen-xl mx-auto p-4 md:p-6 lg:p-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 md:p-6 lg:p-8 rounded-2xl bg-white dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-slate-950/50">
          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-md border border-cyan-500/20">
                Academy Management Dashboard
              </span>
              <span className={`text-xs font-mono font-bold uppercase px-2 py-0.5 rounded-md border ${
                role === 'admin'
                  ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20'
                  : role === 'coach'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    : role === 'parent'
                      ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                      : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
              }`}>
                Role: {currentRole} ({currentUserName})
              </span>
              <span className={`text-xs font-mono px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                user
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                  : 'text-slate-500 dark:text-slate-400 bg-slate-500/10 border-slate-500/20'
              }`}>
                <CheckCircle2 className="w-3 h-3" /> Live
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              AcademyHub: Athletic Biomechanics & Family Ledger
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
              Multi-agent joint kinematics, cross-sport youth profiles, coach reservation conflict engine, and consolidated family invoices with 10% sibling discounts.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={() => setActiveTab('profiles')}
              className="min-h-[44px] justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-all border border-slate-200 dark:border-slate-700"
            >
              <UserCheck className="w-5 h-5 text-cyan-500" />
              Student Profiles
            </button>
            <button
              onClick={() => setActiveTab('biomechanics')}
              className="min-h-[44px] justify-center bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-md transition-all"
            >
              <Activity className="w-5 h-5" />
              New Video Audit
            </button>
          </div>
        </div>

        {role === 'admin' && (
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 md:p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Admin Role Assignment</h2>
              <span className="text-[10px] uppercase tracking-wide text-cyan-600 dark:text-cyan-400 font-mono">Restricted</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <th className="pb-2 pr-4 font-semibold">Email</th>
                    <th className="pb-2 pr-4 font-semibold">Display name</th>
                    <th className="pb-2 pr-4 font-semibold">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-4 text-slate-500 dark:text-slate-400">No users found yet.</td>
                    </tr>
                  ) : (
                    users.map((entry) => (
                      <tr key={entry.uid} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                        <td className="py-3 pr-4 font-mono text-slate-700 dark:text-slate-200">{entry.email}</td>
                        <td className="py-3 pr-4 text-slate-700 dark:text-slate-200">{entry.displayName || '—'}</td>
                        <td className="py-3 pr-4">
                          <select
                            value={entry.role}
                            disabled={adminBusy}
                            onChange={(event) => handleRoleChange(entry.uid, event.target.value)}
                            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 px-2 py-1.5 text-slate-900 dark:text-slate-100"
                          >
                            <option value="admin">admin</option>
                            <option value="coach">coach</option>
                            <option value="parent">parent</option>
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'profiles' && <AthleteProfileSection />}
        {activeTab === 'biomechanics' && <BiomechanicsSection />}
        {activeTab === 'scheduling' && <SchedulingSection />}
        {activeTab === 'billing' && <BillingSection />}
        {activeTab === 'auth' && <AuthSection />}
      </main>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-5 text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm">
          Loading AcademyHub…
        </div>
      </div>
    }>
      <HomePageContent />
    </Suspense>
  );
}
