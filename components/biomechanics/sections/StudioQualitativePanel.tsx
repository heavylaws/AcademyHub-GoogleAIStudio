'use client';

import React from 'react';
import { Sparkles, Tag, Check, ShieldAlert, FileText } from 'lucide-react';
import { SportConfig } from './AssessmentSessionConfig';

export interface StudioQualitativePanelProps {
  formQualityScore: number;
  onFormQualityScoreChange: (score: number) => void;
  enduranceScore: number;
  onEnduranceScoreChange: (score: number) => void;
  faultTags: string[];
  onToggleFaultTag: (tag: string) => void;
  coachNotes: string;
  onCoachNotesChange: (notes: string) => void;
  currentSportConfig: SportConfig;
}

export default function StudioQualitativePanel({
  formQualityScore,
  onFormQualityScoreChange,
  enduranceScore,
  onEnduranceScoreChange,
  faultTags,
  onToggleFaultTag,
  coachNotes,
  onCoachNotesChange,
  currentSportConfig,
}: StudioQualitativePanelProps) {
  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-5 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        2. Qualitative Observations (W1 = 0.4, W2 = 0.4 Factors)
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex justify-between text-slate-800 dark:text-slate-200">
            <label htmlFor="studio-form-quality" className="font-bold">Form Quality Score (W1 = 0.4):</label>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
              {formQualityScore} / 100
            </span>
          </div>
          <input
            id="studio-form-quality"
            type="range"
            min="30"
            max="100"
            value={formQualityScore}
            onChange={(e) => onFormQualityScoreChange(Number(e.target.value))}
            className="w-full min-h-[44px] accent-emerald-500 bg-slate-200 dark:bg-slate-900 h-1.5 rounded-lg appearance-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          />
          <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">
            Kinematic precision, spinal neutrality & limb symmetry.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex justify-between text-slate-800 dark:text-slate-200">
            <label htmlFor="studio-endurance-score" className="font-bold">Endurance & Power Score (W2 = 0.4):</label>
            <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400 text-sm">
              {enduranceScore} / 100
            </span>
          </div>
          <input
            id="studio-endurance-score"
            type="range"
            min="30"
            max="100"
            value={enduranceScore}
            onChange={(e) => onEnduranceScoreChange(Number(e.target.value))}
            className="w-full min-h-[44px] accent-cyan-500 bg-slate-200 dark:bg-slate-900 h-1.5 rounded-lg appearance-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          />
          <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">
            Lactate resistance, power maintenance across final third.
          </p>
        </div>
      </div>

      {/* Fault Tags Multi-Select */}
      <div className="space-y-2 text-xs">
        <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-amber-500" />
          Kinematic Fault Tags (Applies minor penalty to computed score)
        </span>
        <div className="flex flex-wrap gap-2">
          {currentSportConfig.commonFaults.map((fault) => {
            const isSelected = faultTags.includes(fault);
            return (
              <button
                key={fault}
                type="button"
                onClick={() => onToggleFaultTag(fault)}
                className={`min-h-[44px] px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 active:scale-[0.98] ${
                  isSelected
                    ? 'bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/40 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-800 hover:border-slate-400'
                }`}
              >
                {isSelected ? (
                  <Check className="w-3.5 h-3.5 text-amber-500" />
                ) : (
                  <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
                )}
                {fault.replace('_', ' ')}
              </button>
            );
          })}
        </div>
      </div>

      {/* Coach Notes */}
      <div className="space-y-1.5 text-xs">
        <label htmlFor="studio-coach-directives" className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-slate-400" /> Coach Observation & Correction Directives
        </label>
        <textarea
          id="studio-coach-directives"
          value={coachNotes}
          onChange={(e) => onCoachNotesChange(e.target.value)}
          rows={2}
          placeholder="Enter qualitative notes for athlete development..."
          className="w-full min-h-[44px] bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-sans text-xs font-medium"
        />
      </div>
    </div>
  );
}
