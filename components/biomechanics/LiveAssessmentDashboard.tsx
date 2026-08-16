'use client';

import React, { useState } from 'react';
import { useAssessmentsSubscription } from '@/hooks/useAssessmentsSubscription';
import PerformanceTimelineChart from './PerformanceTimelineChart';
import DevelopmentalRadarChart from './DevelopmentalRadarChart';
import {
  Activity,
  Flame,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Filter,
  RefreshCw,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
  Database,
  ArrowUpDown,
  Tag,
  User,
  Upload,
} from 'lucide-react';

const ATHLETES_LIST = [
  { id: 'all', name: 'All Athletes (Consolidated)' },
  { id: 'ath_8042', name: 'Marcus Vance' },
  { id: 'ath_8043', name: 'Sarah Vance' },
  { id: 'ath_8044', name: 'Alex Johnson' },
  { id: 'ath_8045', name: 'Priya Sharma' },
];

const SPORTS_LIST = [
  'all',
  'Football (Soccer)',
  'Badminton',
  'Basketball',
  'Swimming',
  'Cricket',
];

export default function LiveAssessmentDashboard() {
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('all');
  const [selectedSport, setSelectedSport] = useState<string>('all');

  // Real-time Firestore onSnapshot subscription hook
  const {
    assessments,
    loading,
    error,
    isPermissionDenied,
    lastUpdated,
    isLive,
    totalCount,
    seedSampleData,
    refresh,
  } = useAssessmentsSubscription({
    athleteId: selectedAthleteId,
    sport: selectedSport,
  });

  const [isSeeding, setIsSeeding] = useState<boolean>(false);

  const handleSeed = async () => {
    setIsSeeding(true);
    await seedSampleData();
    setIsSeeding(false);
  };

  const currentAthleteObj = ATHLETES_LIST.find((a) => a.id === selectedAthleteId);

  return (
    <div className="space-y-6">
      {/* Live Connection & Filter Toolbar */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
              {/* Real-time Pulsating Live Indicator */}
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isLive ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-3 w-3 ${
                    isLive ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Live Athlete Assessment Telemetry & Radars
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> onSnapshot Active
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Automatically synchronizes historical performance trajectories and 6-axis developmental spiders.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={refresh}
              className="p-2 min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5"
              title="Force Refresh Snapshot"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync</span>
            </button>

            <button
              onClick={handleSeed}
              disabled={isSeeding}
              className="px-3 py-2 min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5"
            >
              <Database className="w-3.5 h-3.5 text-cyan-500" />
              <span>{isSeeding ? 'Seeding...' : 'Seed Sample Evals'}</span>
            </button>
          </div>
        </div>

        {/* Filters bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Filter Athlete:
            </label>
            <select
              value={selectedAthleteId}
              onChange={(e) => setSelectedAthleteId(e.target.value)}
              className="w-full h-11 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-semibold focus:outline-none focus:border-cyan-500"
            >
              {ATHLETES_LIST.map((ath) => (
                <option key={ath.id} value={ath.id}>
                  {ath.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> Filter Sport:
            </label>
            <select
              value={selectedSport}
              onChange={(e) => setSelectedSport(e.target.value)}
              className="w-full h-11 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-semibold focus:outline-none focus:border-purple-500"
            >
              {SPORTS_LIST.map((sp) => (
                <option key={sp} value={sp}>
                  {sp === 'all' ? 'All Sports (Cross-Discipline)' : sp}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col justify-end">
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-500">Live Snapshot Count:</span>
              <span className="font-bold text-cyan-600 dark:text-cyan-400">{totalCount} evaluations</span>
            </div>
          </div>
        </div>
      </div>

      {/* Permission Denied or Role-Based Fallback Alert */}
      {isPermissionDenied && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 text-xs space-y-1">
          <div className="flex items-center gap-2 font-bold">
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Role-Based Access Control / COPPA Security Guard Active</span>
          </div>
          <p className="text-[11px] text-amber-800 dark:text-amber-400">
            Firestore default-deny rules require Coach or Admin credentials to view all athlete biometric telemetry. Operating in safe local mirror mode.
          </p>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && assessments.length === 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 rounded-2xl bg-slate-100 dark:bg-slate-900 animate-pulse border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 text-xs font-mono">
            Connecting Firestore Snapshot Listener...
          </div>
          <div className="h-80 rounded-2xl bg-slate-100 dark:bg-slate-900 animate-pulse border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 text-xs font-mono">
            Generating Kinematic Radar Matrix...
          </div>
        </div>
      )}

      {/* Dual Analytics Grid: Performance Timeline + Developmental Spider Radar */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <PerformanceTimelineChart
          assessments={assessments}
          athleteName={selectedAthleteId !== 'all' ? currentAthleteObj?.name : undefined}
          selectedSport={selectedSport}
        />

        <DevelopmentalRadarChart
          assessments={assessments}
          athleteName={selectedAthleteId !== 'all' ? currentAthleteObj?.name : undefined}
          sport={selectedSport}
        />
      </div>

      {/* Real-time Assessment Evaluation Ledger */}
      <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Live Session Assessment Feed (Firestore: &quot;assessments&quot;)
            </h4>
          </div>
          <div className="text-[11px] font-mono text-slate-500">
            {lastUpdated ? `Last snapshot: ${lastUpdated.toLocaleTimeString()}` : 'Live stream ready'}
          </div>
        </div>

        {assessments.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            No evaluations match the active filter criteria.
          </div>
        ) : (
          <>
            {/* Mobile Card List View (<1024px) */}
            <div className="block lg:hidden flex flex-col gap-3">
              {assessments.map((item) => {
                const dateObj = typeof item.created_at === 'string' ? new Date(item.created_at) : new Date();
                const timeStr = dateObj.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                }) + ' ' + dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs"
                  >
                    {/* Header: Athlete Name, ID Badge, and Data Source Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white">
                          {item.athlete_name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ID: {item.athlete_id}
                        </div>
                      </div>
                      <span
                        className={`inline-block px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold ${
                          item.data_source === 'manual'
                            ? 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20'
                            : 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20'
                        }`}
                      >
                        {item.data_source === 'manual' ? 'Manual Coach' : 'AI Agentic'}
                      </span>
                    </div>

                    {/* Body: Sport, Drill/SOP, and Score/Grade Badge */}
                    <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                      <div>
                        <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                          {item.sport}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {item.grading_rubric_sop || item.exercise_type}
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <div className="flex items-center gap-1.5 font-mono font-black text-sm text-cyan-600 dark:text-cyan-400">
                          <span>{item.computed_score} pts</span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              (item.rubric_grade || 'A') === 'A'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            Grade {item.rubric_grade || 'A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Coach Notes */}
                    {item.qualitative_observations?.coach_notes && (
                      <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 text-[11px] text-slate-600 dark:text-slate-300 italic">
                        &quot;{item.qualitative_observations.coach_notes}&quot;
                      </div>
                    )}

                    {/* Fault Tags */}
                    {item.qualitative_observations?.fault_tags && item.qualitative_observations.fault_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.qualitative_observations.fault_tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-medium"
                          >
                            {tag.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Footer: Symmetrical Spacing showing Valid Reps and Date */}
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/80 dark:border-slate-800/80 font-mono text-slate-500 dark:text-slate-400">
                      <div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Valid Reps: {item.quantitative_metrics?.valid_reps ?? '-'}
                        </span>
                        {item.quantitative_metrics?.duration_seconds ? (
                          <span className="text-[10px] ml-1">({item.quantitative_metrics.duration_seconds}s)</span>
                        ) : null}
                      </div>
                      <div className="text-[10px]">{timeStr}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (>=1024px) */}
            <div className="overflow-x-auto w-full hidden lg:block">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Athlete</th>
                    <th className="py-2.5 px-3">Sport & Drill SOP</th>
                    <th className="py-2.5 px-3 text-center">Data Source</th>
                    <th className="py-2.5 px-3 text-center">Score / Grade</th>
                    <th className="py-2.5 px-3 text-center">Valid Reps</th>
                    <th className="py-2.5 px-3">Coach / Notes</th>
                    <th className="py-2.5 px-3 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                  {assessments.map((item) => {
                    const dateObj = typeof item.created_at === 'string' ? new Date(item.created_at) : new Date();
                    const timeStr = dateObj.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    }) + ' ' + dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-950/50 transition-colors"
                      >
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {item.athlete_name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            ID: {item.athlete_id}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {item.sport}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {item.grading_rubric_sop || item.exercise_type}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                              item.data_source === 'manual'
                                ? 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20'
                                : 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20'
                            }`}
                          >
                            {item.data_source === 'manual' ? 'Manual Coach' : 'AI Agentic'}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <div className="font-mono font-black text-cyan-600 dark:text-cyan-400 text-sm">
                            {item.computed_score}
                          </div>
                          <span
                            className={`text-[10px] font-bold font-mono px-1.5 py-0.2 rounded ${
                              (item.rubric_grade || 'A') === 'A'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            Grade {item.rubric_grade || 'A'}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center font-mono">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {item.quantitative_metrics?.valid_reps ?? '-'}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {item.quantitative_metrics?.duration_seconds ? `${item.quantitative_metrics.duration_seconds}s` : ''}
                          </span>
                        </td>

                        <td className="py-3 px-3 max-w-xs">
                          <div className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                            {item.coach_name || 'Coach Evaluation'}
                          </div>
                          {item.qualitative_observations?.coach_notes && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 italic truncate">
                              &quot;{item.qualitative_observations.coach_notes}&quot;
                            </div>
                          )}
                          {item.qualitative_observations?.fault_tags && item.qualitative_observations.fault_tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.qualitative_observations.fault_tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                                >
                                  {tag.replace('_', ' ')}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right font-mono text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {timeStr}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
