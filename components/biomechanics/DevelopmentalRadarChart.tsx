'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  Legend,
} from 'recharts';
import { Assessment } from '@/types/assessment';
import { Sparkles, ShieldCheck, Target, Zap, Activity } from 'lucide-react';

interface DevelopmentalRadarChartProps {
  assessments: Assessment[];
  athleteName?: string;
  sport?: string;
}

export default function DevelopmentalRadarChart({
  assessments,
  athleteName,
  sport,
}: DevelopmentalRadarChartProps) {
  const radarData = useMemo(() => {
    if (assessments.length === 0) {
      return [
        { subject: 'Form Quality', current: 80, benchmark: 85, fullMark: 100 },
        { subject: 'Endurance & Power', current: 75, benchmark: 85, fullMark: 100 },
        { subject: 'Kinematic Stability', current: 85, benchmark: 85, fullMark: 100 },
        { subject: 'Rep Execution', current: 70, benchmark: 85, fullMark: 100 },
        { subject: 'Movement Tempo', current: 82, benchmark: 85, fullMark: 100 },
        { subject: 'Symmetry Index', current: 78, benchmark: 85, fullMark: 100 },
      ];
    }

    // 1. Form Quality (Mean form score)
    const avgForm =
      assessments.reduce((acc, curr) => acc + (curr.qualitative_observations?.form_quality_score || 80), 0) /
      assessments.length;

    // 2. Endurance & Power (Mean endurance score)
    const avgEndurance =
      assessments.reduce((acc, curr) => acc + (curr.qualitative_observations?.endurance_score || 75), 0) /
      assessments.length;

    // 3. Kinematic Stability (Penalized by fault occurrences)
    const totalFaults = assessments.reduce(
      (acc, curr) => acc + (curr.qualitative_observations?.fault_tags?.length || 0),
      0
    );
    const avgFaults = totalFaults / assessments.length;
    const stabilityScore = Math.max(50, Math.min(100, Math.round(98 - avgFaults * 8)));

    // 4. Rep Execution (Normalized to 100 from target 15 reps)
    const avgReps =
      assessments.reduce((acc, curr) => acc + (curr.quantitative_metrics?.valid_reps || 12), 0) /
      assessments.length;
    const repExecution = Math.min(100, Math.round((avgReps / 15) * 100));

    // 5. Movement Tempo (Cadence / pacing regularity)
    const avgDuration =
      assessments.reduce((acc, curr) => acc + (curr.quantitative_metrics?.duration_seconds || 45), 0) /
      assessments.length;
    const cadence = (avgReps / (avgDuration / 60));
    // optimal cadence around 18-22 reps/min
    const tempoScore = Math.min(100, Math.max(60, Math.round(100 - Math.abs(cadence - 20) * 3)));

    // 6. Symmetry & Consistency (Based on score dispersion)
    const scores = assessments.map((a) => a.computed_score || 85);
    const meanScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance =
      scores.reduce((acc, val) => acc + Math.pow(val - meanScore, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    const consistencyScore = Math.max(60, Math.min(100, Math.round(98 - stdDev * 2)));

    return [
      { subject: 'Form Quality', current: Math.round(avgForm), benchmark: 85, fullMark: 100 },
      { subject: 'Endurance & Power', current: Math.round(avgEndurance), benchmark: 85, fullMark: 100 },
      { subject: 'Kinematic Stability', current: stabilityScore, benchmark: 85, fullMark: 100 },
      { subject: 'Rep Execution', current: repExecution, benchmark: 85, fullMark: 100 },
      { subject: 'Movement Tempo', current: tempoScore, benchmark: 85, fullMark: 100 },
      { subject: 'Consistency Index', current: consistencyScore, benchmark: 85, fullMark: 100 },
    ];
  }, [assessments]);

  // Developmental Index Aggregate
  const developmentalIndex = useMemo(() => {
    const sum = radarData.reduce((acc, item) => acc + item.current, 0);
    return Math.round((sum / radarData.length) * 10) / 10;
  }, [radarData]);

  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-5 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Kinematic Developmental Radar (6-Axis Spider)
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {athleteName ? `${athleteName} • ` : ''}
            Multi-planar motor competency benchmarked against Academy SOP Standards.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[11px] font-mono text-slate-500">Overall Maturity:</span>
          <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 font-mono font-black text-xs">
            {developmentalIndex} / 100 Index
          </span>
        </div>
      </div>

      {/* Radar Canvas */}
      <div className="w-full h-72 sm:h-80 relative flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
            <PolarGrid stroke="#475569" strokeDasharray="3 3" opacity={0.3} />
            <PolarAngleAxis
              dataKey="subject"
              stroke="#94a3b8"
              fontSize={10}
              tickLine={false}
            />
            <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#64748b" fontSize={9} />
            <Tooltip content={<CustomRadarTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }}
              formatter={(value) => (
                <span className="text-slate-700 dark:text-slate-300 font-semibold">{value}</span>
              )}
            />
            {/* Standard Academy Benchmark */}
            <Radar
              name="Academy Benchmark (85)"
              dataKey="benchmark"
              stroke="#64748b"
              strokeDasharray="4 4"
              fill="#64748b"
              fillOpacity={0.1}
            />
            {/* Live Athlete Current Performance */}
            <Radar
              name="Live Athlete Kinematics"
              dataKey="current"
              stroke="#06b6d4"
              strokeWidth={2.5}
              fill="#06b6d4"
              fillOpacity={0.4}
              dot={{ r: 3, fill: '#06b6d4' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* 6-Axis Breakdown Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 text-xs">
        {radarData.map((axis) => {
          const delta = axis.current - axis.benchmark;
          return (
            <div
              key={axis.subject}
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1"
            >
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">
                  {axis.subject}
                </span>
                <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                  {axis.current}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400">vs Target (85)</span>
                <span
                  className={`font-mono font-semibold ${
                    delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {delta >= 0 ? `+${delta}` : delta}
                </span>
              </div>
              {/* Mini progress track */}
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    axis.current >= 85 ? 'bg-cyan-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${axis.current}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CustomRadarTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-3 rounded-xl bg-white/95 dark:bg-slate-950/95 border border-slate-300 dark:border-slate-800 shadow-xl text-xs space-y-1 backdrop-blur-md">
        <div className="font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-1">
          {data.subject}
        </div>
        <div className="flex justify-between gap-4 font-mono text-[11px] pt-1">
          <span className="text-cyan-600 dark:text-cyan-400 font-bold">Athlete Score:</span>
          <span className="font-black text-slate-900 dark:text-white">{data.current} / 100</span>
        </div>
        <div className="flex justify-between gap-4 font-mono text-[11px]">
          <span className="text-slate-400">Academy Standard:</span>
          <span className="text-slate-400">{data.benchmark} / 100</span>
        </div>
      </div>
    );
  }
  return null;
}
