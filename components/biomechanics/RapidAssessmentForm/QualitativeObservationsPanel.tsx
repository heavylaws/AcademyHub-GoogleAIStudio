'use client';

import React from 'react';
import { Sparkles, Sliders, FileText } from 'lucide-react';
import FaultTagSelector from './FaultTagSelector';

export interface QualitativeObservationsPanelProps {
  selectedExercise: string;
  formQualityScore: number;
  onFormQualityScoreChange: (score: number) => void;
  enduranceScore: number;
  onEnduranceScoreChange: (score: number) => void;
  selectedFaults: string[];
  onToggleFault: (tag: string) => void;
  onClearFaults: () => void;
  coachNotes: string;
  onCoachNotesChange: (notes: string) => void;
  presetFaultTags?: Record<string, string[]>;
}

export default function QualitativeObservationsPanel({
  selectedExercise,
  formQualityScore,
  onFormQualityScoreChange,
  enduranceScore,
  onEnduranceScoreChange,
  selectedFaults,
  onToggleFault,
  onClearFaults,
  coachNotes,
  onCoachNotesChange,
  presetFaultTags,
}: QualitativeObservationsPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          2. Qualitative Scoring & Fault Diagnostics
        </h3>
        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
          W₁ = 0.4 • W₂ = 0.4 Factors
        </span>
      </div>

      {/* Sliders Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Form Quality Slider */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-emerald-500" />
              Form Quality Score (F_qual)
            </span>
            <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
              {formQualityScore} / 100
            </span>
          </div>
          <input
            id="slider-form-quality"
            type="range"
            min="0"
            max="100"
            value={formQualityScore}
            onChange={(e) => onFormQualityScoreChange(Number(e.target.value))}
            className="w-full min-h-[44px] accent-emerald-500 bg-slate-200 dark:bg-slate-800 h-2 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>0 (Severe Flaws)</span>
            <span>50 (Fair)</span>
            <span>100 (Flawless)</span>
          </div>
        </div>

        {/* Endurance Score Slider */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-500" />
              Endurance & Power Score (E_score)
            </span>
            <span className="font-mono font-black text-sm text-cyan-600 dark:text-cyan-400">
              {enduranceScore} / 100
            </span>
          </div>
          <input
            id="slider-endurance-score"
            type="range"
            min="0"
            max="100"
            value={enduranceScore}
            onChange={(e) => onEnduranceScoreChange(Number(e.target.value))}
            className="w-full min-h-[44px] accent-cyan-500 bg-slate-200 dark:bg-slate-800 h-2 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>0 (Rapid Fatigue)</span>
            <span>50 (Moderate)</span>
            <span>100 (Peak Stamina)</span>
          </div>
        </div>
      </div>

      {/* Selectable Preset Tag Chips for Technique Faults */}
      <FaultTagSelector
        selectedExercise={selectedExercise}
        selectedFaults={selectedFaults}
        onToggleFault={onToggleFault}
        onClearFaults={onClearFaults}
        presetFaultTags={presetFaultTags}
      />

      {/* Coach Notes Free-Form Text Field */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-slate-400" />
          Coach Qualitative Notes & Correction Directives
        </label>
        <textarea
          id="coach-notes-textarea"
          rows={2}
          value={coachNotes}
          onChange={(e) => onCoachNotesChange(e.target.value)}
          placeholder="e.g., Kept great spinal alignment through first 8 reps. Slight elbow flare on final 2. Prescribed eccentric tempo..."
          className="w-full min-h-[44px] bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-2xl p-3.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
        />
      </div>
    </div>
  );
}
