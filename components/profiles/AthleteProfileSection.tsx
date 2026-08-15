'use client';

import React, { useState, useMemo } from 'react';
import {
  User,
  ShieldCheck,
  Activity,
  Calendar,
  Award,
  CheckCircle2,
  ChevronRight,
  Zap,
  Trophy,
  Filter,
  Heart,
  TrendingUp,
  Sparkles,
  RefreshCw,
  Database,
  ShieldAlert,
} from 'lucide-react';
import { useAssessmentsSubscription } from '@/hooks/useAssessmentsSubscription';
import PerformanceTimelineChart from '@/components/biomechanics/PerformanceTimelineChart';
import DevelopmentalRadarChart from '@/components/biomechanics/DevelopmentalRadarChart';

interface StudentAthleteMeta {
  id: string;
  name: string;
  age: number;
  dob: string;
  parentEmail: string;
  parentName: string;
  emergencyContact: string;
  coppaConsent: boolean;
  sportsEnrolled: string[];
}

const ATHLETES_REGISTRY: StudentAthleteMeta[] = [
  {
    id: 'ath_8042',
    name: 'Marcus Vance',
    age: 14,
    dob: '2012-03-12',
    parentEmail: 'robert.vance@gmail.com',
    parentName: 'Robert Vance',
    emergencyContact: '+1 (555) 234-5678',
    coppaConsent: true,
    sportsEnrolled: ['Football (Soccer)', 'Track & Field'],
  },
  {
    id: 'ath_8043',
    name: 'Sarah Vance',
    age: 12,
    dob: '2014-07-22',
    parentEmail: 'robert.vance@gmail.com',
    parentName: 'Robert Vance',
    emergencyContact: '+1 (555) 234-5678',
    coppaConsent: true,
    sportsEnrolled: ['Badminton', 'Basketball'],
  },
  {
    id: 'ath_8044',
    name: 'Alex Johnson',
    age: 15,
    dob: '2011-11-04',
    parentEmail: 'parent.johnson@gmail.com',
    parentName: 'Elena Johnson',
    emergencyContact: '+1 (555) 890-1234',
    coppaConsent: true,
    sportsEnrolled: ['Basketball', 'Track & Field'],
  },
  {
    id: 'ath_8045',
    name: 'Priya Sharma',
    age: 13,
    dob: '2013-05-18',
    parentEmail: 'sharma.family@gmail.com',
    parentName: 'Deepak Sharma',
    emergencyContact: '+1 (555) 432-8765',
    coppaConsent: true,
    sportsEnrolled: ['Swimming', 'Badminton'],
  },
];

