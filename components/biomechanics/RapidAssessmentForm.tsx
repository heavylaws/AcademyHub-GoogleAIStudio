'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  User,
  Plus,
  CheckCircle2,
  AlertCircle,
  Flame,
  Layers,
  ArrowRight,
  Cpu,
  Bot,
  ToggleLeft,
  ToggleRight,
  Sparkles,
} from 'lucide-react';
import {
  Assessment,
  calculateComputedScore,
  deriveRubricGrade,
} from '@/types/assessment';
import { useAuth } from '@/lib/authContext';
import { useAthletesSubscription } from '@/hooks/useAthletesSubscription';
import {
  evaluateAssessment,
  isAIPipelineEnabled,
  setAIPipelineOverride,
  EvaluatedAssessment,
} from '@/services/evaluationService';
import DataSourceBadge from './DataSourceBadge';
import MetricsInputPanel from './RapidAssessmentForm/MetricsInputPanel';
import QualitativeObservationsPanel from './RapidAssessmentForm/QualitativeObservationsPanel';
import VideoAttachmentHook, { AttachedFileInfo } from './RapidAssessmentForm/VideoAttachmentHook';

export interface RapidAthlete {
  id: string;
  name: string;
  sport: string;
  parentEmail: string;
  avatarUrl?: string;
}

export const SPORTS_OPTIONS = ['Football', 'Basketball', 'Cricket', 'Swimming'] as const;
export type SportType = typeof SPORTS_OPTIONS[number];

export const EXERCISE_SOPS = [
  'Push-ups',
  'Countermovement Jump',
  'Squat Jump',
  'Agility Shuttles',
  'Core Plank Stability'
] as const;

export interface RapidAssessmentFormProps {
  onAssessmentSaved?: (assessment: Assessment) => void;
  defaultSport?: SportType;
  defaultAthleteId?: string;
  coachId?: string;
  coachName?: string;
}

