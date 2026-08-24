'use client';

import React, { useState } from 'react';
import {
  DataSource,
  calculateComputedScore,
  deriveRubricGrade,
} from '@/types/assessment';
import { useAuth } from '@/lib/authContext';
import { useAthletesSubscription } from '@/hooks/useAthletesSubscription';
import RapidAssessmentForm from './RapidAssessmentForm';
import LiveAssessmentDashboard from './LiveAssessmentDashboard';
import ExerciseVideoModal from './ExerciseVideoModal';
import BiomechanicsHeader, { BiomechanicsViewMode } from './sections/BiomechanicsHeader';
import AssessmentSessionConfig, {
  AthleteOption,
  SportConfig,
} from './sections/AssessmentSessionConfig';
import StudioQuantitativePanel from './sections/StudioQuantitativePanel';
import StudioQualitativePanel from './sections/StudioQualitativePanel';
import StudioScoringEngine, {
  AssessmentHistoryItem,
} from './sections/StudioScoringEngine';

export interface AthleteOptionType extends AthleteOption {}
export interface SportConfigType extends SportConfig {}

const sportsConfig: Record<string, SportConfig> = {
  'Football (Soccer)': {
    exercises: ['Squats & Lower Kinetic Chain', 'Sprint Acceleration Start', 'Max Power Kick Hip Hinge', 'Agility Shuttles'],
    sops: ['Countermovement Jump SOP', 'Squat Depth & Valgus SOP', 'Deceleration Cut SOP'],
    rubricGradeA: 'Optimal hip hinge extension (>165°), zero knee valgus collapse during kick impact.',
    rubricGradeB: 'Slight quadriceps dominance, minor trunk lean (5-10° angle deficit).',
    rubricGradeC: 'Excessive medial knee collapse (valgus), high ACL stress risk during cut.',
    targetJoints: ['Knee Flexion (85°-95°)', 'Hip Hinge (160°-175°)', 'Ankle Plantar Angle (30°-45°)'],
    defaultKnee: 90,
    defaultHip: 165,
    commonFaults: ['knee_valgus', 'trunk_lean', 'asymmetric_loading', 'heel_lift'],
  },
  'Cricket': {
    exercises: ['Fast Bowling Action', 'Spin Bowling Release', 'Batting Cover Drive', 'Wicket Keeping Reaction'],
    sops: ['Front Knee Brace SOP', 'Elbow Extension Lawful SOP', 'Lateral Trunk Flexion SOP'],
    rubricGradeA: 'Front knee brace at release (>150° stiffness), trunk lateral flexion <15°.',
    rubricGradeB: 'Front knee flexes moderately upon impact, slight lumbar hyperextension.',
    rubricGradeC: 'Severe front leg collapse, illegal elbow extension angle exceedance (>15°).',
    targetJoints: ['Front Knee Brace Angle (150°-165°)', 'Elbow Extension (<15°)', 'Trunk Flexion (20°-30°)'],
    defaultKnee: 155,
    defaultHip: 140,
    commonFaults: ['front_knee_collapse', 'elbow_hyperextension', 'lumbar_overstride'],
  },
  'Badminton': {
    exercises: ['Overhead Smash Drive', 'Forehand Lunge Recovery', 'Backhand Drop Shot', 'Lateral Court Footwork'],
    sops: ['Lunge Deceleration SOP', 'Overhead Pronation SOP', 'Split-Step Reaction SOP'],
    rubricGradeA: 'Peak shoulder internal rotation velocity, lead knee over ankle alignment during lunge.',
    rubricGradeB: 'Lead knee extends past toes, slightly delayed pronation during smash impact.',
    rubricGradeC: 'Poor lunge deceleration, trunk hyper-rotation risking lower back strain.',
    targetJoints: ['Shoulder Elevation (110°-130°)', 'Lead Knee Lunge Flexion (90°-100°)', 'Ankle Stability'],
    defaultKnee: 95,
    defaultHip: 125,
    commonFaults: ['over_extension', 'slow_recovery', 'ankle_inversion'],
  },
  'Basketball': {
    exercises: ['Vertical Jump Explosiveness', 'Free Throw Follow-Through', 'Defensive Slide Stance', 'Layup Extension'],
    sops: ['Triple Extension Jump SOP', 'Landing Deceleration SOP', 'Dual-Task Balance SOP'],
    rubricGradeA: 'Symmetrical triple extension (ankle-knee-hip), high takeoff velocity.',
    rubricGradeB: 'Asymmetric takeoff loading (60/40 ground force distribution).',
    rubricGradeC: 'Deep countermovement without kinetic bounce, heavy ground contact time.',
    targetJoints: ['Triple Extension Hip (170°-180°)', 'Landing Knee Flexion (60°-75°)', 'Elbow Follow-Through'],
    defaultKnee: 70,
    defaultHip: 175,
    commonFaults: ['asymmetric_landing', 'quad_dominant', 'stiff_ankles'],
  },
  'Swimming': {
    exercises: ['Freestyle Arm Rotation', 'Flip Turn Push-Off', 'Breaststroke Kick Flexion'],
    sops: ['High Elbow Catch SOP', 'Streamline Angle SOP', 'Flip Turn Angle SOP'],
    rubricGradeA: 'High elbow catch phase, streamline body position angle <5° drag.',
    rubricGradeB: 'Slight drop in elbow positioning, uneven kick cadence.',
    rubricGradeC: 'Excessive hips sink, asymmetric shoulder roll inducing rotator cuff impingement.',
    targetJoints: ['Catch Elbow Angle (100°-110°)', 'Push-off Knee Flexion (110°-120°)', 'Streamline Torso'],
    defaultKnee: 115,
    defaultHip: 160,
    commonFaults: ['dropped_elbow', 'hip_sink', 'uneven_kick_tempo'],
  },
};

