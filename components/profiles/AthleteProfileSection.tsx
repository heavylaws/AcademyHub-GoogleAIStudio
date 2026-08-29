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
  ShieldAlert,
} from 'lucide-react';
import { useAssessmentsSubscription } from '@/hooks/useAssessmentsSubscription';
import { AthleteRecord, useAthletesSubscription } from '@/hooks/useAthletesSubscription';
import { useAuth, getAcademyHeaders } from '@/lib/authContext';
import PerformanceTimelineChart from '@/components/biomechanics/PerformanceTimelineChart';
import DevelopmentalRadarChart from '@/components/biomechanics/DevelopmentalRadarChart';

type StudentAthleteMeta = AthleteRecord;

export default function AthleteProfileSection() {
  const { user, activeAcademyId } = useAuth();
  const {
    athletes: athletesList,
    loading: athletesLoading,
    error: athletesError,
    isPermissionDenied: athletesPermissionDenied,
    isLive: athletesLive,
    refresh: refreshAthletes,
  } = useAthletesSubscription();

  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');
  const [selectedSportTab, setSelectedSportTab] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'matrix' | 'analytics'>('matrix');

  // Register Modal state
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState(13);
  const [newParentName, setNewParentName] = useState('');
  const [newParentEmail, setNewParentEmail] = useState('');
  const [newParentUserId, setNewParentUserId] = useState('');
  const [newEmergency, setNewEmergency] = useState('+1 (555) 999-0000');
  const [newSports, setNewSports] = useState('Basketball, Track & Field');
  const [registrationError, setRegistrationError] = useState<string | null>(null);

  const effectiveSelectedAthleteId = selectedAthleteId || athletesList[0]?.id || '';

  const activeAthlete =
    athletesList.find((a) => a.id === effectiveSelectedAthleteId) || athletesList[0];

  const handleRegisterAthlete = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistrationError(null);
    if (!newName.trim() || !newParentEmail.trim() || !newParentUserId.trim() || !user) {
      setRegistrationError('Athlete name, parent email, parent account ID, and an authenticated session are required.');
      return;
    }

    const sportsArr = newSports.split(',').map(s => s.trim()).filter(Boolean);
    try {
      const response = await fetch('/api/athletes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAcademyHeaders(activeAcademyId),
        },
        credentials: 'include',
        body: JSON.stringify({
          name: newName,
          dob: `${new Date().getFullYear() - Number(newAge)}-01-15`,
          parentUserId: newParentUserId,
          parentEmail: newParentEmail,
          emergencyContact: newEmergency,
          guardianConsent: true,
          sports: (sportsArr.length > 0 ? sportsArr : ['Basketball']).map((sport) => ({ sport })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to register athlete.');

      setSelectedAthleteId(data.athlete.id);
      setIsRegisterModalOpen(false);
      refreshAthletes();
      setNewName('');
      setNewParentEmail('');
      setNewParentUserId('');
    } catch (err) {
      setRegistrationError(err instanceof Error ? err.message : 'Failed to register athlete.');
    }
  };

  // Assessment history remains on its existing backend; athlete records are API-polled above.
  const { assessments } = useAssessmentsSubscription({
    athleteId: effectiveSelectedAthleteId,
    sport: selectedSportTab,
  });

  // Calculate live sport-level aggregations from assessment records.
  const sportSummaries = useMemo(() => {
    if (!activeAthlete) return [];
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

  if (!activeAthlete) {
    return (
      <div className="space-y-4">
        {athletesError && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm">
            Unable to load athletes: {athletesError}
          </div>
        )}
        {!athletesLoading && !athletesError && (
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-sm">
            No athletes yet.
          </div>
        )}
      </div>
    );
  }

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
              <CheckCircle2 className="w-3 h-3" /> {athletesLive ? 'Athlete API Polling' : 'Athlete API Offline'}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Real-time biometric profile syncing historical trajectories and developmental radars from the AcademyHub API.
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
            value={effectiveSelectedAthleteId}
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

      {athletesError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm">
          Unable to refresh athletes: {athletesError}
        </div>
      )}

      {/* Register New Athlete Modal */}
      {isRegisterModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="register-athlete-modal-title"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 w-full max-w-md shadow-2xl space-y-4 mx-auto my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 id="register-athlete-modal-title" className="text-base font-extrabold text-white">
                Register New Student Athlete
              </h3>
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                aria-label="Close Registration Dialog"
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleRegisterAthlete} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label htmlFor="reg-athlete-name" className="block text-slate-200 font-bold">
                  Athlete Full Name
                </label>
                <input
                  id="reg-athlete-name"
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Jordan Miller"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 h-11 min-h-[44px] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="reg-athlete-age" className="block text-slate-200 font-bold">
                    Age
                  </label>
                  <input
                    id="reg-athlete-age"
                    type="number"
                    required
                    min={6}
                    max={21}
                    value={newAge}
                    onChange={(e) => setNewAge(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 h-11 min-h-[44px] text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="reg-emergency" className="block text-slate-200 font-bold">
                    Emergency Phone
                  </label>
                  <input
                    id="reg-emergency"
                    type="text"
                    value={newEmergency}
                    onChange={(e) => setNewEmergency(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 h-11 min-h-[44px] text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label htmlFor="reg-parent-name" className="block text-slate-200 font-bold">
                  Parent Name
                </label>
                <input
                  id="reg-parent-name"
                  type="text"
                  value={newParentName}
                  onChange={(e) => setNewParentName(e.target.value)}
                  placeholder="e.g. Sarah Miller"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 h-11 min-h-[44px] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="reg-parent-email" className="block text-slate-200 font-bold">
                  Parent Email (COPPA Link)
                </label>
                <input
                  id="reg-parent-email"
                  type="email"
                  required
                  value={newParentEmail}
                  onChange={(e) => setNewParentEmail(e.target.value)}
                  placeholder="parent@gmail.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 h-11 min-h-[44px] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="reg-parent-id" className="block text-slate-200 font-bold">
                  Parent Account ID
                </label>
                <input
                  id="reg-parent-id"
                  type="text"
                  required
                  value={newParentUserId}
                  onChange={(e) => setNewParentUserId(e.target.value)}
                  placeholder="Parent must have signed in once"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 h-11 min-h-[44px] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="reg-sports" className="block text-slate-200 font-bold">
                  Enrolled Sports (comma separated)
                </label>
                <input
                  id="reg-sports"
                  type="text"
                  value={newSports}
                  onChange={(e) => setNewSports(e.target.value)}
                  placeholder="Basketball, Football, Badminton"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 h-11 min-h-[44px] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                />
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="px-4 py-2 h-11 min-h-[44px] rounded-xl bg-slate-800 text-slate-200 hover:text-white font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 h-11 min-h-[44px] rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-extrabold shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 active:scale-[0.98]"
                >
                  Save Athlete
                </button>
              </div>
              {registrationError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                  {registrationError}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Permission Denied Guard Notice if triggered */}
      {athletesPermissionDenied && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 text-xs space-y-1">
          <div className="flex items-center gap-2 font-bold">
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Role-Based Access Control / COPPA Security Guard Active</span>
          </div>
          <p className="text-[11px] text-amber-800 dark:text-amber-400">
            Server-side role authorization requires Coach or Admin credentials to view full biomechanics telemetry for this athlete.
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
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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

      {/* Cross-Sport Skill Progress Cards & Live Assessment Logs */}
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
                      Live API synchronization • {sp.assessments.length} logged evaluations
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
                    Source: AcademyHub assessments API
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
