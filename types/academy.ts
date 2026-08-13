export type UserRole = 'admin' | 'coach' | 'parent';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
  sportSpecialties?: string[];
  createdAt?: string;
}

export interface JointAngles {
  elbow: number;    // Elbow extension angle in degrees
  knee: number;     // Knee flexion angle in degrees
  shoulder: number; // Shoulder rotation angle in degrees
  hip: number;      // Hip hinge flex angle in degrees
}

export interface SmartGridFrame {
  id: number;
  timestamp: string;
  label: string;
  coreRigidity: number;        // 0 - 100
  spinalArticulation: number;  // 0 - 100
  fatigueIndex: number;        // 0 - 100
  status: 'Optimal' | 'Warning' | 'Fatigue Detected';
}

export interface Assessment {
  id?: string;
  athleteId: string;
  athleteName: string;
  sport: string;
  batch: string;
  repCount: number;
  normalizedReps: number;
  formQuality: number;        // 0 - 100
  visualEndurance: number;    // 0 - 100
  compositeScore: number;     // S_final calculated
  judgeStatus: string;        // "Low Confidence - Retrying Analysis" | "Logical Audit Verified (Confidence > 90%)"
  confidence: string;
  jointAngles: JointAngles;
  qualitativeFeedback: string;
  narrativeLog: string;       // Rich narrative used for RAG searching
  videoUrl?: string;
  recordedAt: string;
  coachId: string;
  coachName: string;
}

export interface ScheduleSession {
  id?: string;
  title: string;
  sport: string;
  facility: string; // Court 1, Court 2, Turf Field, Pool, Gym
  coachId: string;
  coachName: string;
  date: string;     // YYYY-MM-DD
  startTime: string;// HH:MM
  endTime: string;  // HH:MM
  capacity: number;
  enrolled: number;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  notes?: string;
}

export interface CoachMetric {
  id?: string;
  coachId: string;
  coachName: string;
  email: string;
  sportSpecialties: string[];
  fillRate: number;        // Percentage 0 - 100
  attendanceRate: number;  // Percentage 0 - 100
  churnRisk: 'Low' | 'Medium' | 'High';
  activeAthletes: number;
  notes: string;
}

export interface RegisteredChild {
  id: string;
  name: string;
  age: number;
  sport: string;
  baseFee: number;
  discountedFee: number;
}

export interface BillingInvoice {
  id?: string;
  invoiceNumber: string;
  parentName: string;
  parentEmail: string;
  parentPhone?: string;
  children: RegisteredChild[];
  rawTotal: number;
  siblingDiscount: number;
  finalTotal: number;
  paymentSchedule: 'upfront' | 'installment' | 'monthly';
  status: 'Paid' | 'Pending' | 'Overdue';
  createdAt: string;
  dueDate: string;
}
