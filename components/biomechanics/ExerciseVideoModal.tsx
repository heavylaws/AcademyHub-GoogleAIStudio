'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  VolumeX,
  Eye,
  Sliders,
  ShieldAlert,
  Info,
  X,
  Maximize2,
  Activity,
  Zap,
  BookOpen
} from 'lucide-react';

export interface ExerciseGuide {
  id: string;
  title: string;
  sport: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Elite';
  duration: string;
  videoUrl?: string;
  posterUrl?: string;
  description: string;
  idealJointAngles: {
    knee: string;
    hip: string;
    ankle?: string;
    shoulder?: string;
  };
  executionSteps: {
    phase: string;
    cue: string;
    timing: string;
  }[];
  commonMistakes: {
    fault: string;
    fix: string;
    risk: string;
  }[];
  coachingTips: string[];
}

export const EXERCISE_GUIDES: Record<string, ExerciseGuide> = {
  'sprint_accel': {
    id: 'sprint_accel',
    title: 'Sprint Acceleration & Drive Phase Start',
    sport: 'Football (Soccer) / Athletics',
    category: 'Kinematic Speed & Velocity',
    difficulty: 'Elite',
    duration: '1:45',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    description: 'Master the 45° forward drive angle, piston leg movement, and explosive ground reaction force during the first 10 meters of acceleration.',
    idealJointAngles: {
      knee: '90° Drive Knee Flexion',
      hip: '165° Full Extension On Rear Push',
      ankle: '45° Shin Angle Ground Attack',
    },
    executionSteps: [
      { phase: 'Phase 1: Set Position', cue: 'Hips high, shoulders over front line, 45° forward torso tilt', timing: '0.0s - 0.5s' },
      { phase: 'Phase 2: First Piston Drive', cue: 'Push hard off front foot, drive rear knee forcefully forward & high', timing: '0.5s - 1.0s' },
      { phase: 'Phase 3: Ground Impact', cue: 'Strike ground aggressively beneath center of mass with low heel recovery', timing: '1.0s - 1.5s' },
    ],
    commonMistakes: [
      { fault: 'Early Upright Standing', fix: 'Maintain 45° lean for first 6-8 strides', risk: 'Loss of horizontal force production' },
      { fault: 'High Heel Cast Backwards', fix: 'Drive knee straight through low to the ground', risk: 'Wasted cycle time & hamstring strain' },
    ],
    coachingTips: [
      'Imagine pushing the ground back like a sled.',
      'Keep eyes focused 2 meters in front of feet during drive phase.',
      'Ensure arms strike violently from hip to cheek.'
    ]
  },
  'vertical_jump': {
    id: 'vertical_jump',
    title: 'Plyometric Vertical Jump & Landing Mechanics',
    sport: 'Basketball / Volleyball',
    category: 'Explosive Power & Injury Prevention',
    difficulty: 'Intermediate',
    duration: '2:10',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    description: 'Learn triple extension (ankle-knee-hip) during takeoff and safe eccentric deceleration to prevent knee valgus collapse upon landing.',
    idealJointAngles: {
      knee: '90°-105° Flexion on Landing Dip',
      hip: '110° Countermovement Hinge',
      shoulder: '170° Overhead Extension',
    },
    executionSteps: [
      { phase: 'Phase 1: Rapid Countermovement', cue: 'Hinge hips back rapidly, sweep arms behind torso', timing: '0.0s - 0.6s' },
      { phase: 'Phase 2: Triple Extension', cue: 'Explode up extending ankle, knee, and hip in unison', timing: '0.6s - 1.0s' },
      { phase: 'Phase 3: Controlled Deceleration', cue: 'Land softly toe-to-heel, knees aligned over toes', timing: '1.0s - 1.8s' },
    ],
    commonMistakes: [
      { fault: 'Knee Valgus (Inward Buckle)', fix: 'Engage glutes and push knees outwards over 2nd toes', risk: 'High ACL Injury Risk' },
      { fault: 'Stiff Stiff-Legged Landing', fix: 'Absorb force through deep knee/hip flexion (90°+)', risk: 'Patellar tendonitis & spinal compression' },
    ],
    coachingTips: [
      'Land as quietly as possible like a cat landing on carpet.',
      'Distribute ground reaction force across ankles, knees, and hips equally.',
    ]
  },
  'overhead_smash': {
    id: 'overhead_smash',
    title: 'Badminton Overhead Smash & Kinetic Chain',
    sport: 'Badminton / Tennis',
    category: 'Rotational Power & Speed',
    difficulty: 'Elite',
    duration: '1:30',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    description: 'Sequence leg push, thoracic rotation, shoulder elevation, and forearm pronation for maximal shuttlecock contact velocity.',
    idealJointAngles: {
      knee: '120° Lead Leg Brace',
      shoulder: '115° Elevation Angle',
      hip: '150° Hyperextension Unwind',
    },
    executionSteps: [
      { phase: 'Phase 1: Preparation & Rear Weight Shift', cue: 'Turn side-on, load weight onto rear non-racket leg', timing: '0.0s - 0.4s' },
      { phase: 'Phase 2: Kinetic Chain Unwind', cue: 'Push off rear leg, rotate hips forward first, then chest', timing: '0.4s - 0.9s' },
      { phase: 'Phase 3: High Contact Pronation', cue: 'Contact shuttle at full arm reach, snap wrist & forearm', timing: '0.9s - 1.3s' },
    ],
    commonMistakes: [
      { fault: 'Arm-Only Swinging', fix: 'Initiate stroke from hip rotation and core transfer', risk: 'Rotator cuff impingement & lower power' },
      { fault: 'Late Contact Point', fix: 'Position feet behind shuttle to hit out in front', risk: 'Net error & shoulder strain' },
    ],
    coachingTips: [
      'Think of throwing a whip — power builds from feet to racket tip.',
      'Recover immediately into split-step after follow-through.'
    ]
  },
  'barbell_squat': {
    id: 'barbell_squat',
    title: 'Deep Squat Kinematics & Kinetic Alignment',
    sport: 'Multi-Sport Strength & Conditioning',
    category: 'Foundation Power',
    difficulty: 'Beginner',
    duration: '2:30',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    description: 'Master full-depth squats with neutral spine integrity, optimal knee-over-toe alignment, and bilateral weight symmetry.',
    idealJointAngles: {
      knee: '90°-100° Deep Parallel Flexion',
      hip: '80°-90° Hip Flexion',
      ankle: '35° Dorsiflexion Range',
    },
    executionSteps: [
      { phase: 'Phase 1: Setup & Brace', cue: 'Feet shoulder-width, toes 15° out, brace core tight', timing: '0.0s - 0.5s' },
      { phase: 'Phase 2: Controlled Descent', cue: 'Break at hips and knees simultaneously, descend to parallel', timing: '0.5s - 1.5s' },
      { phase: 'Phase 3: Drive Upwards', cue: 'Push through mid-foot, drive chest up maintaining neutral spine', timing: '1.5s - 2.2s' },
    ],
    commonMistakes: [
      { fault: 'Butt Wink (Lumbar Flexion)', fix: 'Stop at depth before pelvis tucks, improve ankle mobility', risk: 'L4/L5 disc herniation' },
      { fault: 'Heel Elevation', fix: 'Keep feet flat, drive weight through midfoot/heel', risk: 'Excessive shear force on patellar tendon' },
    ],
    coachingTips: [
      'Screw your feet into the floor to activate hip abductors.',
      'Inhale deep into diaphragm before descending.'
    ]
  }
};

