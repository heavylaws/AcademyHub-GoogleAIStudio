'use client';

import React from 'react';
import { Flame, Clock } from 'lucide-react';
import { SportConfig } from './AssessmentSessionConfig';

export interface StudioQuantitativePanelProps {
  validReps: number;
  onValidRepsChange: (reps: number) => void;
  durationSeconds: number;
  onDurationSecondsChange: (secs: number) => void;
  avgDepthAngle: number;
  onAvgDepthAngleChange: (angle: number) => void;
  currentSportConfig: SportConfig;
}

export default function StudioQuantitativePanel({
  validReps,
  onValidRepsChange,
  durationSeconds,
  onDurationSecondsChange,
  avgDepthAngle,
  onAvgDepthAngleChange,
  currentSportConfig,
}: StudioQuantitativePanelProps) {
  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <Flame className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
        1. Quantitative Metrics (W3 = 0.2 Weight Factor)
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
            <span className="font-semibold flex items-center gap-1">Valid Repetitions:</span>
            <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400 text-sm">
              {validReps} reps
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="35"
            value={validReps}
            onChange={(e) => onValidRepsChange(Number(e.target.value))}
            className="w-full min-h-[44px] accent-cyan-500 bg-slate-200 dark:bg-slate-900 h-1.5 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-[10px] text-slate-500">Target Standard: 12-15 reps/set</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
            <span className="font-semibold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" /> Duration:
            </span>
            <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400 text-sm">
              {durationSeconds}s
            </span>
          </div>
          <input
            type="range"
            min="5"
            max="120"
            step="5"
            value={durationSeconds}
            onChange={(e) => onDurationSecondsChange(Number(e.target.value))}
            className="w-full min-h-[44px] accent-cyan-500 bg-slate-200 dark:bg-slate-900 h-1.5 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-[10px] text-slate-500">
            Pacing: {Math.round((validReps / (durationSeconds / 60)) * 10) / 10} reps/min
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
            <span className="font-semibold">Avg Depth Angle:</span>
            <span className="font-mono font-bold text-purple-600 dark:text-purple-400 text-sm">
              {avgDepthAngle}°
            </span>
          </div>
          <input
            type="range"
            min="45"
            max="180"
            value={avgDepthAngle}
            onChange={(e) => onAvgDepthAngleChange(Number(e.target.value))}
            className="w-full min-h-[44px] accent-purple-500 bg-slate-200 dark:bg-slate-900 h-1.5 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-[10px] text-slate-500">
            Optimal Target: ~{currentSportConfig.defaultKnee}°
          </span>
        </div>
      </div>
    </div>
  );
}
