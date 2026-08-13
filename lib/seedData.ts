import { Assessment, ScheduleSession, CoachMetric, BillingInvoice } from '@/types/academy';

export const INITIAL_ASSESSMENTS: Assessment[] = [
  {
    athleteId: 'ATH-1092',
    athleteName: 'Marcus Vance',
    sport: 'Basketball',
    batch: 'U-16 Select',
    repCount: 18,
    normalizedReps: 90,
    formQuality: 92,
    visualEndurance: 85,
    compositeScore: 89.8, // (0.4*90)+(0.4*92)+(0.2*85) = 36 + 36.8 + 17 = 89.8
    judgeStatus: 'Logical Audit Verified (Confidence > 90%)',
    confidence: '96.4%',
    jointAngles: { elbow: 142, knee: 118, shoulder: 88, hip: 162 },
    qualitativeFeedback: 'Exceptional vertical mechanics with clean wrist snap on jump shots. Mild hip hinge collapse under high fatigue set 4.',
    narrativeLog: 'Marcus exhibits elite explosive jump mechanics and top-tier lateral mobility. However, core stability degrades during late fourth-quarter high-intensity reps leading to slight lumbar flexion. High endurance overall with superior acceleration.',
    recordedAt: '2026-08-10T14:30:00Z',
    coachId: 'COACH-01',
    coachName: 'Coach Marcus Vance Sr.'
  },
  {
    athleteId: 'ATH-2041',
    athleteName: 'Sophia Reyes',
    sport: 'Soccer',
    batch: 'U-14 Elite',
    repCount: 15,
    normalizedReps: 75,
    formQuality: 88,
    visualEndurance: 95,
    compositeScore: 84.2, // (0.4*75)+(0.4*88)+(0.2*95) = 30 + 35.2 + 19 = 84.2
    judgeStatus: 'Logical Audit Verified (Confidence > 90%)',
    confidence: '94.1%',
    jointAngles: { elbow: 130, knee: 125, shoulder: 75, hip: 150 },
    qualitativeFeedback: 'Fluid change of direction and excellent spinal alignment on decelerations. Slight valgus collapse in right knee during high-speed cutting.',
    narrativeLog: 'Sophia possesses remarkable visual endurance and high cardiovascular recovery rates. Cutting kinematics show high agility, but knee tracking reveals slight inward valgus alignment during emergency stops. Needs hamstring strengthening and core stability drills.',
    recordedAt: '2026-08-11T10:15:00Z',
    coachId: 'COACH-02',
    coachName: 'Coach Elena Rostova'
  },
  {
    athleteId: 'ATH-3105',
    athleteName: 'Liam Chen',
    sport: 'Tennis',
    batch: 'Varsity',
    repCount: 0,
    normalizedReps: 0,
    formQuality: 82,
    visualEndurance: 78,
    compositeScore: 48.4, // (0.4*0)+(0.4*82)+(0.2*78) = 0 + 32.8 + 15.6 = 48.4
    judgeStatus: 'Low Confidence - Retrying Analysis',
    confidence: '62.0%',
    jointAngles: { elbow: 155, knee: 110, shoulder: 105, hip: 145 },
    qualitativeFeedback: 'Kinematics captured racquet extension with supreme shoulder internal rotation, but occlusion caused rep counting anomaly.',
    narrativeLog: 'Liam exhibits magnificent baseline forehand swing velocity with excellent kinetic chain transfer from hip to shoulder. Visual camera angle suffered partial occlusion during serve toss resulting in zero recorded repetitions despite top form quality.',
    recordedAt: '2026-08-12T09:00:00Z',
    coachId: 'COACH-03',
    coachName: 'Coach David Miller'
  },
  {
    athleteId: 'ATH-4112',
    athleteName: 'Maya Lin',
    sport: 'Swimming',
    batch: 'Youth Academy',
    repCount: 20,
    normalizedReps: 100,
    formQuality: 96,
    visualEndurance: 92,
    compositeScore: 96.8, // (0.4*100)+(0.4*96)+(0.2*92) = 40 + 38.4 + 18.4 = 96.8
    judgeStatus: 'Logical Audit Verified (Confidence > 90%)',
    confidence: '98.8%',
    jointAngles: { elbow: 165, knee: 170, shoulder: 140, hip: 175 },
    qualitativeFeedback: 'Perfect streamlined body position and thoracic spine mobility during catch phase. Zero drag footprint.',
    narrativeLog: 'Maya maintains flawless core rigidity and spinal articulation across all 20 lap turns. Outstanding visual endurance with no fatigue decay observed in body horizontal alignment.',
    recordedAt: '2026-08-12T11:45:00Z',
    coachId: 'COACH-02',
    coachName: 'Coach Elena Rostova'
  }
];