interface ExerciseVideoModalProps {
  exerciseId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ExerciseVideoModal({
  exerciseId = 'sprint_accel',
  isOpen,
  onClose
}: ExerciseVideoModalProps) {
  const [selectedId, setSelectedId] = useState<string>(exerciseId);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [showSkeleton, setShowSkeleton] = useState<boolean>(true);
  const [showHUD, setShowHUD] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentGuide = EXERCISE_GUIDES[selectedId] || EXERCISE_GUIDES['sprint_accel'];

  useEffect(() => {
    if (exerciseId && EXERCISE_GUIDES[exerciseId]) {
      setSelectedId(exerciseId);
    }
  }, [exerciseId]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  if (!isOpen) return null;

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSpeakCues = () => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in this browser.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const textToSpeak = `
      Exercise Guide for ${currentGuide.title}.
      Key Biomechanical Focus: ${currentGuide.description}
      Phase 1: ${currentGuide.executionSteps[0]?.cue}.
      Phase 2: ${currentGuide.executionSteps[1]?.cue}.
      Phase 3: ${currentGuide.executionSteps[2]?.cue}.
      Key warning: ${currentGuide.commonMistakes[0]?.fault}. Solution: ${currentGuide.commonMistakes[0]?.fix}.
    `;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  Instructional Video & Biomechanical Guide
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  {currentGuide.difficulty}
                </span>
              </div>
              <h2 className="text-lg font-black text-white mt-0.5">
                {currentGuide.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSpeakCues}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
                isSpeaking
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <Volume2 className="w-4 h-4 text-cyan-400" />
              {isSpeaking ? 'Stop Voice Cues' : 'Play Voice Cues'}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Exercise Selector Tabs */}
        <div className="px-6 py-2 bg-slate-950 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-slate-500 font-bold uppercase font-mono text-[10px] mr-2">Select Exercise:</span>
          {Object.values(EXERCISE_GUIDES).map((ex) => (
            <button
              key={ex.id}
              onClick={() => {
                setSelectedId(ex.id);
                setIsPlaying(true);
              }}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                selectedId === ex.id
                  ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold shadow'
                  : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-slate-700/50'
              }`}
            >
              <Play className="w-3 h-3 fill-current" />
              {ex.title}
            </button>
          ))}
        </div>

        {/* Modal Body Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-0">
          {/* Left Column: Video Player & Control HUD */}
          <div className="lg:col-span-7 p-6 bg-slate-950/40 space-y-4 border-r border-slate-800/60">
            {/* Video Container */}
            <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-2xl aspect-video group">
              <video
                ref={videoRef}
                src={currentGuide.videoUrl}
                autoPlay
                loop
                muted={isMuted}
                playsInline
                className="w-full h-full object-cover"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />

              {/* Skeleton Overlay Graphic (Simulated pose tracking visualization) */}
              {showSkeleton && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <svg className="w-full h-full opacity-60 text-cyan-400" viewBox="0 0 400 225">
                    {/* Simulated joint nodes & kinematic bone lines */}
                    <circle cx="200" cy="50" r="10" fill="currentColor" opacity="0.8" />
                    <line x1="200" y1="60" x2="200" y2="120" stroke="currentColor" strokeWidth="4" />
                    {/* Left Leg */}
                    <line x1="200" y1="120" x2="170" y2="170" stroke="#10b981" strokeWidth="4" />
                    <line x1="170" y1="170" x2="155" y2="210" stroke="#10b981" strokeWidth="4" />
                    <circle cx="170" cy="170" r="6" fill="#10b981" />
                    {/* Right Leg */}
                    <line x1="200" y1="120" x2="235" y2="165" stroke="#06b6d4" strokeWidth="4" />
                    <line x1="235" y1="165" x2="250" y2="205" stroke="#06b6d4" strokeWidth="4" />
                    <circle cx="235" cy="165" r="6" fill="#06b6d4" />
                    {/* Arms */}
                    <line x1="200" y1="75" x2="160" y2="110" stroke="#3b82f6" strokeWidth="3" />
                    <line x1="200" y1="75" x2="245" y2="105" stroke="#3b82f6" strokeWidth="3" />
                    {/* Joint Flexion HUD HUD text */}
                    {showHUD && (
                      <>
                        <rect x="110" y="155" width="55" height="18" rx="4" fill="#090d16" opacity="0.85" />
                        <text x="114" y="168" fill="#10b981" fontSize="10" fontFamily="monospace" fontWeight="bold">
                          90° FLEX
                        </text>
                        <rect x="245" y="150" width="60" height="18" rx="4" fill="#090d16" opacity="0.85" />
                        <text x="249" y="163" fill="#06b6d4" fontSize="10" fontFamily="monospace" fontWeight="bold">
                          165° DRIVE
                        </text>
                      </>
                    )}
                  </svg>
                </div>
              )}

              {/* Watermark / HUD Badge */}
              <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-lg border border-slate-800 text-[10px] font-mono text-cyan-400 flex items-center gap-1.5 font-bold">
                <Activity className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                ACADEMYHUB KINEMATIC HUD
              </div>

              {/* Video Overlay Control Bar */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent p-4 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={togglePlay}
                    className="p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all shadow-lg"
                  >
                    {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                  </button>
                  <button
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.currentTime = 0;
                        videoRef.current.play();
                        setIsPlaying(true);
                      }
                    }}
                    className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {/* Speed Controls */}
                  <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px] font-mono">
                    {[0.5, 1.0, 1.5].map((spd) => (
                      <button
                        key={spd}
                        onClick={() => setPlaybackRate(spd)}
                        className={`px-2 py-0.5 rounded font-bold transition-all ${
                          playbackRate === spd
                            ? 'bg-cyan-500 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>

                  {/* Toggle Skeleton Button */}
                  <button
                    onClick={() => setShowSkeleton(!showSkeleton)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 border transition-all ${
                      showSkeleton
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Pose Overlay
                  </button>
                </div>
              </div>
            </div>

            {/* Target Joint Angles Card */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                <Sliders className="w-4 h-4 text-cyan-400" />
                Target Kinematic Joint Angles
              </h4>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-500 font-mono uppercase">Knee Angle</div>
                  <div className="font-bold font-mono text-cyan-400 mt-0.5">{currentGuide.idealJointAngles.knee}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-500 font-mono uppercase">Hip Extension</div>
                  <div className="font-bold font-mono text-emerald-400 mt-0.5">{currentGuide.idealJointAngles.hip}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-500 font-mono uppercase">Ankle / Shoulder</div>
                  <div className="font-bold font-mono text-purple-400 mt-0.5">
                    {currentGuide.idealJointAngles.ankle || currentGuide.idealJointAngles.shoulder || 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Coaching Tips */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
              <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                Coach Verbal Cues (What to Say to Athletes)
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {currentGuide.coachingTips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-cyan-400 font-bold font-mono">#{idx + 1}</span>
                    <span>"{tip}"</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Column: Execution Steps & Common Faults */}
          <div className="lg:col-span-5 p-6 space-y-6 bg-slate-900/20">
            {/* Overview Description */}
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                Exercise Biomechanics Breakdown
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {currentGuide.description}
              </p>
            </div>

            {/* Step-by-step Movement Phases */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Phase-by-Phase Technical Execution
              </h3>
              <div className="space-y-2.5">
                {currentGuide.executionSteps.map((step, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-cyan-400 font-mono">{step.phase}</span>
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {step.timing}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 font-medium">
                      {step.cue}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Common Errors & Injury Prevention Warnings */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-red-400 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                Common Faults & ACL Injury Prevention
              </h3>
              <div className="space-y-2.5">
                {currentGuide.commonMistakes.map((mistake, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-red-950/20 border border-red-500/20 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-red-300">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                      Fault: {mistake.fault}
                    </div>
                    <div className="text-xs text-slate-300">
                      <strong className="text-emerald-400 font-semibold">Correction Fix: </strong>
                      {mistake.fix}
                    </div>
                    <div className="text-[11px] text-red-400/80 font-mono">
                      ⚠️ Risk Factor: {mistake.risk}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Integrated with Gemini Biomechanical Advisor</span>
          </div>
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
