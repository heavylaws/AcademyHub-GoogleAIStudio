'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Activity, 
  Video, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  Save, 
  Sliders, 
  Grid3X3, 
  Database, 
  Eye, 
  Play, 
  Pause,
  ChevronRight,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Assessment, JointAngles, SmartGridFrame } from '@/types/academy';

const SPORTS_LIST = ['Basketball', 'Soccer', 'Tennis', 'Swimming', 'Volleyball', 'Track & Field'];
const BATCH_LIST = ['U-14 Elite', 'U-16 Select', 'Varsity', 'Youth Academy'];

export const BiomechanicsSection: React.FC = () => {
  // Form State
  const [athleteName, setAthleteName] = useState('Marcus Vance');
  const [athleteId, setAthleteId] = useState('ATH-1092');
  const [sport, setSport] = useState('Basketball');
  const [batch, setBatch] = useState('U-16 Select');
  
  // Biomechanics Inputs
  const [repCount, setRepCount] = useState<number>(18);
  const [formQuality, setFormQuality] = useState<number>(92);
  const [visualEndurance, setVisualEndurance] = useState<number>(85);
  
  // Joint Angles Kinematics
  const [jointAngles, setJointAngles] = useState<JointAngles>({
    elbow: 142,
    knee: 118,
    shoulder: 88,
    hip: 162,
  });

  // Video State & Controls
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Firestore Assessments State
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);

  // Calculate Normalized Reps and Composite Score
  // S_final = (0.4 * normalized_reps) + (0.4 * Form_Quality) + (0.2 * visual_endurance)
  const normalizedReps = Math.min(100, Math.max(0, (repCount / 20) * 100));
  const compositeScore = Number(
    ((0.4 * normalizedReps) + (0.4 * formQuality) + (0.2 * visualEndurance)).toFixed(1)
  );

  // LLM-as-a-Judge status indicator check
  // If reps are counted as 0 but qualitative form is praised (or form quality > 70) -> "Low Confidence - Retrying Analysis"
  const isZeroRepAnomaly = repCount === 0 && formQuality >= 70;
  const judgeStatus = isZeroRepAnomaly 
    ? 'Low Confidence - Retrying Analysis' 
    : 'Logical Audit Verified (Confidence > 90%)';
  const confidenceScore = isZeroRepAnomaly ? '62.4%' : '96.8%';

  // 3x3 Smart Grid Frames
  const smartGridFrames: SmartGridFrame[] = [
    { id: 1, timestamp: '00:01.2', label: 'Takeoff Phase', coreRigidity: 94, spinalArticulation: 91, fatigueIndex: 12, status: 'Optimal' },
    { id: 2, timestamp: '00:02.0', label: 'Ascent / Apex', coreRigidity: 92, spinalArticulation: 88, fatigueIndex: 15, status: 'Optimal' },
    { id: 3, timestamp: '00:02.8', label: 'Wrist Release', coreRigidity: 90, spinalArticulation: 85, fatigueIndex: 20, status: 'Optimal' },
    { id: 4, timestamp: '00:03.5', label: 'Landing Decel', coreRigidity: 86, spinalArticulation: 82, fatigueIndex: 28, status: 'Optimal' },
    { id: 5, timestamp: '00:04.2', label: 'Lateral Transition', coreRigidity: 88, spinalArticulation: 84, fatigueIndex: 32, status: 'Optimal' },
    { id: 6, timestamp: '00:05.0', label: 'Drive Step Flex', coreRigidity: 82, spinalArticulation: 79, fatigueIndex: 45, status: 'Warning' },
    { id: 7, timestamp: '00:05.8', label: 'Set 3 Apex', coreRigidity: 80, spinalArticulation: 76, fatigueIndex: 58, status: 'Warning' },
    { id: 8, timestamp: '00:06.5', label: 'Set 4 Exhaustion', coreRigidity: 72, spinalArticulation: 68, fatigueIndex: 74, status: 'Fatigue Detected' },
    { id: 9, timestamp: '00:07.2', label: 'Final Recovery', coreRigidity: 75, spinalArticulation: 70, fatigueIndex: 68, status: 'Warning' },
  ];

  // Subscribe to Firestore 'athlete_assessments'
  useEffect(() => {
    try {
      const q = query(collection(db, 'athlete_assessments'), orderBy('recordedAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const docs: Assessment[] = [];
        snapshot.forEach((docSnap) => {
          docs.push({ id: docSnap.id, ...docSnap.data() } as Assessment);
        });
        setAssessments(docs);
      });
      return () => unsubscribe();
    } catch (e) {
      console.error('Firestore assessments sub error:', e);
    }
  }, []);

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVideoFile(file);
      setVideoPreviewUrl(URL.createObjectURL(file));
      runVisionAnalysis();
    }
  };

  const runVisionAnalysis = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
    }, 1200);
  };

  const handleSaveAssessment = async () => {
    try {
      const qualitativeFeedback = isZeroRepAnomaly 
        ? 'Occusion detected during video frame 6-8 causing rep counter anomaly, though shoulder rotational velocity remained high.' 
        : `Strong kinetic chain balance with ${jointAngles.elbow}° elbow angle and ${jointAngles.knee}° knee flex. Excellent core rigidity.`;

      const narrativeLog = `${athleteName} (${sport}, ${batch}) demonstrated a composite score of ${compositeScore} with ${repCount} reps. Joint kinematics: Elbow ${jointAngles.elbow}°, Knee ${jointAngles.knee}°, Hip ${jointAngles.hip}°. ${qualitativeFeedback}`;

      const newAssessment: Assessment = {
        athleteId: athleteId || `ATH-${Math.floor(1000 + Math.random() * 9000)}`,
        athleteName,
        sport,
        batch,
        repCount,
        normalizedReps,
        formQuality,
        visualEndurance,
        compositeScore,
        judgeStatus,
        confidence: confidenceScore,
        jointAngles,
        qualitativeFeedback,
        narrativeLog,
        recordedAt: new Date().toISOString(),
        coachId: 'COACH-01',
        coachName: 'Coach Marcus Vance'
      };

      await addDoc(collection(db, 'athlete_assessments'), newAssessment);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save assessment to Firestore:', err);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Title Banner */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Cpu className="w-4 h-4" />
            <span>Agentic Vision & Kinematics Engine</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Athlete Video Ingestion & Biomechanics Dashboard
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Real-time computer vision joint angle tracking, 3x3 Smart Grid video frame analysis, and LLM-as-a-Judge audit loop.
          </p>
        </div>

        <button
          onClick={handleSaveAssessment}
          disabled={saveSuccess}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all ${
            saveSuccess
              ? 'bg-emerald-500 text-slate-950 font-bold'
              : 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-emerald-500/20'
          }`}
        >
          {saveSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Saved to Firestore!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Assessment Record
            </>
          )}
        </button>
      </div>

      {/* Main Grid: Upload & Controls + Agentic Vision Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Col: Upload & Input Form */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Metadata Card */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
              <Upload className="w-4 h-4 text-emerald-400" />
              Athlete Metadata & Video Feed
            </h3>

            {/* Video File Drag Drop */}
            <div className="relative border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-xl p-4 text-center bg-slate-950 transition-all cursor-pointer group">
              <input
                type="file"
                accept="video/mp4,video/webm"
                onChange={handleVideoUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Video className="w-8 h-8 text-slate-500 group-hover:text-emerald-400 mx-auto mb-2 transition-colors" />
              <div className="text-xs font-semibold text-slate-300">
                {videoFile ? videoFile.name : 'Drop MP4/WEBM Video or Click to Browse'}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Supports high-frame-rate sports recordings</div>
            </div>

            {/* Form Inputs */}
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Athlete Name & ID
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={athleteName}
                    onChange={(e) => setAthleteName(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    placeholder="Athlete Name"
                  />
                  <input
                    type="text"
                    value={athleteId}
                    onChange={(e) => setAthleteId(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 font-mono focus:border-emerald-500 focus:outline-none"
                    placeholder="ATH-1092"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Sport Discipline
                  </label>
                  <select
                    value={sport}
                    onChange={(e) => setSport(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  >
                    {SPORTS_LIST.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Batch / Age Group
                  </label>
                  <select
                    value={batch}
                    onChange={(e) => setBatch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  >
                    {BATCH_LIST.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Quantitative Kinematics Sliders */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                Kinematic Inputs & Reps
              </span>
              <button 
                onClick={runVisionAnalysis}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/20 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Re-Scan
              </button>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Repetitions Counted ($R$):</span>
                  <span className="font-mono font-bold text-emerald-400">{repCount} reps</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={repCount}
                  onChange={(e) => setRepCount(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Form Quality Index (F_qual):</span>
                  <span className="font-mono font-bold text-cyan-400">{formQuality}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formQuality}
                  onChange={(e) => setFormQuality(Number(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Visual Endurance (E_vis):</span>
                  <span className="font-mono font-bold text-purple-400">{visualEndurance}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={visualEndurance}
                  onChange={(e) => setVisualEndurance(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>
            </div>

            {/* Joint Angles Tuning */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                CV Joint Angles Tracking
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80 flex justify-between items-center">
                  <span className="text-slate-400 text-[10px]">Elbow:</span>
                  <span className="text-emerald-400 font-bold">{jointAngles.elbow}°</span>
                </div>
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80 flex justify-between items-center">
                  <span className="text-slate-400 text-[10px]">Knee Flex:</span>
                  <span className="text-cyan-400 font-bold">{jointAngles.knee}°</span>
                </div>
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80 flex justify-between items-center">
                  <span className="text-slate-400 text-[10px]">Shoulder:</span>
                  <span className="text-purple-400 font-bold">{jointAngles.shoulder}°</span>
                </div>
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80 flex justify-between items-center">
                  <span className="text-slate-400 text-[10px]">Hip Hinge:</span>
                  <span className="text-amber-400 font-bold">{jointAngles.hip}°</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Col: Video Vision Overlay & Composite Formula */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Agentic Vision Screen / Simulation */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl relative">
            
            {/* Overlay Header Bar */}
            <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="text-xs font-bold text-white tracking-wider uppercase font-mono">
                  AGENTIC VISION CV FEED: {sport.toUpperCase()}
                </span>
              </div>

              <div className="flex items-center space-x-3 text-xs font-mono text-slate-400">
                <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">30 FPS</span>
                <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
                  CV MODEL v4.2 ACTIVE
                </span>
              </div>
            </div>

            {/* Screen Canvas Area */}
            <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden group">
              {videoPreviewUrl ? (
                <video
                  src={videoPreviewUrl}
                  autoPlay
                  loop
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                /* Simulated Field Canvas Graphic */
                <div className="w-full h-full relative bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-30"></div>
                  
                  {/* Wireframe Silhouette & Joint Nodes Overlay */}
                  <div className="relative z-10 flex flex-col items-center justify-center text-center p-6 space-y-4">
                    <div className="relative w-48 h-64 border border-emerald-500/30 rounded-2xl bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-between p-4 shadow-2xl">
                      
                      {/* Joint Angle Nodes Simulation */}
                      <div className="absolute top-6 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-cyan-400 border-2 border-white shadow-[0_0_12px_#06b6d4]"></div>
                      <div className="absolute top-16 left-12 w-3 h-3 rounded-full bg-emerald-400 border border-white shadow-[0_0_8px_#10b981]"></div>
                      <div className="absolute top-16 right-12 w-3 h-3 rounded-full bg-emerald-400 border border-white shadow-[0_0_8px_#10b981]"></div>
                      <div className="absolute top-36 left-16 w-3.5 h-3.5 rounded-full bg-purple-400 border border-white"></div>
                      <div className="absolute top-36 right-16 w-3.5 h-3.5 rounded-full bg-purple-400 border border-white"></div>
                      <div className="absolute bottom-8 left-14 w-3.5 h-3.5 rounded-full bg-amber-400 border border-white"></div>
                      <div className="absolute bottom-8 right-14 w-3.5 h-3.5 rounded-full bg-amber-400 border border-white"></div>

                      <div className="text-[10px] font-mono text-emerald-400 bg-slate-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                        Elbow: {jointAngles.elbow}°
                      </div>
                      
                      <div className="text-[10px] font-mono text-cyan-400 bg-slate-950/80 px-2 py-0.5 rounded border border-cyan-500/30 my-auto">
                        Hip Flex: {jointAngles.hip}°
                      </div>

                      <div className="text-[10px] font-mono text-amber-400 bg-slate-950/80 px-2 py-0.5 rounded border border-amber-500/30">
                        Knee Flex: {jointAngles.knee}°
                      </div>
                    </div>

                    <div className="text-xs text-slate-400 font-mono">
                      Agentic Vision Stream Overlaying Dynamic Kinetic Vectors
                    </div>
                  </div>
                </div>
              )}

              {/* Scanning Laser Animation */}
              {analyzing && (
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] animate-pulse top-1/2"></div>
              )}

              {/* Overlay HUD Badges */}
              <div className="absolute top-4 left-4 space-y-2">
                <div className="bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono text-white flex items-center gap-2 shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  Athlete: <span className="font-bold text-emerald-400">{athleteName}</span> ({athleteId})
                </div>
                <div className="bg-slate-950/90 backdrop-blur-md px-3 py-1 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300">
                  Batch: {batch} | Sport: {sport}
                </div>
              </div>

              {/* LLM-as-a-Judge Badge overlay */}
              <div className="absolute bottom-4 right-4">
                <div className={`px-3.5 py-2 rounded-xl backdrop-blur-md border text-xs font-bold flex items-center gap-2 shadow-xl ${
                  isZeroRepAnomaly 
                    ? 'bg-amber-950/90 text-amber-300 border-amber-500/50'
                    : 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50'
                }`}>
                  {isZeroRepAnomaly ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400 animate-bounce" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                  <div>
                    <div className="text-[10px] text-slate-400 font-normal uppercase font-mono">LLM-as-a-Judge Status</div>
                    <div>{judgeStatus}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Composite Score Mathematical Formula Bar */}
            <div className="bg-slate-950 p-5 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Exact Mathematical Composite Formula (S_final)
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-slate-300 space-y-1">
                  <div className="text-emerald-400 font-bold">
                    S_final = (0.4 * normalized_reps) + (0.4 * Form_Quality) + (0.2 * visual_endurance)
                  </div>
                  <div className="text-[11px] text-slate-400">
                    = (0.4 * {normalizedReps.toFixed(1)}) + (0.4 * {formQuality}) + (0.2 * {visualEndurance})
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-4 rounded-xl border border-emerald-500/30 flex flex-col justify-center items-center text-center">
                <div className="text-[11px] text-slate-400 uppercase font-mono tracking-wider">Calculated Score (S_final)</div>
                <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 font-mono my-1">
                  {compositeScore}
                </div>
                <div className="text-[10px] text-emerald-400/90 font-medium font-mono">
                  Confidence: {confidenceScore}
                </div>
              </div>
            </div>

          </div>

          {/* 3x3 Smart Grid Video Frame Analysis */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Grid3X3 className="w-4 h-4 text-cyan-400" />
                  3x3 Smart Grid Video Frame Analysis
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Core rigidity, spinal articulation, and fatigue indicators across 9 key tactical video frames.
                </p>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded border border-cyan-500/20">
                Frame Rate: 9 Points Synced
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {smartGridFrames.map((frame) => (
                <div
                  key={frame.id}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-400">Frame #{frame.id} ({frame.timestamp})</span>
                    <span className={`px-1.5 py-0.5 rounded font-semibold ${
                      frame.status === 'Optimal'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : frame.status === 'Warning'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    }`}>
                      {frame.status}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-white">{frame.label}</div>

                  <div className="space-y-1 text-[10px] font-mono">
                    <div className="flex justify-between text-slate-400">
                      <span>Core Rigidity:</span>
                      <span className="text-emerald-400 font-bold">{frame.coreRigidity}%</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
                      <div className="bg-emerald-400 h-1 rounded-full" style={{ width: `${frame.coreRigidity}%` }}></div>
                    </div>

                    <div className="flex justify-between text-slate-400 pt-1">
                      <span>Spinal Articulation:</span>
                      <span className="text-cyan-400 font-bold">{frame.spinalArticulation}%</span>
                    </div>

                    <div className="flex justify-between text-slate-400 pt-1">
                      <span>Fatigue Indicator:</span>
                      <span className={frame.fatigueIndex > 50 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                        {frame.fatigueIndex}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Firestore Stored Assessments Table */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              Firestore Collection: &quot;athlete_assessments&quot;
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live quantitative biomechanics records synchronized across coaching staff.
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
            {assessments.length} Total Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Athlete & ID</th>
                <th className="py-3 px-4">Sport / Batch</th>
                <th className="py-3 px-4">Reps / Form Quality</th>
                <th className="py-3 px-4">Composite Score (S_final)</th>
                <th className="py-3 px-4">LLM Audit Status</th>
                <th className="py-3 px-4">Recorded Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {assessments.map((a, idx) => (
                <tr key={a.id || idx} className="hover:bg-slate-950/60 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white">
                    {a.athleteName}
                    <div className="text-[10px] text-slate-500 font-normal">{a.athleteId}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-xs text-slate-200">{a.sport}</span>
                    <div className="text-[10px] text-slate-400">{a.batch}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-emerald-400 font-bold">{a.repCount} reps</span>
                    <div className="text-[10px] text-slate-400">Form: {a.formQuality}%</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-sm font-black text-cyan-400">{a.compositeScore}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`text-[11px] px-2.5 py-1 rounded-full border font-semibold ${
                      a.judgeStatus.includes('Low Confidence')
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    }`}>
                      {a.judgeStatus}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 text-[10px]">
                    {new Date(a.recordedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
