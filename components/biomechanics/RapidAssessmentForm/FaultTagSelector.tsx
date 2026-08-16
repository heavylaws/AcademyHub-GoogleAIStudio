'use client';

import React from 'react';
import { Tag, Check, ShieldAlert } from 'lucide-react';

export interface FaultTagSelectorProps {
  selectedExercise: string;
  selectedFaults: string[];
  onToggleFault: (tag: string) => void;
  onClearFaults: () => void;
  presetFaultTags?: Record<string, string[]>;
}

export const DEFAULT_PRESET_FAULT_TAGS: Record<string, string[]> = {
  'Push-ups': ['Hips Sagging', 'Elbow Flare', 'Incomplete Depth', 'Head Dropping', 'Uneven Press'],
  'Countermovement Jump': ['Valgus Collapse', 'Asymmetric Loading', 'Incomplete Extension', 'Stiff Landing', 'Trunk Lean'],
  'Squat Jump': ['Incomplete Depth', 'Valgus Collapse', 'Heel Lift', 'Lumbar Flexion', 'Heavy Impact'],
  'default': ['Hips Sagging', 'Elbow Flare', 'Incomplete Depth', 'Valgus Collapse', 'Asymmetric Loading', 'Heel Lift', 'Trunk Lean']
};

export default function FaultTagSelector({
  selectedExercise,
  selectedFaults,
  onToggleFault,
  onClearFaults,
  presetFaultTags = DEFAULT_PRESET_FAULT_TAGS,
}: FaultTagSelectorProps) {
  const activeFaultList =
    presetFaultTags[selectedExercise] || presetFaultTags['default'] || [];

  return (
    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-amber-500" />
          Preset Technique Faults (Tap to toggle):
        </label>
        {selectedFaults.length > 0 && (
          <button
            type="button"
            onClick={onClearFaults}
            className="min-h-[44px] text-[10px] font-mono text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline"
          >
            Clear all ({selectedFaults.length})
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        {activeFaultList.map((tag) => {
          const isSelected = selectedFaults.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onToggleFault(tag)}
              className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-semibold font-mono transition-all flex items-center gap-1.5 active:scale-95 ${
                isSelected
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-800 hover:border-slate-400'
              }`}
            >
              {isSelected ? (
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
              )}
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}
