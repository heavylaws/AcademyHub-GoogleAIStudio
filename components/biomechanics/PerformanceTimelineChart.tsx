'use client';

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Assessment } from '@/types/assessment';
import { TrendingUp, Activity, Zap, Flame, Clock, Award, ShieldAlert } from 'lucide-react';

interface PerformanceTimelineChartProps {
  assessments: Assessment[];
  athleteName?: string;
  selectedSport?: string;
}

export default function PerformanceTimelineChart({
  assessments,
  athleteName,
  selectedSport,
}: PerformanceTimelineChartProps) {
  const [metricView, setMetricView] = useState<'composite' | 'form_endurance' | 'reps_tempo' | 'all'>('composite');

  // Format data in chronological order (oldest to newest for the timeline)
  const chartData = useMemo(() => {
    const sorted = [...assessments].sort((a, b) => {
      const timeA = typeof a.created_at === 'string' ? new Date(a.created_at).getTime() : 0;
      const timeB = typeof b.created_at === 'string' ? new Date(b.created_at).getTime() : 0;
      return timeA - timeB;
    });

    return sorted.map((asm, index) => {
      const dateObj = typeof asm.created_at === 'string' ? new Date(asm.created_at) : new Date();
      const formattedDate = dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      const formattedTime = dateObj.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const reps = asm.quantitative_metrics?.valid_reps || 0;
      const duration = asm.quantitative_metrics?.duration_seconds || 30;
      const cadence = Math.round((reps / (duration / 60)) * 10) / 10;

      return {
        sessionIndex: `S${index + 1}`,
        rawId: asm.id,
        date: formattedDate,
        time: formattedTime,
        fullDate: `${formattedDate} at ${formattedTime}`,
        exercise: asm.grading_rubric_sop || asm.exercise_type,
        sport: asm.sport,
        athlete: asm.athlete_name,
        score: Number(asm.computed_score || 0),
        formQuality: Number(asm.qualitative_observations?.form_quality_score || 0),
        endurance: Number(asm.qualitative_observations?.endurance_score || 0),
        reps: reps,
        cadence: cadence,
        depthAngle: asm.quantitative_metrics?.avg_depth_angle || null,
        grade: asm.rubric_grade || 'A',
        source: asm.data_source,
        faultsCount: asm.qualitative_observations?.fault_tags?.length || 0,
        coachNotes: asm.qualitative_observations?.coach_notes || '',
      };
    });
  }, [assessments]);

  // Aggregate stats
  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return { avgScore: 0, peakScore: 0, totalSessions: 0, trendDelta: 0, avgForm: 0, avgEndurance: 0 };
    }
    const scores = chartData.map((d) => d.score);
    const avgScore = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
    const peakScore = Math.max(...scores);
    const avgForm = Math.round((chartData.reduce((a, b) => a + b.formQuality, 0) / chartData.length) * 10) / 10;
    const avgEndurance = Math.round((chartData.reduce((a, b) => a + b.endurance, 0) / chartData.length) * 10) / 10;

    let trendDelta = 0;
    if (chartData.length >= 2) {
      const firstScore = chartData[0].score;
      const latestScore = chartData[chartData.length - 1].score;
      trendDelta = Math.round((latestScore - firstScore) * 10) / 10;
    }

    return { avgScore, peakScore, totalSessions: chartData.length, trendDelta, avgForm, avgEndurance };
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
        <Activity className="w-8 h-8 mx-auto text-slate-400 animate-pulse" />
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Assessment Data Yet</h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Submit an on-field evaluation to generate real-time performance trajectories and longitudinal telemetry graphs.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-5 shadow-sm">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Historical Performance Progression & Kinematic Trend
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {athleteName ? `${athleteName} • ` : ''}
            {selectedSport && selectedSport !== 'all' ? `${selectedSport} • ` : ''}
            Chronological telemetry stream updated through the AcademyHub API.
          </p>
        </div>

        {/* Metric View Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs w-full md:w-auto">
          <button
            id="metric-view-composite"
            onClick={() => setMetricView('composite')}
            className={`px-3 py-2 min-h-[44px] flex-1 sm:flex-initial text-center justify-center flex items-center rounded-lg font-bold transition-all ${
              metricView === 'composite'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Composite Score
          </button>
          <button
            id="metric-view-form-endurance"
            onClick={() => setMetricView('form_endurance')}
            className={`px-3 py-2 min-h-[44px] flex-1 sm:flex-initial text-center justify-center flex items-center rounded-lg font-bold transition-all ${
              metricView === 'form_endurance'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Form vs Endurance
          </button>
          <button
            id="metric-view-reps-tempo"
            onClick={() => setMetricView('reps_tempo')}
            className={`px-3 py-2 min-h-[44px] flex-1 sm:flex-initial text-center justify-center flex items-center rounded-lg font-bold transition-all ${
              metricView === 'reps_tempo'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Reps & Cadence
          </button>
          <button
            id="metric-view-all"
            onClick={() => setMetricView('all')}
            className={`px-3 py-2 min-h-[44px] flex-1 sm:flex-initial text-center justify-center flex items-center rounded-lg font-bold transition-all ${
              metricView === 'all'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Tracks
          </button>
        </div>
      </div>

      {/* Summary KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Average Evaluation</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-slate-900 dark:text-white font-mono">{stats.avgScore}</span>
            <span className="text-[10px] text-slate-400">/ 100</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Peak Performance</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{stats.peakScore}</span>
            <span className="text-[10px] text-emerald-500 font-bold font-mono">Pts</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Recorded Sessions</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-cyan-600 dark:text-cyan-400 font-mono">{stats.totalSessions}</span>
            <span className="text-[10px] text-slate-400 font-mono">evals</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Longitudinal Trend</span>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-xl font-black font-mono ${
                stats.trendDelta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {stats.trendDelta >= 0 ? `+${stats.trendDelta}` : stats.trendDelta}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">pts net</span>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-72 sm:h-80 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {metricView === 'composite' ? (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis domain={[50, 100]} stroke="#94a3b8" fontSize={11} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="score"
                name="Computed Score"
                stroke="#06b6d4"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#scoreGradient)"
                dot={{ r: 4, fill: '#06b6d4', strokeWidth: 2, stroke: '#ffffff' }}
                activeDot={{ r: 6, fill: '#22d3ee', stroke: '#ffffff', strokeWidth: 2 }}
              />
            </AreaChart>
          ) : (
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis
                domain={metricView === 'reps_tempo' ? [0, 35] : [50, 100]}
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                formatter={(value) => <span className="text-slate-700 dark:text-slate-300 font-semibold">{value}</span>}
              />

              {(metricView === 'all' || metricView === 'form_endurance') && (
                <>
                  <Line
                    type="monotone"
                    dataKey="formQuality"
                    name="Form Quality (W₁ 0.4)"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#10b981' }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="endurance"
                    name="Endurance & Power (W₂ 0.4)"
                    stroke="#a855f7"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#a855f7' }}
                    activeDot={{ r: 5 }}
                  />
                </>
              )}

              {(metricView === 'all' || metricView === 'reps_tempo') && (
                <>
                  <Line
                    type="monotone"
                    dataKey="reps"
                    name="Valid Repetitions"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    strokeDasharray="4 2"
                    dot={{ r: 3, fill: '#f59e0b' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cadence"
                    name="Cadence (Reps/Min)"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#38bdf8' }}
                  />
                </>
              )}

              {metricView === 'all' && (
                <Line
                  type="monotone"
                  dataKey="score"
                  name="Composite Score"
                  stroke="#06b6d4"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#06b6d4' }}
                />
              )}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-3.5 rounded-xl bg-white/95 dark:bg-slate-950/95 border border-slate-300 dark:border-slate-800 shadow-xl text-xs space-y-1.5 max-w-xs backdrop-blur-md">
        <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-1.5">
          <div>
            <div className="font-bold text-slate-900 dark:text-white truncate">{data.athlete}</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{data.fullDate}</div>
          </div>
          <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20">
            {data.score} pts ({data.grade})
          </span>
        </div>

        <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">
          {data.sport} • {data.exercise}
        </div>

        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1 text-slate-600 dark:text-slate-400">
          <div>Form Quality: <span className="font-bold text-emerald-600 dark:text-emerald-400">{data.formQuality}%</span></div>
          <div>Endurance: <span className="font-bold text-purple-600 dark:text-purple-400">{data.endurance}%</span></div>
          <div>Valid Reps: <span className="font-bold text-amber-600 dark:text-amber-400">{data.reps}</span></div>
          <div>Cadence: <span className="font-bold text-cyan-600 dark:text-cyan-400">{data.cadence} rpm</span></div>
        </div>

        {data.coachNotes && (
          <p className="text-[10px] text-slate-500 dark:text-slate-400 italic pt-1 border-t border-slate-100 dark:border-slate-900 line-clamp-2">
            &quot;{data.coachNotes}&quot;
          </p>
        )}
      </div>
    );
  }
  return null;
}