export default function RapidAssessmentForm({
  onAssessmentSaved,
  defaultSport = 'Football',
  defaultAthleteId = '',
  coachId = 'coach_marcus_vance',
  coachName = 'Coach Marcus Vance',
}: RapidAssessmentFormProps) {
  const { user } = useAuth();
  const { athletes, loading: athletesLoading, error: athletesError } = useAthletesSubscription();
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
  const [attachedFile, setAttachedFile] = useState<AttachedFileInfo | null>(null);
  const [isDraggingVideo, setIsDraggingVideo] = useState<boolean>(false);

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

  const effectiveSelectedAthleteId = selectedAthleteId || athletes[0]?.id || '';

  // Selected athlete lookup
  const selectedAthleteRecord = athletes.find((athlete) => athlete.id === effectiveSelectedAthleteId) || athletes[0];
  const selectedAthlete: RapidAthlete | null = selectedAthleteRecord
    ? {
        id: selectedAthleteRecord.id,
        name: selectedAthleteRecord.name,
        sport: selectedAthleteRecord.sportsEnrolled[0] || '',
        parentEmail: selectedAthleteRecord.parentEmail,
      }
    : null;

  // Fault tag toggling
  const toggleFault = (tag: string) => {
    setSelectedFaults((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const clearFaults = () => {
    setSelectedFaults([]);
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

  const handleFileSelect = (file: File) => {
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

  const handleFileRemove = () => {
    if (attachedFile?.localPreviewUrl) {
      URL.revokeObjectURL(attachedFile.localPreviewUrl);
    }
    setAttachedFile(null);
  };

  // Form Submission Action -> evaluate route -> authenticated Postgres persistence route
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (!user || !selectedAthlete) {
        setErrorMessage(!user
          ? 'Authentication required: Please sign in to submit assessments.'
          : 'No athlete is available. Create an athlete before submitting an assessment.');
        return;
      }
      const athlete = selectedAthlete;

      // 1. Process assessment through the evaluation service (deterministic or Gemini AI based on feature flag)
      const authToken = await user.getIdToken();
      const evaluated = await evaluateAssessment({
        athlete_id: athlete.id,
        athlete_name: athlete.name,
        parent_email: athlete.parentEmail,
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
      }, undefined, authToken);

      // 2. Persist the evaluated result through the authenticated Postgres API.
      const persistResponse = await fetch('/api/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(evaluated),
      });
      const persistData = await persistResponse.json();
      if (!persistResponse.ok) {
        throw new Error(persistData.error || 'Failed to persist assessment.');
      }
      const savedAssessment = persistData.assessment as EvaluatedAssessment;

      setLastSavedAssessment(savedAssessment);
      setSubmitSuccess(true);
      if (onAssessmentSaved) {
        onAssessmentSaved(savedAssessment);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to persist assessment.');
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
    handleFileRemove();
  };

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
              value={effectiveSelectedAthleteId}
              onChange={(e) => setSelectedAthleteId(e.target.value)}
              className="w-full h-11 bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2.5 font-semibold focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
            >
              {athletes.map((athlete) => (
                <option key={athlete.id} value={athlete.id}>
                  {athlete.name} ({athlete.sportsEnrolled.join(', ') || 'No sport'})
                </option>
              ))}
            </select>
            {athletesLoading && <p className="mt-1 text-[10px] text-slate-400">Loading athletes...</p>}
            {athletesError && <p className="mt-1 text-[10px] text-rose-300">Unable to load athletes: {athletesError}</p>}
            {!athletesLoading && !athletesError && athletes.length === 0 && (
              <p className="mt-1 text-[10px] text-amber-300">No athletes yet.</p>
            )}
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
              Logged to Postgres <code className="font-mono text-cyan-600 dark:text-cyan-400">assessments</code> for{' '}
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

          {/* Multi-Agent Insights Breakdown — only shown for real AI evaluations */}
          {lastSavedAssessment.pipeline_status === 'ai_evaluated' && lastSavedAssessment.agent_insights ? (
            <div className="max-w-lg mx-auto p-4 rounded-2xl bg-purple-500/5 dark:bg-purple-950/20 border border-purple-500/20 text-left space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-purple-700 dark:text-purple-300">
                <Bot className="w-4 h-4" />
                <span>Gemini Multi-Agent Biomechanics Synthesis</span>
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
          ) : (
            <div className="max-w-lg mx-auto p-3 rounded-2xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/20 text-left text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-amber-700 dark:text-amber-300 font-semibold">
                Deterministic scoring — AI analysis unavailable
              </span>
              {lastSavedAssessment.error_detail && (
                <span className="text-[10px] text-slate-500 font-mono ml-auto truncate max-w-[200px]" title={lastSavedAssessment.error_detail}>
                  {lastSavedAssessment.error_detail}
                </span>
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
          <MetricsInputPanel
            selectedExercise={selectedExercise}
            validReps={validReps}
            onValidRepsChange={setValidReps}
            durationSeconds={durationSeconds}
            isTimerRunning={isTimerRunning}
            onToggleTimer={toggleTimer}
            onResetTimer={resetTimer}
            onSetTimerPreset={setTimerPreset}
          />

          {/* 3. Qualitative Section: Form Quality & Endurance Sliders + Preset Fault Tags + Coach Notes */}
          <QualitativeObservationsPanel
            selectedExercise={selectedExercise}
            formQualityScore={formQualityScore}
            onFormQualityScoreChange={setFormQualityScore}
            enduranceScore={enduranceScore}
            onEnduranceScoreChange={setEnduranceScore}
            selectedFaults={selectedFaults}
            onToggleFault={toggleFault}
            onClearFaults={clearFaults}
            coachNotes={coachNotes}
            onCoachNotesChange={setCoachNotes}
          />

          {/* 4. Optional Video Upload Hook */}
          <VideoAttachmentHook
            attachedFile={attachedFile}
            onFileSelect={handleFileSelect}
            onFileRemove={handleFileRemove}
            isDraggingVideo={isDraggingVideo}
            onDragStateChange={setIsDraggingVideo}
          />

          {/* 5. Action Bar / Submission */}
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