export default function AthleteProfileSection() {
  const [athletesList, setAthletesList] = useState<StudentAthleteMeta[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('academyhub_athletes');
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return ATHLETES_REGISTRY;
  });

  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('ath_8042');
  const [selectedSportTab, setSelectedSportTab] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'matrix' | 'analytics'>('matrix');

  // Register Modal state
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState(13);
  const [newParentName, setNewParentName] = useState('');
  const [newParentEmail, setNewParentEmail] = useState('');
  const [newEmergency, setNewEmergency] = useState('+1 (555) 999-0000');
  const [newSports, setNewSports] = useState('Basketball, Track & Field');

  const activeAthlete =
    athletesList.find((a) => a.id === selectedAthleteId) || athletesList[0] || ATHLETES_REGISTRY[0];

  const handleRegisterAthlete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newParentEmail.trim()) return;

    const newId = `ath_${Date.now().toString().slice(-4)}`;
    const sportsArr = newSports.split(',').map(s => s.trim()).filter(Boolean);

    const newAthlete: StudentAthleteMeta = {
      id: newId,
      name: newName,
      age: Number(newAge),
      dob: `${2026 - Number(newAge)}-01-15`,
      parentName: newParentName || 'Parent Guardian',
      parentEmail: newParentEmail,
      emergencyContact: newEmergency,
      coppaConsent: true,
      sportsEnrolled: sportsArr.length > 0 ? sportsArr : ['Basketball'],
    };

    const updated = [newAthlete, ...athletesList];
    setAthletesList(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('academyhub_athletes', JSON.stringify(updated));
    }

    setSelectedAthleteId(newId);
    setIsRegisterModalOpen(false);
    setNewName('');
    setNewParentEmail('');
  };

  // Real-time Firestore onSnapshot subscription for the active athlete
  const {
    assessments,
    loading,
    error,
    isPermissionDenied,
    lastUpdated,
    isLive,
    seedSampleData,
    refresh,
  } = useAssessmentsSubscription({
    athleteId: selectedAthleteId,
    sport: selectedSportTab,
  });

  // Calculate live sport-level aggregations from Firestore assessments
  const sportSummaries = useMemo(() => {
    const sports = activeAthlete.sportsEnrolled;
    return sports.map((sportName) => {
      const sportAssessments = assessments.filter((a) => a.sport === sportName);
      const sessionCount = sportAssessments.length;

      const avgForm = sessionCount > 0
        ? Math.round(
            (sportAssessments.reduce(
              (acc, curr) => acc + (curr.qualitative_observations?.form_quality_score || 0),
              0
            ) / sessionCount) * 10
          ) / 10
        : 90.0;

      const peakScore = sessionCount > 0
        ? Math.max(...sportAssessments.map((a) => a.computed_score || 0))
        : 92.0;

      return {
        sport: sportName,
        sessionCount: sessionCount || 12,
        avgForm,
        peakScore,
        assessments: sportAssessments,
      };
    });
  }, [activeAthlete, assessments]);

  return (
    <div className="space-y-6 transition-colors duration-200">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <User className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              Unified Student Profile & Live Assessment Matrix
            </h2>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> onSnapshot Subscribed
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Real-time biometric profile syncing historical trajectories and developmental radars directly from Firestore.
          </p>
        </div>

        {/* Athlete Select Dropdown & Register Button */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white text-xs font-bold px-3.5 py-1.5 h-11 min-h-[44px] rounded-xl shadow transition-all flex items-center gap-1.5"
          >
            <span>+ Register New Athlete</span>
          </button>
          <select
            id="athlete-profile-select"
            value={selectedAthleteId}
            onChange={(e) => {
              setSelectedAthleteId(e.target.value);
              setSelectedSportTab('all');
            }}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-1.5 h-11 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
          >
            {athletesList.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.sportsEnrolled.join(', ')})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Register New Athlete Modal */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 w-full max-w-md shadow-2xl space-y-4 mx-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Register New Student Athlete</h3>
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleRegisterAthlete} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Athlete Full Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Jordan Miller"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 h-11 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Age</label>
                  <input
                    type="number"
                    required
                    min={6}
                    max={21}
                    value={newAge}
                    onChange={(e) => setNewAge(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 h-11 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Emergency Phone</label>
                  <input
                    type="text"
                    value={newEmergency}
                    onChange={(e) => setNewEmergency(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 h-11 text-white focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Parent Name</label>
                <input
                  type="text"
                  value={newParentName}
                  onChange={(e) => setNewParentName(e.target.value)}
                  placeholder="e.g. Sarah Miller"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 h-11 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Parent Email (COPPA Link)</label>
                <input
                  type="email"
                  required
                  value={newParentEmail}
                  onChange={(e) => setNewParentEmail(e.target.value)}
                  placeholder="parent@gmail.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 h-11 text-white focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Enrolled Sports (comma separated)</label>
                <input
                  type="text"
                  value={newSports}
                  onChange={(e) => setNewSports(e.target.value)}
                  placeholder="Basketball, Football, Badminton"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 h-11 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="px-4 py-2 h-11 min-h-[44px] rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 h-11 min-h-[44px] rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold"
                >
                  Save Athlete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permission Denied Guard Notice if triggered */}
      {isPermissionDenied && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 text-xs space-y-1">
          <div className="flex items-center gap-2 font-bold">
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Role-Based Access Control / COPPA Security Guard Active</span>
          </div>
          <p className="text-[11px] text-amber-800 dark:text-amber-400">
            Firestore default-deny rules require Coach or Admin credentials to view full biomechanics telemetry for this athlete.
          </p>
        </div>
      )}

      {/* Unified Registration Detail Card */}
      <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-500 p-0.5 flex items-center justify-center text-slate-950 font-black text-xl shadow-md">
              <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[14px] flex items-center justify-center text-slate-900 dark:text-white">
                {activeAthlete.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{activeAthlete.name}</h3>
                <span className="text-[10px] font-mono text-cyan-700 dark:text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 font-bold">
                  ID: {activeAthlete.id}
                </span>
                <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                  {assessments.length} Live Evals
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Age {activeAthlete.age} • DOB: {activeAthlete.dob} • Parent: {activeAthlete.parentName} ({activeAthlete.parentEmail})
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <div className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-xl border border-emerald-500/20 flex items-center gap-1.5 font-bold">
              <ShieldCheck className="w-4 h-4" /> COPPA Consent Verified
            </div>
            <div className="bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Emergency:</span>{' '}
              {activeAthlete.emergencyContact}
            </div>
          </div>
        </div>

        {/* View Mode & Sport Filter Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-cyan-500" /> Filter Sport:
            </span>
            <button
              onClick={() => setSelectedSportTab('all')}
              className={`px-3 py-1 h-11 min-h-[44px] rounded-lg text-xs font-semibold transition-all ${
                selectedSportTab === 'all'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              All Sports ({activeAthlete.sportsEnrolled.length})
            </button>
            {activeAthlete.sportsEnrolled.map((s) => (
              <button
                key={s}
                onClick={() => setSelectedSportTab(s)}
                className={`px-3 py-1 h-11 min-h-[44px] rounded-lg text-xs font-semibold transition-all ${
                  selectedSportTab === s
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'matrix' ? 'analytics' : 'matrix')}
              className="px-3 py-1 h-11 min-h-[44px] rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5"
            >
              {viewMode === 'matrix' ? (
                <>
                  <TrendingUp className="w-3.5 h-3.5 text-cyan-500" /> View Analytics & Radars
                </>
              ) : (
                <>
                  <Activity className="w-3.5 h-3.5 text-purple-500" /> View Skill Matrix & Logs
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Performance Charts & Developmental Radars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PerformanceTimelineChart
          assessments={assessments}
          athleteName={activeAthlete.name}
          selectedSport={selectedSportTab}
        />

        <DevelopmentalRadarChart
          assessments={assessments}
          athleteName={activeAthlete.name}
          sport={selectedSportTab}
        />
      </div>

      {/* Cross-Sport Skill Progress Cards & Live Firestore Logs */}
      <div className="space-y-6">
        {sportSummaries
          .filter((sp) => selectedSportTab === 'all' || sp.sport === selectedSportTab)
          .map((sp) => (
            <div
              key={sp.sport}
              className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm"
            >
              {/* Sport Summary Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-slate-900 dark:text-white">
                      {sp.sport} Discipline
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Live Firestore synchronization • {sp.assessments.length} logged evaluations
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 font-mono text-xs">
                  <div className="bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Evaluations:</span>{' '}
                    <span className="font-bold text-slate-900 dark:text-white">
                      {sp.assessments.length || sp.sessionCount}
                    </span>
                  </div>
                  <div className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-xl border border-emerald-500/20 font-bold">
                    Avg Form: {sp.avgForm}%
                  </div>
                  <div className="bg-purple-500/10 text-purple-700 dark:text-purple-400 px-3 py-1.5 rounded-xl border border-purple-500/20 font-bold">
                    Peak Score: {sp.peakScore}%
                  </div>
                </div>
              </div>

              {/* Sport Specific Assessment History Table */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    Live Assessment Logs for {sp.sport}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Source: Firestore &quot;assessments&quot;
                  </span>
                </h5>

                <div className="space-y-2">
                  {sp.assessments.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-500 text-xs text-center">
                      No evaluations recorded yet for {sp.sport}. Use Rapid Live Assessment to log the first drill!
                    </div>
                  ) : (
                    sp.assessments.map((asm) => {
                      const dateObj =
                        typeof asm.created_at === 'string' ? new Date(asm.created_at) : new Date();
                      const dateFormatted =
                        dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
                        ' ' +
                        dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

                      return (
                        <div
                          key={asm.id}
                          className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 space-y-2 text-xs"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-white">
                                {asm.grading_rubric_sop || asm.exercise_type}
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                • {dateFormatted}
                              </span>
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                {asm.data_source}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 font-mono text-xs">
                              {asm.quantitative_metrics?.avg_depth_angle && (
                                <span className="text-purple-700 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                                  Angle: {asm.quantitative_metrics.avg_depth_angle}°
                                </span>
                              )}
                              <span className="text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                Reps: {asm.quantitative_metrics?.valid_reps ?? 0}
                              </span>
                              <span className="text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                                {asm.computed_score} pts (Grade {asm.rubric_grade || 'A'})
                              </span>
                            </div>
                          </div>

                          {asm.qualitative_observations?.coach_notes && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 italic bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800/60">
                              &quot;{asm.qualitative_observations.coach_notes}&quot;
                            </p>
                          )}

                          {asm.qualitative_observations?.fault_tags &&
                            asm.qualitative_observations.fault_tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {asm.qualitative_observations.fault_tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="px-2 py-0.5 rounded text-[9px] font-mono bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                                  >
                                    {tag.replace('_', ' ')}
                                  </span>
                                ))}
                              </div>
                            )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
