'use client';

import React from 'react';
import { Activity, PlayCircle, Smartphone, TrendingUp, Gauge } from 'lucide-react';

export type BiomechanicsViewMode = 'rapid' | 'analytics' | 'studio';

export interface BiomechanicsHeaderProps {
  activeView: BiomechanicsViewMode;
  onViewChange: (mode: BiomechanicsViewMode) => void;
  onOpenVideoModal: () => void;
}

export default function BiomechanicsHeader({
  activeView,
  onViewChange,
  onOpenVideoModal,
}: BiomechanicsHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
      <div>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Biomechanical Evaluation & Assessment Engine
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Live field coach assessment tool & automated kinematic scoring pipeline.
            </p>
          </div>
        </div>
      </div>

      {/* View Mode Switcher: Rapid Entry vs Live Analytics & Kinematics Studio + Video Guide */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 self-start md:self-auto">
        <button
          onClick={onOpenVideoModal}
          aria-label="Open Exercise Video Guide"
          className="flex items-center gap-2 px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md transition-all border border-purple-400/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 active:scale-[0.98]"
        >
          <PlayCircle className="w-4 h-4 text-cyan-300 animate-pulse" />
          <span>Exercise Video Guide</span>
        </button>
        <button
          id="view-rapid-entry-tab"
          onClick={() => onViewChange('rapid')}
          aria-current={activeView === 'rapid' ? 'page' : undefined}
          className={`flex items-center gap-2 px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 active:scale-[0.98] ${
            activeView === 'rapid'
              ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
              : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Rapid Live Assessment</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950/20 dark:bg-slate-900 text-slate-900 dark:text-cyan-300 font-mono font-bold">
            Live
          </span>
        </button>

        <button
          id="view-analytics-tab"
          onClick={() => onViewChange('analytics')}
          aria-current={activeView === 'analytics' ? 'page' : undefined}
          className={`flex items-center gap-2 px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 active:scale-[0.98] ${
            activeView === 'analytics'
              ? 'bg-emerald-600 text-white shadow-md font-black'
              : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Live Telemetry & Radars</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20 text-white font-mono font-bold">
            onSnapshot
          </span>
        </button>

        <button
          id="view-studio-tab"
          onClick={() => onViewChange('studio')}
          aria-current={activeView === 'studio' ? 'page' : undefined}
          className={`flex items-center gap-2 px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 active:scale-[0.98] ${
            activeView === 'studio'
              ? 'bg-purple-600 text-white shadow-md font-black'
              : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Gauge className="w-4 h-4" />
          <span>Kinematics & PoseNet Studio</span>
        </button>
      </div>
    </div>
  );
}