export default function BiomechanicsSection() {
  const { user } = useAuth();
  const { athletes } = useAthletesSubscription();
  const sampleAthletes: AthleteOption[] = athletes.map((athlete) => ({
    id: athlete.id,
    name: athlete.name,
    parentEmail: athlete.parentEmail,
  }));
  const [activeView, setActiveView] = useState<BiomechanicsViewMode>('rapid');
  const [selectedSport, setSelectedSport] = useState<string>('Football (Soccer)');
  const currentSportConfig = sportsConfig[selectedSport] || sportsConfig['Football (Soccer)'];

  const [selectedExercise, setSelectedExercise] = useState<string>(currentSportConfig.exercises[0]);
  const [selectedSOP, setSelectedSOP] = useState<string>(currentSportConfig.sops[0]);
  const [selectedAthlete, setSelectedAthlete] = useState<string>('');

  // Workflow Pipeline: 'manual' (default) vs 'ai_agentic'
  const [dataSource, setDataSource] = useState<DataSource>('manual');

  // Exercise Video Guide Modal State
  const [isVideoModalOpen, setIsVideoModalOpen] = useState<boolean>(false);
  const [selectedGuideId, setSelectedGuideId] = useState<string>('sprint_accel');

  // Quantitative Metrics
  const [validReps, setValidReps] = useState<number>(12);
  const [durationSeconds, setDurationSeconds] = useState<number>(45);
  const [avgDepthAngle, setAvgDepthAngle] = useState<number>(currentSportConfig.defaultKnee);

  // Qualitative Observations
  const [formQualityScore, setFormQualityScore] = useState<number>(90);
  const [enduranceScore, setEnduranceScore] = useState<number>(85);
  const [faultTags, setFaultTags] = useState<string[]>([]);
  const [coachNotes, setCoachNotes] = useState<string>('Strong kinetic chain alignment. Consistent rep tempo.');

  // Media References
  const [videoStoragePath, setVideoStoragePath] = useState<string>('assessments/vids/2026_marcus_vance_squats.mp4');
  const [smartGridProcessed, setSmartGridProcessed] = useState<boolean>(false);

  // Status & Ingestion
  const [isIngesting, setIsIngesting] = useState<boolean>(false);
  const [ingestSuccess, setIngestSuccess] = useState<boolean>(false);
  const [lastSavedId, setLastSavedId] = useState<string>('');

  // Assessment history state
  const [assessmentHistory, setAssessmentHistory] = useState<AssessmentHistoryItem[]>([]);

  const handleSportChange = (sport: string) => {
    setSelectedSport(sport);
    const cfg = sportsConfig[sport] || sportsConfig['Football (Soccer)'];
    setSelectedExercise(cfg.exercises[0]);
    setSelectedSOP(cfg.sops[0]);
    setAvgDepthAngle(cfg.defaultKnee);
    setFaultTags([]);
  };

  const toggleFaultTag = (tag: string) => {
    setFaultTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Dynamic W1 = 0.4, W2 = 0.4, W3 = 0.2 score computation
  const computedScore = calculateComputedScore(
    {
      valid_reps: validReps,
      duration_seconds: durationSeconds,
      avg_depth_angle: avgDepthAngle,
    },
    {
      form_quality_score: formQualityScore,
      endurance_score: enduranceScore,
      fault_tags: faultTags,
      coach_notes: coachNotes,
    }
  );

  const activeGradeLetter = deriveRubricGrade(computedScore);

  const getRubricDetails = (score: number) => {
    if (score >= 88) return { text: 'Grade A (Optimal Kinematics & Execution)', color: 'text-emerald-600 dark:text-emerald-400', desc: currentSportConfig.rubricGradeA };
    if (score >= 75) return { text: 'Grade B (Acceptable Mechanics)', color: 'text-cyan-600 dark:text-cyan-400', desc: currentSportConfig.rubricGradeB };
    return { text: 'Grade C (Correction Required)', color: 'text-amber-600 dark:text-amber-400', desc: currentSportConfig.rubricGradeC };
  };

  const activeGrade = getRubricDetails(computedScore);

  const handleSaveAssessment = async () => {
    setIsIngesting(true);
    setIngestSuccess(false);

    const athleteObj = sampleAthletes.find((a) => a.id === selectedAthlete) || sampleAthletes[0];

    try {
      if (!user || !athleteObj) throw new Error('An authenticated user and athlete are required.');
      const response = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
        athlete_id: athleteObj.id,
        athlete_name: athleteObj.name,
        parent_email: athleteObj.parentEmail,
        sport: selectedSport,
        exercise_type: selectedExercise,
        grading_rubric_sop: selectedSOP,
        coach_id: 'coach_marcus_vance',
        coach_name: 'Coach Marcus Vance',
        quantitative_metrics: {
          valid_reps: validReps,
          avg_depth_angle: avgDepthAngle,
          duration_seconds: durationSeconds,
        },
        qualitative_observations: {
          form_quality_score: formQualityScore,
          endurance_score: enduranceScore,
          fault_tags: faultTags,
          coach_notes: coachNotes,
        },
        media_references: {
          video_storage_path: videoStoragePath || undefined,
          smart_grid_processed: smartGridProcessed,
        },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to persist assessment.');
      const savedDoc = data.assessment;

      setLastSavedId(savedDoc.id);
      setIngestSuccess(true);

      setAssessmentHistory((prev) => [
        {
          id: savedDoc.id,
          athlete: athleteObj.name,
          sport: selectedSport,
          exercise: selectedSOP,
          source: dataSource,
          score: savedDoc.computed_score,
          grade: savedDoc.rubric_grade || 'A',
          date: 'Just now',
        },
        ...prev,
      ]);
    } catch (error) {
      console.error('Assessment persistence failed:', error);
    } finally {
      setIsIngesting(false);
    }
  };

  return (
    <div className="space-y-6 transition-colors duration-200">
      {/* Header Banner & Sub-View Switcher */}
      <BiomechanicsHeader
        activeView={activeView}
        onViewChange={setActiveView}
        onOpenVideoModal={() => setIsVideoModalOpen(true)}
      />

      {activeView === 'rapid' && (
        <div className="space-y-6">
          <RapidAssessmentForm
            onAssessmentSaved={(doc) => {
              setAssessmentHistory((prev) => [
                {
                  id: doc.id,
                  athlete: doc.athlete_name,
                  sport: doc.sport,
                  exercise: doc.grading_rubric_sop || doc.exercise_type,
                  source: doc.data_source,
                  score: doc.computed_score,
                  grade: doc.rubric_grade || 'A',
                  date: 'Just now',
                },
                ...prev,
              ]);
            }}
          />

          {/* Real-time Telemetry & Developmental Radar Snapshot in Rapid Mode */}
          <div className="pt-2">
            <LiveAssessmentDashboard />
          </div>
        </div>
      )}

      {activeView === 'analytics' && (
        <div className="space-y-6">
          <LiveAssessmentDashboard />
        </div>
      )}

      {activeView === 'studio' && (
        <div className="space-y-6">
          {/* Target Configuration Header */}
          <AssessmentSessionConfig
            dataSource={dataSource}
            selectedSport={selectedSport}
            onSportChange={handleSportChange}
            sportsConfig={sportsConfig}
            currentSportConfig={currentSportConfig}
            selectedExercise={selectedExercise}
            onExerciseChange={setSelectedExercise}
            selectedSOP={selectedSOP}
            onSOPChange={setSelectedSOP}
            selectedAthlete={selectedAthlete}
            onAthleteChange={setSelectedAthlete}
            sampleAthletes={sampleAthletes}
            activeGrade={activeGrade}
          />

          {/* Main Scoring Grid: Metrics / Observations vs Computed Score & Media */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Quantitative & Qualitative Inputs */}
            <div className="lg:col-span-2 space-y-6">
              <StudioQuantitativePanel
                validReps={validReps}
                onValidRepsChange={setValidReps}
                durationSeconds={durationSeconds}
                onDurationSecondsChange={setDurationSeconds}
                avgDepthAngle={avgDepthAngle}
                onAvgDepthAngleChange={setAvgDepthAngle}
                currentSportConfig={currentSportConfig}
              />

              <StudioQualitativePanel
                formQualityScore={formQualityScore}
                onFormQualityScoreChange={setFormQualityScore}
                enduranceScore={enduranceScore}
                onEnduranceScoreChange={setEnduranceScore}
                faultTags={faultTags}
                onToggleFaultTag={toggleFaultTag}
                coachNotes={coachNotes}
                onCoachNotesChange={setCoachNotes}
                currentSportConfig={currentSportConfig}
              />
            </div>

            {/* Right Column: Computed Score Card & Postgres Ingestion */}
            <StudioScoringEngine
              computedScore={computedScore}
              activeGradeLetter={activeGradeLetter}
              activeGrade={activeGrade}
              formQualityScore={formQualityScore}
              enduranceScore={enduranceScore}
              validReps={validReps}
              faultTags={faultTags}
              videoStoragePath={videoStoragePath}
              onVideoStoragePathChange={setVideoStoragePath}
              smartGridProcessed={smartGridProcessed}
              onToggleSmartGrid={() => setSmartGridProcessed(!smartGridProcessed)}
              onSaveAssessment={handleSaveAssessment}
              isIngesting={isIngesting}
              ingestSuccess={ingestSuccess}
              lastSavedId={lastSavedId}
              dataSource={dataSource}
              assessmentHistory={assessmentHistory}
            />
          </div>
        </div>
      )}

      {/* Exercise Instructional Video & Biomechanics Guide Modal */}
      <ExerciseVideoModal
        exerciseId={selectedGuideId}
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
      />
    </div>
  );
}
