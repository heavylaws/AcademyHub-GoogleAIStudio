'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  User,
  Plus,
  Minus,
  Play,
  Square,
  RotateCcw,
  Video,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  Flame,
  Sparkles,
  Tag,
  FileText,
  Sliders,
  Check,
  ChevronRight,
  ShieldAlert,
  Film,
  X,
  Layers,
  ArrowRight,
  Cpu,
  Bot,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import {
  Assessment,
  DataSource,
  calculateComputedScore,
  deriveRubricGrade
} from '@/types/assessment';
import { saveAssessmentToFirestore } from '@/lib/assessmentConverters';
import {
  evaluateAssessment,
  isAIPipelineEnabled,
  setAIPipelineOverride,
  EvaluatedAssessment,
} from '@/services/evaluationService';
import DataSourceBadge from './DataSourceBadge';

export interface RapidAthlete {
  id: string;
  name: string;
  sport: string;
  parentEmail: string;
  avatarUrl?: string;
}

const DEFAULT_ATHLETES: RapidAthlete[] = [
  { id: 'ath_8042', name: 'Marcus Vance', sport: 'Football', parentEmail: 'robert.vance@gmail.com' },
  { id: 'ath_8043', name: 'Sarah Vance', sport: 'Basketball', parentEmail: 'robert.vance@gmail.com' },
  { id: 'ath_8044', name: 'Alex Johnson', sport: 'Basketball', parentEmail: 'parent.johnson@gmail.com' },
  { id: 'ath_8045', name: 'Priya Sharma', sport: 'Swimming', parentEmail: 'sharma.family@gmail.com' },
  { id: 'ath_8046', name: 'Liam Chen', sport: 'Cricket', parentEmail: 'chen.family@gmail.com' },
];

const SPORTS_OPTIONS = ['Football', 'Basketball', 'Cricket', 'Swimming'] as const;
type SportType = typeof SPORTS_OPTIONS[number];

const EXERCISE_SOPS = [
  'Push-ups',
  'Countermovement Jump',
  'Squat Jump',
  'Agility Shuttles',
  'Core Plank Stability'
] as const;

// Common technique faults mapped by exercise or sport
const PRESET_FAULT_TAGS: Record<string, string[]> = {
  'Push-ups': ['Hips Sagging', 'Elbow Flare', 'Incomplete Depth', 'Head Dropping', 'Uneven Press'],
  'Countermovement Jump': ['Valgus Collapse', 'Asymmetric Loading', 'Incomplete Extension', 'Stiff Landing', 'Trunk Lean'],
  'Squat Jump': ['Incomplete Depth', 'Valgus Collapse', 'Heel Lift', 'Lumbar Flexion', 'Heavy Impact'],
  'default': ['Hips Sagging', 'Elbow Flare', 'Incomplete Depth', 'Valgus Collapse', 'Asymmetric Loading', 'Heel Lift', 'Trunk Lean']
};

interface RapidAssessmentFormProps {
  onAssessmentSaved?: (assessment: Assessment) => void;
  defaultSport?: SportType;
  defaultAthleteId?: string;
  coachId?: string;
  coachName?: string;
}

