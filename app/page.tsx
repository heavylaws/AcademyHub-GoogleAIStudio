'use client';

import React, { useState } from 'react';
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
  ShieldCheck,
  CheckCircle2,
  Zap,
  ArrowUpRight,
  Flame,
  Award,
  UserCheck
} from 'lucide-react';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { user, role } = useAuth();

  // Dynamic real-time stats count
  const [athleteCount, setAthleteCount] = useState<number>(4);
  const [sessionCount, setSessionCount] = useState<number>(3);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAth = localStorage.getItem('academyhub_athletes');
      if (savedAth) {
        try { setAthleteCount(JSON.parse(savedAth).length); } catch {}
      }
      const savedSess = localStorage.getItem('academyhub_sessions');
      if (savedSess) {
        try { setSessionCount(JSON.parse(savedSess).length); } catch {}
      }
    }
  }, [activeTab]);

  const currentRole = role || (user ? 'Authenticated' : 'Guest');
  const currentUserName = user?.displayName || user?.email?.split('@')[0] || (user ? 'User' : 'Guest');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950 transition-colors duration-200">
      {/* Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Container */}
      <main className="w-full max-w-screen-xl mx-auto p-4 md:p-6 lg:p-8 space-y-8">
        {/* Top Header Banner */}
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
                <CheckCircle2 className="w-3 h-3" /> {user ? 'Live' : 'Guest'}
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

        {/* Tab Content Rendering */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* KPI Stat Cards */}
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
                  <TrendingUp className="w-3 h-3" /> Real-Time Local & Firestore Sync
                </div>
              </div>

              <div className="p-4 md:p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-sans">Avg Form Quality Index</span>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white mt-3 font-mono">92.4%</div>
                <div className="flex items-center gap-1 text-[11px] text-cyan-600 dark:text-cyan-400 mt-1 font-semibold">
                  <Zap className="w-3 h-3" /> PoseNet joint tracking
                </div>
              </div>

              <div className="p-4 md:p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Facility Capacity</span>
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white mt-3 font-mono">87.5%</div>
                <div className="flex items-center gap-1 text-[11px] text-purple-600 dark:text-purple-400 mt-1 font-semibold">
                  <CheckCircle2 className="w-3 h-3" /> Conflict guard active
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
                  {role === 'coach' ? '🔒 Restricted' : '$24,850'}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-semibold">
                  <Award className="w-3 h-3" /> 10% Sibling rule applied
                </div>
              </div>
            </div>

            {/* AI Advisor Panel */}
            <GeminiAdvisor />

            {/* Quick Overview Grid */}
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
                  {[
                    { name: 'Marcus Vance', sport: 'Football (Soccer)', exercise: 'Sprint Acceleration', score: '94.0', status: 'Optimal' },
                    { name: 'Sarah Vance', sport: 'Badminton', exercise: 'Overhead Smash', score: '96.0', status: 'Peak Kinematics' },
                    { name: 'Alex Johnson', sport: 'Basketball', exercise: 'Vertical Jump', score: '88.5', status: 'Needs Mobility Work' },
                  ].map((ath, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{ath.name}</div>
                        <div className="text-slate-500 dark:text-slate-400 text-[11px]">{ath.sport} — {ath.exercise}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-cyan-600 dark:text-cyan-400">{ath.score}% Score</div>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400">{ath.status}</div>
                      </div>
                    </div>
                  ))}
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
                  {[
                    { title: 'Plyometric & Jump Mechanics', facility: 'Main Court A', time: '14:00 - 15:30', coach: 'Coach Davis' },
                    { title: 'Sprint Velocity Drills', facility: 'Track Strip 1', time: '16:00 - 17:00', coach: 'Coach Taylor' },
                    { title: 'Agility & Reaction Training', facility: 'Turf Bay 2', time: '17:30 - 19:00', coach: 'Coach Morgan' },
                  ].map((item, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{item.title}</div>
                        <div className="text-slate-500 dark:text-slate-400 text-[11px]">{item.facility} • {item.coach}</div>
                      </div>
                      <div className="font-mono text-purple-700 dark:text-purple-300 font-bold bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20">
                        {item.time}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Sub-Components */}
        {activeTab === 'profiles' && <AthleteProfileSection />}
        {activeTab === 'biomechanics' && <BiomechanicsSection />}
        {activeTab === 'scheduling' && <SchedulingSection />}
        {activeTab === 'billing' && <BillingSection />}
        {activeTab === 'auth' && <AuthSection />}
      </main>
    </div>
  );
}
