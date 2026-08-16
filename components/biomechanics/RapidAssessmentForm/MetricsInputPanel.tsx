'use client';

import React from 'react';
import { Flame, Minus, Plus, Clock, Square, Play, RotateCcw } from 'lucide-react';

export interface MetricsInputPanelProps {
  selectedExercise: string;
  validReps: number;
  onValidRepsChange: (reps: number) => void;
  durationSeconds: number;
  isTimerRunning: boolean;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onSetTimerPreset: (secs: number) => void;
}

export default function MetricsInputPanel({
  selectedExercise,
  validReps,
  onValidRepsChange,
  durationSeconds,
  isTimerRunning,
  onToggleTimer,
  onResetTimer,
  onSetTimerPreset,
}: MetricsInputPanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Flame className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          1. Quantitative Execution ({selectedExercise})
        </h3>
        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
          W₃ = 0.2 Weight Factor
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Reps Numeric Stepper */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Valid Completed Reps
            </span>
            <span className="text-2xl font-black font-mono text-cyan-600 dark:text-cyan-400">
              {validReps}
            </span>
          </div>

          {/* Big touch stepper buttons (>=44px mobile friendly) */}
          <div className="flex items-center gap-2">
            <button
              id="stepper-minus-5"
              type="button"
              onClick={() => onValidRepsChange(Math.max(0, validReps - 5))}
              className="h-11 px-3 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-mono font-bold text-xs active:scale-95 transition-all"
            >
              -5
            </button>
            <button
              id="stepper-minus-1"
              type="button"
              onClick={() => onValidRepsChange(Math.max(0, validReps - 1))}
              className="h-11 w-12 flex items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold active:scale-95 transition-all"
            >
              <Minus className="w-4 h-4" />
            </button>

            <input
              type="number"
              min="0"
              max="100"
              value={validReps}
              onChange={(e) => onValidRepsChange(Math.max(0, parseInt(e.target.value) || 0))}
              className="h-11 flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-center font-mono font-black text-lg text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
            />

            <button
              id="stepper-plus-1"
              type="button"
              onClick={() => onValidRepsChange(validReps + 1)}
              className="h-11 w-12 flex items-center justify-center rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold active:scale-95 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              id="stepper-plus-5"
              type="button"
              onClick={() => onValidRepsChange(validReps + 5)}
              className="h-11 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-xs active:scale-95 transition-all shadow-sm"
            >
              +5
            </button>
          </div>
        </div>

        {/* Timer & Duration Section */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              Session Duration
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-2xl text-slate-900 dark:text-white">
                {durationSeconds}s
              </span>
              {isTimerRunning && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              )}
            </div>
          </div>

          {/* Live Stopwatch Controls & Presets */}
          <div className="flex items-center gap-2">
            <button
              id="timer-toggle-btn"
              type="button"
              onClick={onToggleTimer}
              className={`h-11 flex-1 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm ${
                isTimerRunning
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {isTimerRunning ? (
                <>
                  <Square className="w-3.5 h-3.5" /> Stop Timer
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" /> Live Timer
                </>
              )}
            </button>

            <button
              id="timer-reset-btn"
              type="button"
              onClick={onResetTimer}
              title="Reset to 30s"
              className="h-11 w-11 flex items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <div className="hidden sm:flex items-center gap-1">
              {[15, 30, 45, 60].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onSetTimerPreset(preset)}
                  className={`h-11 px-2.5 rounded-xl font-mono text-[11px] font-bold transition-all ${
                    durationSeconds === preset
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {preset}s
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