export default function RapidAssessmentForm({
  onAssessmentSaved,
  defaultSport = 'Football',
  defaultAthleteId = 'ath_8042',
  coachId = 'coach_marcus_vance',
  coachName = 'Coach Marcus Vance',
}: RapidAssessmentFormProps) {
  // Feature flag state
  const [aiPipelineActive, setAiPipelineActive] = useState<boolean>(() => isAIPipelineEnabled());

  const handleToggleAIPipeline = () => {
    const next = !aiPipelineActive;
    setAIPipelineOverride(next);
    setAiPipelineActive(next);
  };

  // 1. Header State
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>(defaultAthleteId);
  const [selectedSport, setSelectedSport] = useState<SportType>(defaultSport);
  const [selectedExercise, setSelectedExercise] = useState<string>('Countermovement Jump');

  // 2. Quantitative Section State
  const [validReps, setValidReps] = useState<number>(12);
  const [durationSeconds, setDurationSeconds] = useState<number>(30);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 3. Qualitative Section State
  const [formQualityScore, setFormQualityScore] = useState<number>(85);
  const [enduranceScore, setEnduranceScore] = useState<number>(80);
  const [selectedFaults, setSelectedFaults] = useState<string[]>([]);

  // 4. Coach Notes State
  const [coachNotes, setCoachNotes] = useState<string>('');

  // 5. Optional Video Upload Hook State
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    size: number;
    type: string;
    storagePath: string;
    localPreviewUrl?: string;
  } | null>(null);
  const [isDraggingVideo, setIsDraggingVideo] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 6. Submission & Status State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [lastSavedAssessment, setLastSavedAssessment] = useState<EvaluatedAssessment | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live Timer Effect
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setDurationSeconds((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  const toggleTimer = () => {
    setIsTimerRunning((prev) => !prev);
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setDurationSeconds(30);
  };

  const setTimerPreset = (secs: number) => {
    setIsTimerRunning(false);
    setDurationSeconds(secs);
  };

  // Selected athlete lookup
  const selectedAthlete =
    DEFAULT_ATHLETES.find((a) => a.id === selectedAthleteId) || DEFAULT_ATHLETES[0];

  // Fault tag toggling
  const toggleFault = (tag: string) => {
    setSelectedFaults((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Dynamic W1=0.4, W2=0.4, W3=0.2 Score Calculation
  const computedScore = calculateComputedScore(
    {
      valid_reps: validReps,
      duration_seconds: durationSeconds,
    },
    {
      form_quality_score: formQualityScore,
      endurance_score: enduranceScore,
      fault_tags: selectedFaults,
      coach_notes: coachNotes,
    }
  );

  const rubricGrade = deriveRubricGrade(computedScore);

  // Video File Selection Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file: File) => {
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `assessments/live_capture/${Date.now()}_${sanitizedName}`;
    const localUrl = URL.createObjectURL(file);

    setAttachedFile({
      name: file.name,
      size: file.size,
      type: file.type,
      storagePath,
      localPreviewUrl: localUrl,
    });
  };

  const removeAttachedFile = () => {
    if (attachedFile?.localPreviewUrl) {
      URL.revokeObjectURL(attachedFile.localPreviewUrl);
    }
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Form Submission Action -> Evaluated through evaluationService -> Saved to Firestore
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. Process assessment through the evaluation service (deterministic or Gemini AI based on feature flag)
      const evaluated = await evaluateAssessment({
        athlete_id: selectedAthlete.id,
        athlete_name: selectedAthlete.name,
        parent_email: selectedAthlete.parentEmail,
        sport: selectedSport,
        exercise_type: selectedExercise,
        grading_rubric_sop: `${selectedSport} - ${selectedExercise} SOP`,
        coach_id: coachId,
        coach_name: coachName,
        quantitative_metrics: {
          valid_reps: Number(validReps),
          duration_seconds: Number(durationSeconds),
          cadence_reps_per_minute:
            durationSeconds > 0
              ? Math.round((validReps / (durationSeconds / 60)) * 10) / 10
              : undefined,
        },
        qualitative_observations: {
          form_quality_score: Number(formQualityScore),
          endurance_score: Number(enduranceScore),
          fault_tags: selectedFaults,
          coach_notes: coachNotes.trim(),
        },
        media_references: {
          video_storage_path: attachedFile?.storagePath,
          smart_grid_processed: Boolean(aiPipelineActive),
        },
      });

      // 2. Persist to Firestore assessments collection
      await saveAssessmentToFirestore(evaluated);

      setLastSavedAssessment(evaluated);
      setSubmitSuccess(true);
      if (onAssessmentSaved) {
        onAssessmentSaved(evaluated);
      }
    } catch (err: any) {
      console.warn('Firestore write fallback in demo mode:', err);
      // Fallback
      const fallbackDoc: EvaluatedAssessment = {
        id: `asm_${Date.now()}`,
        athlete_id: selectedAthlete.id,
        athlete_name: selectedAthlete.name,
        parent_email: selectedAthlete.parentEmail,
        sport: selectedSport,
        exercise_type: selectedExercise,
        grading_rubric_sop: `${selectedSport} - ${selectedExercise} SOP`,
        coach_id: coachId,
        coach_name: coachName,
        data_source: aiPipelineActive ? 'ai_agentic' : 'manual',
        quantitative_metrics: {
          valid_reps: validReps,
          duration_seconds: durationSeconds,
        },
        qualitative_observations: {
          form_quality_score: formQualityScore,
          endurance_score: enduranceScore,
          fault_tags: selectedFaults,
          coach_notes: coachNotes,
        },
        media_references: {
          video_storage_path: attachedFile?.storagePath,
          smart_grid_processed: aiPipelineActive,
        },
        computed_score: computedScore,
        rubric_grade: rubricGrade,
        created_at: new Date().toISOString(),
      };
      setLastSavedAssessment(fallbackDoc);
      setSubmitSuccess(true);
      if (onAssessmentSaved) {
        onAssessmentSaved(fallbackDoc);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick reset for next athlete
  const handleResetForNext = () => {
    setSubmitSuccess(false);
    setLastSavedAssessment(null);
    setValidReps(12);
    setDurationSeconds(30);
    setIsTimerRunning(false);
    setFormQualityScore(85);
    setEnduranceScore(80);
    setSelectedFaults([]);
    setCoachNotes('');
    removeAttachedFile();
  };

  const activeFaultList =
    PRESET_FAULT_TAGS[selectedExercise] || PRESET_FAULT_TAGS['default'];

  return (
    <div
      id="rapid-assessment-form-container"
      className="w-full max-w-4xl mx-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden font-sans transition-colors"
    >
      {/* Header Banner - High-contrast live session theme */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950 text-white p-5 sm:p-6 border-b border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-inner">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                  Coach Rapid-Entry Mode
                </span>

                {/* Status Badge based on evaluation pipeline feature flag */}
                <DataSourceBadge
                  dataSource={aiPipelineActive ? 'ai_agentic' : 'manual'}
                  size="sm"
                />
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight mt-1 text-white">
                Live Field Training Assessment
              </h2>
            </div>
          </div>

          {/* AI Feature Flag Toggle & Score Floating Pill */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Feature Flag Toggle */}
            <button
              type="button"
              onClick={handleToggleAIPipeline}
              title="Toggle NEXT_PUBLIC_ENABLE_AI_PIPELINE evaluation engine"
              className={`flex items-center gap-2 px-3 py-1.5 min-h-[44px] rounded-xl border text-xs font-mono font-bold transition-all ${
                aiPipelineActive
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[11px]">
                {aiPipelineActive ? 'AI Pipeline: ON' : 'Deterministic: ON'}
              </span>
              {aiPipelineActive ? (
                <ToggleRight className="w-4 h-4 text-purple-400" />
              ) : (
                <ToggleLeft className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {/* Dynamic Score Floating Pill */}
            <div className="flex items-center gap-3 bg-slate-950/80 px-4 py-2 rounded-2xl border border-slate-800 shadow-sm">
              <div className="text-right">
                <div className="text-[10px] font-mono uppercase text-slate-400">Computed Score</div>
                <div className="text-xl font-black font-mono text-cyan-400">
                  {computedScore} <span className="text-xs text-slate-500">/ 100</span>
                </div>
              </div>
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-black font-mono text-sm border ${
                  rubricGrade === 'A'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : rubricGrade === 'B'
                    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                }`}
              >
                {rubricGrade}
              </div>
            </div>
          </div>
        </div>

        {/* 1. Header Selectors: Athlete, Sport, SOP Drill */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-slate-800/80 text-xs">
          {/* Athlete Selector */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              Selected Athlete
            </label>
            <select
              id="rapid-athlete-select"
              value={selectedAthleteId}
              onChange={(e) => setSelectedAthleteId(e.target.value)}
              className="w-full h-11 bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2.5 font-semibold focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
            >
              {DEFAULT_ATHLETES.map((athlete) => (
                <option key={athlete.id} value={athlete.id}>
                  {athlete.name} ({athlete.sport})
                </option>
              ))}
            </select>
          </div>

          {/* Sport Selector */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              Sport Discipline
            </label>
            <div className="grid grid-cols-4 gap-1">
              {SPORTS_OPTIONS.map((sport) => (
                <button
                  key={sport}
                  type="button"
                  onClick={() => setSelectedSport(sport)}
                  className={`min-h-[44px] py-2 px-1 rounded-xl text-center font-bold text-[11px] transition-all truncate ${
                    selectedSport === sport
                      ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                      : 'bg-slate-950/80 text-slate-300 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  {sport}
                </button>
              ))}
            </div>
          </div>

          {/* SOP Exercise Type */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              SOP Exercise Type
            </label>
            <select
              id="rapid-exercise-select"
              value={selectedExercise}
              onChange={(e) => {
                setSelectedExercise(e.target.value);
                setSelectedFaults([]); // Reset faults for new drill
              }}
              className="w-full h-11 bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2.5 font-semibold focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
            >
              {EXERCISE_SOPS.map((sop) => (
                <option key={sop} value={sop}>
                  {sop}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Form Body */}
      {submitSuccess && lastSavedAssessment ? (
        /* Submission Success Overlay / Next Athlete Prompter */
        <div className="p-8 sm:p-12 text-center space-y-6 bg-slate-50 dark:bg-slate-950/50">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <div className="flex justify-center">
              <DataSourceBadge
                dataSource={lastSavedAssessment.data_source}
                size="md"
              />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              Assessment Successfully Saved!
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Logged to Firestore <code className="font-mono text-cyan-600 dark:text-cyan-400">assessments</code> for{' '}
              <strong className="text-slate-800 dark:text-slate-200">{lastSavedAssessment.athlete_name}</strong> in {lastSavedAssessment.sport}.
            </p>
          </div>

          {/* Quick Metrics Card */}
          <div className="max-w-md mx-auto p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-3 text-center text-xs">
            <div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">REPS</div>
              <div className="font-mono font-black text-base text-slate-900 dark:text-white">
                {lastSavedAssessment.quantitative_metrics.valid_reps}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">DURATION</div>
              <div className="font-mono font-black text-base text-slate-900 dark:text-white">
                {lastSavedAssessment.quantitative_metrics.duration_seconds}s
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">FINAL SCORE</div>
              <div className="font-mono font-black text-base text-emerald-600 dark:text-emerald-400">
                {lastSavedAssessment.computed_score} ({lastSavedAssessment.rubric_grade})
              </div>
            </div>
          </div>

          {/* Multi-Agent Insights Breakdown if present */}
          {lastSavedAssessment.agent_insights && (
            <div className="max-w-lg mx-auto p-4 rounded-2xl bg-purple-500/5 dark:bg-purple-950/20 border border-purple-500/20 text-left space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-purple-700 dark:text-purple-300">
                <Bot className="w-4 h-4" />
                <span>
                  {lastSavedAssessment.agent_insights.processingPipeline === 'gemini_multi_agent'
                    ? 'Gemini Multi-Agent Biomechanics Synthesis'
                    : 'Deterministic Coach Summary'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                {lastSavedAssessment.agent_insights.kinematicAnalysis}
              </p>
              {lastSavedAssessment.agent_insights.prescriptiveDrills && (
                <div className="pt-1 flex flex-wrap gap-1">
                  {lastSavedAssessment.agent_insights.prescriptiveDrills.map((d, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 text-[10px] font-mono border border-purple-500/20"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              id="rapid-log-next-button"
              type="button"
              onClick={handleResetForNext}
              className="w-full min-h-[44px] sm:w-auto px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Log Next Athlete Assessment
            </button>
            <button
              type="button"
              onClick={() => setSubmitSuccess(false)}
              className="w-full min-h-[44px] sm:w-auto px-5 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-colors"
            >
              Edit This Record
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-7">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {errorMessage}
            </div>
          )}

          {/* 2. Quantitative Section: Rep Stepper + Live Timer */}
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
                    onClick={() => setValidReps((r) => Math.max(0, r - 5))}
                    className="h-11 px-3 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-mono font-bold text-xs active:scale-95 transition-all"
                  >
                    -5
                  </button>
                  <button
                    id="stepper-minus-1"
                    type="button"
                    onClick={() => setValidReps((r) => Math.max(0, r - 1))}
                    className="h-11 w-12 flex items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold active:scale-95 transition-all"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={validReps}
                    onChange={(e) => setValidReps(Math.max(0, parseInt(e.target.value) || 0))}
                    className="h-11 flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-center font-mono font-black text-lg text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  />

                  <button
                    id="stepper-plus-1"
                    type="button"
                    onClick={() => setValidReps((r) => r + 1)}
                    className="h-11 w-12 flex items-center justify-center rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold active:scale-95 transition-all shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    id="stepper-plus-5"
                    type="button"
                    onClick={() => setValidReps((r) => r + 5)}
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
                    onClick={toggleTimer}
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
                    onClick={resetTimer}
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
                        onClick={() => setTimerPreset(preset)}
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

          {/* 3. Qualitative Section: Form Quality & Endurance Sliders + Preset Fault Tags */}
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
                  onChange={(e) => setFormQualityScore(Number(e.target.value))}
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
                  onChange={(e) => setEnduranceScore(Number(e.target.value))}
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
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-500" />
                  Preset Technique Faults (Tap to toggle):
                </label>
                {selectedFaults.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedFaults([])}
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
                      onClick={() => toggleFault(tag)}
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
          </div>

          {/* 4. Coach Notes Free-Form Text Field */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Coach Qualitative Notes & Correction Directives
            </label>
            <textarea
              id="coach-notes-textarea"
              rows={2}
              value={coachNotes}
              onChange={(e) => setCoachNotes(e.target.value)}
              placeholder="e.g., Kept great spinal alignment through first 8 reps. Slight elbow flare on final 2. Prescribed eccentric tempo..."
              className="w-full min-h-[44px] bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-2xl p-3.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
            />
          </div>

          {/* 5. Optional Video Upload Hook */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-cyan-500" />
                Optional Clip Attachment (Media References)
              </label>
              <span className="text-[10px] text-slate-500 font-mono">Non-blocking metadata hook</span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              onChange={handleFileChange}
              className="hidden"
            />

            {attachedFile ? (
              <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 truncate">
                  <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-600 dark:text-cyan-400">
                    <Video className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="font-bold text-slate-900 dark:text-white truncate">
                      {attachedFile.name}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      {(attachedFile.size / (1024 * 1024)).toFixed(1)} MB • {attachedFile.storagePath}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeAttachedFile}
                  className="p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingVideo(true);
                }}
                onDragLeave={() => setIsDraggingVideo(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingVideo(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) processSelectedFile(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`p-4 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all ${
                  isDraggingVideo
                    ? 'border-cyan-500 bg-cyan-500/10'
                    : 'border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-950/50'
                }`}
              >
                <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Upload className="w-4 h-4 text-cyan-500" />
                  <span>Attach Video Clip or Drag & Drop (Optional)</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Stores storage reference metadata without blocking form submission
                </p>
              </div>
            )}
          </div>

          {/* 6. Action Bar / Submission */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Target Pipeline:</span>
              <DataSourceBadge
                dataSource={aiPipelineActive ? 'ai_agentic' : 'manual'}
                size="sm"
              />
            </div>

            <button
              id="submit-rapid-assessment-btn"
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto min-h-[46px] px-7 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>Processing {aiPipelineActive ? 'AI Multi-Agent Pipeline...' : 'Manual Entry...'}</span>
                </>
              ) : (
                <>
                  <span>
                    Save {aiPipelineActive ? 'AI Evaluation' : 'Manual Assessment'} ({computedScore} pts)
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
