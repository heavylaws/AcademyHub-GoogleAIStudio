'use client';

import React from 'react';
import { Sliders, Layers, Sparkles } from 'lucide-react';
import { DataSource } from '@/types/assessment';

export interface AthleteOption {
  id: string;
  name: string;
  parentEmail: string;
}

export interface SportConfig {
  exercises: string[];
  sops: string[];
  rubricGradeA: string;
  rubricGradeB: string;
  rubricGradeC: string;
  targetJoints: string[];
  defaultKnee: number;
  defaultHip: number;
  commonFaults: string[];
}

export interface AssessmentSessionConfigProps {
  dataSource: DataSource;
  selectedSport: string;
  onSportChange: (sport: string) => void;
  sportsConfig: Record<string, SportConfig>;
  currentSportConfig: SportConfig;
  selectedExercise: string;
  onExerciseChange: (exercise: string) => void;
  selectedSOP: string;
  onSOPChange: (sop: string) => void;
  selectedAthlete: string;
  onAthleteChange: (athleteId: string) => void;
  sampleAthletes: AthleteOption[];
  activeGrade: { text: string; color: string; desc: string };
}

export default function AssessmentSessionConfig({
  dataSource,
  selectedSport,
  onSportChange,
  sportsConfig,
  currentSportConfig,
  selectedExercise,
  onExerciseChange,
  selectedSOP,
  onSOPChange,
  selectedAthlete,
  onAthleteChange,
  sampleAthletes,
  activeGrade,
}: AssessmentSessionConfigProps) {
  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          Assessment Session Configuration
        </h3>
        <span className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded border border-cyan-500/20 font-bold">
          Data Source: {dataSource.toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
        <div>
          <label htmlFor="studio-select-sport" className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
            Select Sport
          </label>
          <select
            id="studio-select-sport"
            value={selectedSport}
            onChange={(e) => onSportChange(e.target.value)}
            className="w-full h-11 min-h-[44px] bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-semibold text-xs"
          >
            {Object.keys(sportsConfig).map((sp) => (
              <option key={sp} value={sp}>
                {sp}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="studio-exercise-drill" className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
            Exercise Drill
          </label>
          <select
            id="studio-exercise-drill"
            value={selectedExercise}
            onChange={(e) => onExerciseChange(e.target.value)}
            className="w-full h-11 min-h-[44px] bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-semibold text-xs"
          >
            {currentSportConfig.exercises.map((ex) => (
              <option key={ex} value={ex}>
                {ex}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="studio-grading-sop" className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
            Grading Rubric SOP
          </label>
          <select
            id="studio-grading-sop"
            value={selectedSOP}
            onChange={(e) => onSOPChange(e.target.value)}
            className="w-full h-11 min-h-[44px] bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-semibold text-xs"
          >
            {currentSportConfig.sops.map((sop) => (
              <option key={sop} value={sop}>
                {sop}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="studio-assign-athlete" className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
            Assign Athlete Profile
          </label>
          <select
            id="studio-assign-athlete"
            value={selectedAthlete}
            onChange={(e) => onAthleteChange(e.target.value)}
            className="w-full h-11 min-h-[44px] bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-semibold text-xs"
          >
            {sampleAthletes.map((ath) => (
              <option key={ath.id} value={ath.id}>
                {ath.name} ({ath.parentEmail})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Dynamic Rubric & Target SOP preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
          <span className="font-bold uppercase text-[10px] tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" /> SOP Standard: {selectedSOP}
          </span>
          <div className={`font-bold text-xs ${activeGrade.color}`}>{activeGrade.text}</div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            {activeGrade.desc}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
          <span className="font-bold uppercase text-[10px] tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Kinetic Joint Targets & SOP Constraints
          </span>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {currentSportConfig.targetJoints.map((j, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 text-[10px] font-mono font-semibold"
              >
                {j}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
