'use client';

import React from 'react';
import { Activity, Video, Upload, CheckCircle2 } from 'lucide-react';
import { DataSource } from '@/types/assessment';

export interface AssessmentHistoryItem {
  id: string;
  athlete: string;
  sport: string;
  exercise: string;
  source: DataSource;
  score: number;
  grade: string;
  date: string;
}

export interface StudioScoringEngineProps {
  computedScore: number;
  activeGradeLetter: string;
  activeGrade: { text: string; color: string; desc: string };
  formQualityScore: number;
  enduranceScore: number;
  validReps: number;
  faultTags: string[];
  videoStoragePath: string;
  onVideoStoragePathChange: (path: string) => void;
  smartGridProcessed: boolean;
  onToggleSmartGrid: () => void;
  onSaveAssessment: () => void;
  isIngesting: boolean;
  ingestSuccess: boolean;
  lastSavedId: string;
  dataSource: DataSource;
  assessmentHistory: AssessmentHistoryItem[];
}

export default function StudioScoringEngine({
  computedScore,
  activeGradeLetter,
  activeGrade,
  formQualityScore,
  enduranceScore,
  validReps,
  faultTags,
  videoStoragePath,
  onVideoStoragePathChange,
  smartGridProcessed,
  onToggleSmartGrid,
  onSaveAssessment,
  isIngesting,
  ingestSuccess,
  lastSavedId,
  dataSource,
  assessmentHistory,
}: StudioScoringEngineProps) {
  return (
    <div className="space-y-6">
      {/* Dynamic Computed Score Engine Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <Activity className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          Dynamic Computed Score Engine
        </h3>

        {/* Mathematical Weights Formula breakdown */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 space-y-3">
          <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 flex justify-between">
            <span>Weighted Scoring Formula</span>
            <span className="text-cyan-600 dark:text-cyan-400 font-bold">W₁=0.4 • W₂=0.4 • W₃=0.2</span>
          </div>

          <div className="text-center py-2">
            <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-emerald-600 to-purple-600 dark:from-cyan-400 dark:via-emerald-400 dark:to-purple-400 font-mono">
              {computedScore}
              <span className="text-sm font-bold text-slate-400 dark:text-slate-500 ml-1">/ 100</span>
            </div>
            <div className={`text-xs font-bold mt-1 ${activeGrade.color}`}>
              {activeGradeLetter} Rubric Grade
            </div>
          </div>

          <div className="space-y-1 text-[11px] font-mono text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-2">
            <div className="flex justify-between">
              <span>W₁ (Form Quality 0.4):</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {(formQualityScore * 0.4).toFixed(1)} pts
              </span>
            </div>
            <div className="flex justify-between">
              <span>W₂ (Endurance 0.4):</span>
              <span className="font-bold text-cyan-600 dark:text-cyan-400">
                {(enduranceScore * 0.4).toFixed(1)} pts
              </span>
            </div>
            <div className="flex justify-between">
              <span>W₃ (Reps Execution 0.2):</span>
              <span className="font-bold text-purple-600 dark:text-purple-400">
                {(Math.min(100, (validReps / 15) * 100) * 0.2).toFixed(1)} pts
              </span>
            </div>
            {faultTags.length > 0 && (
              <div className="flex justify-between text-amber-600 dark:text-amber-400">
                <span>Fault Penalties ({faultTags.length}):</span>
                <span className="font-bold">-{Math.min(15, faultTags.length * 3)} pts</span>
              </div>
            )}
          </div>
        </div>

        {/* Media References Configuration */}
        <div className="space-y-3 text-xs border-t border-slate-200 dark:border-slate-800 pt-3">
          <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Video className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            Media Reference Path (Storage)
          </label>
          <input
            type="text"
            value={videoStoragePath}
            onChange={(e) => onVideoStoragePathChange(e.target.value)}
            placeholder="Cloud Storage video path..."
            className="w-full h-11 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-mono text-[11px] focus:outline-none focus:border-cyan-500"
          />

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">Smart Grid Processed:</span>
            <button
              type="button"
              onClick={onToggleSmartGrid}
              className={`min-h-[44px] px-3 py-1 rounded-lg font-mono text-[10px] font-bold transition-all ${
                smartGridProcessed
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {smartGridProcessed ? 'TRUE (Active)' : 'FALSE (Pending)'}
            </button>
          </div>
        </div>

        {/* Ingest Action Button */}
        <button
          onClick={onSaveAssessment}
          disabled={isIngesting}
          className="w-full min-h-[44px] bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          {isIngesting ? (
            <>Saving Assessment to Postgres...</>
          ) : (
            <>
              <Upload className="w-4 h-4" /> Save {dataSource === 'manual' ? 'Manual' : 'AI-Agentic'} Assessment to Postgres
            </>
          )}
        </button>

        {ingestSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-mono space-y-1">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Successfully Written to Postgres!
            </div>
            <div className="text-[10px] text-slate-600 dark:text-slate-400">
              Doc ID: <span className="text-emerald-600 dark:text-emerald-300 font-bold">{lastSavedId}</span> • Score: {computedScore} pts ({activeGradeLetter})
            </div>
          </div>
        )}
      </div>

      {/* Assessment History Log */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
          <span>Recent Assessment Ledger</span>
          <span className="text-[10px] font-mono text-slate-500">Collection: &quot;assessments&quot;</span>
        </h4>

        <div className="space-y-2">
          {assessmentHistory.slice(0, 4).map((rec) => (
            <div
              key={rec.id}
              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs flex justify-between items-center"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900 dark:text-white">{rec.athlete}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {rec.source}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {rec.sport} • {rec.exercise}
                </div>
              </div>
              <div className="text-right">
                <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold text-xs">
                  {rec.score} pts
                </span>
                <div className="text-[10px] text-slate-400 font-mono">Grade {rec.grade}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