export const INITIAL_SCHEDULES: ScheduleSession[] = [
  {
    title: 'Elite Basketball Shooting Clinic',
    sport: 'Basketball',
    facility: 'Court 1 - Main Gymnasium',
    coachId: 'COACH-01',
    coachName: 'Coach Marcus Vance Sr.',
    date: '2026-08-14',
    startTime: '09:00',
    endTime: '11:00',
    capacity: 16,
    enrolled: 14,
    status: 'Scheduled',
    notes: 'Focus on high-velocity catch and shoot footwork.'
  },
  {
    title: 'U-14 Soccer Tactical Drills & Cutting',
    sport: 'Soccer',
    facility: 'Turf Field A',
    coachId: 'COACH-02',
    coachName: 'Coach Elena Rostova',
    date: '2026-08-14',
    startTime: '10:00',
    endTime: '12:00',
    capacity: 20,
    enrolled: 18,
    status: 'Scheduled',
    notes: 'Biomechanics camera tracking setup on sideline.'
  },
  {
    title: 'Varsity Tennis Serve Biomechanics',
    sport: 'Tennis',
    facility: 'Court 2 - Outdoor Hardcourt',
    coachId: 'COACH-03',
    coachName: 'Coach David Miller',
    date: '2026-08-14',
    startTime: '14:00',
    endTime: '16:00',
    capacity: 8,
    enrolled: 8,
    status: 'Scheduled',
    notes: 'Full capacity class. High precision shoulder monitoring.'
  },
  {
    title: 'Youth Swim Freestyle Streamline Lab',
    sport: 'Swimming',
    facility: 'Aquatic Center Pool Lanes 1-4',
    coachId: 'COACH-02',
    coachName: 'Coach Elena Rostova',
    date: '2026-08-15',
    startTime: '08:00',
    endTime: '10:00',
    capacity: 12,
    enrolled: 10,
    status: 'Scheduled',
    notes: 'Under-water camera angle calibration.'
  }
];

export const INITIAL_COACHES: CoachMetric[] = [
  {
    coachId: 'COACH-01',
    coachName: 'Coach Marcus Vance Sr.',
    email: 'm.vance@academyhub.com',
    sportSpecialties: ['Basketball', 'Track & Field'],
    fillRate: 92,
    attendanceRate: 96,
    churnRisk: 'Low',
    activeAthletes: 42,
    notes: 'Top performing coach with strong parent engagement scores.'
  },
  {
    coachId: 'COACH-02',
    coachName: 'Coach Elena Rostova',
    email: 'e.rostova@academyhub.com',
    sportSpecialties: ['Soccer', 'Swimming'],
    fillRate: 88,
    attendanceRate: 94,
    churnRisk: 'Low',
    activeAthletes: 38,
    notes: 'Specializes in youth injury prevention and biomechanical correction.'
  },
  {
    coachId: 'COACH-03',
    coachName: 'Coach David Miller',
    email: 'd.miller@academyhub.com',
    sportSpecialties: ['Tennis', 'Volleyball'],
    fillRate: 74,
    attendanceRate: 82,
    churnRisk: 'Medium',
    activeAthletes: 22,
    notes: 'Slight dip in weekday afternoon session attendance; recommended time adjust.'
  }
];

export const INITIAL_BILLING: BillingInvoice[] = [
  {
    invoiceNumber: 'INV-2026-0891',
    parentName: 'Sarah & Thomas Vance',
    parentEmail: 'vance.family@example.com',
    parentPhone: '(555) 234-5678',
    children: [
      { id: 'C1', name: 'Marcus Vance', age: 15, sport: 'Basketball', baseFee: 350, discountedFee: 350 },
      { id: 'C2', name: 'Leo Vance', age: 12, sport: 'Soccer', baseFee: 300, discountedFee: 270 } // 10% Sibling discount applied to $300 -> $270
    ],
    rawTotal: 650,
    siblingDiscount: 30, // 10% off lower priced $300 soccer
    finalTotal: 620,
    paymentSchedule: 'installment',
    status: 'Paid',
    createdAt: '2026-08-01',
    dueDate: '2026-08-15'
  },
  {
    invoiceNumber: 'INV-2026-0902',
    parentName: 'Jennifer & Robert Reyes',
    parentEmail: 'reyes.home@example.com',
    parentPhone: '(555) 876-5432',
    children: [
      { id: 'C3', name: 'Sophia Reyes', age: 14, sport: 'Soccer', baseFee: 300, discountedFee: 300 },
      { id: 'C4', name: 'Gabriel Reyes', age: 11, sport: 'Swimming', baseFee: 280, discountedFee: 252 } // 10% Sibling discount applied to $280 -> $252
    ],
    rawTotal: 580,
    siblingDiscount: 28,
    finalTotal: 552,
    paymentSchedule: 'monthly',
    status: 'Pending',
    createdAt: '2026-08-05',
    dueDate: '2026-08-20'
  },
  {
    invoiceNumber: 'INV-2026-0914',
    parentName: 'David & Helen Chen',
    parentEmail: 'chen.family@example.com',
    parentPhone: '(555) 345-6789',
    children: [
      { id: 'C5', name: 'Liam Chen', age: 16, sport: 'Tennis', baseFee: 400, discountedFee: 400 }
    ],
    rawTotal: 400,
    siblingDiscount: 0,
    finalTotal: 400,
    paymentSchedule: 'upfront',
    status: 'Paid',
    createdAt: '2026-08-08',
    dueDate: '2026-08-22'
  }
];
