import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import {
  calculateComputedScore,
  deriveRubricGrade,
  CreateAssessmentInput,
} from '@/types/assessment';
import { AuthError } from '@/lib/auth/types';

// Mock auth middleware
const mockVerifyRequestAuth = vi.fn();
const mockRequireRole = vi.fn();

vi.mock('@/lib/auth/verifyRequestAuth', () => ({
  verifyRequestAuth: (req: any) => mockVerifyRequestAuth(req),
}));

vi.mock('@/lib/auth/requireRole', () => ({
  requireRole: (user: any, allowedRoles: any) => mockRequireRole(user, allowedRoles),
}));

// Mock @google/genai with a class constructor
const mockGenerateContent = vi.fn();

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class {
      models = {
        generateContent: mockGenerateContent,
      };
    },
    Type: {
      OBJECT: 'OBJECT',
      NUMBER: 'NUMBER',
      STRING: 'STRING',
      ARRAY: 'ARRAY',
    },
  };
});

describe('POST /api/biomechanics/evaluate', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    // Default mock setup: authenticated as coach
    mockVerifyRequestAuth.mockResolvedValue({ uid: 'coach_001', role: 'coach' });
    mockRequireRole.mockReturnValue(undefined);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const samplePayload: CreateAssessmentInput & { id: string } = {
    id: 'asm_test_001',
    athlete_id: 'ath_8042',
    athlete_name: 'Marcus Vance',
    parent_email: 'robert.vance@gmail.com',
    sport: 'Football (Soccer)',
    exercise_type: 'Squats & Lower Kinetic Chain',
    grading_rubric_sop: 'Squat Depth & Valgus SOP',
    coach_id: 'coach_001',
    coach_name: 'Coach Marcus',
    quantitative_metrics: {
      valid_reps: 15,
      duration_seconds: 45,
      target_reps: 15,
      avg_depth_angle: 90,
    },
    qualitative_observations: {
      form_quality_score: 95,
      endurance_score: 90,
      fault_tags: ['knee_valgus'],
      coach_notes: 'Consistent rep tempo and depth.',
    },
  };

  // Test (a): Deterministic fallback path when GEMINI_API_KEY is unset
  describe('a. Deterministic Fallback Path', () => {
    it('returns deterministic_fallback, data_source manual, and omits agent_insights when GEMINI_API_KEY is unset', async () => {
      delete process.env.GEMINI_API_KEY;

      const req = new NextRequest('http://localhost:3000/api/biomechanics/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(samplePayload),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.assessment).toBeDefined();
      expect(json.assessment.id).toBe('asm_test_001');
      expect(json.assessment.data_source).toBe('manual');
      expect(json.assessment.pipeline_status).toBe('deterministic_fallback');
      expect(json.assessment.agent_insights).toBeUndefined();

      expect(json.assessment.computed_score).toBe(91);
      expect(json.assessment.rubric_grade).toBe('A');
    });
  });

  // Test (b): Scoring formula integrity
  describe('b. Scoring Formula Integrity', () => {
    it('verifies calculateComputedScore matches deterministic weighted formula for known inputs', () => {
      const score1 = calculateComputedScore(
        { valid_reps: 15, duration_seconds: 45, target_reps: 15 },
        { form_quality_score: 100, endurance_score: 100, fault_tags: [], coach_notes: '' }
      );
      expect(score1).toBe(100);
      expect(deriveRubricGrade(score1)).toBe('A');

      const score2 = calculateComputedScore(
        { valid_reps: 12, duration_seconds: 30, target_reps: 15 },
        { form_quality_score: 80, endurance_score: 75, fault_tags: ['trunk_lean', 'heel_lift'], coach_notes: '' }
      );
      expect(score2).toBe(72);
      expect(deriveRubricGrade(score2)).toBe('C');

      const score3 = calculateComputedScore(
        { valid_reps: 14, duration_seconds: 45, target_reps: 15 },
        { form_quality_score: 85, endurance_score: 80, fault_tags: [], coach_notes: '' }
      );
      expect(score3).toBe(84.7);
      expect(deriveRubricGrade(score3)).toBe('B');
    });
  });

  // Test (c): AI Error Resilience & Success handling
  describe('c. AI Error Resilience', () => {
    it('returns pipeline_status: ai_error with fallback scoring on API rejection without throwing unhandled exceptions', async () => {
      process.env.GEMINI_API_KEY = 'test-key-mock';
      mockGenerateContent.mockRejectedValueOnce(new Error('Gemini Quota Exceeded (ResourceExhausted)'));

      const req = new NextRequest('http://localhost:3000/api/biomechanics/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(samplePayload),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.assessment).toBeDefined();
      expect(json.assessment.pipeline_status).toBe('ai_error');
      expect(json.assessment.data_source).toBe('manual');
      expect(json.assessment.error_detail).toContain('Gemini Quota Exceeded');
      expect(json.assessment.computed_score).toBe(91);
      expect(json.assessment.rubric_grade).toBe('A');
    });

    it('returns pipeline_status: ai_error with fallback scoring on malformed JSON response', async () => {
      process.env.GEMINI_API_KEY = 'test-key-mock';
      mockGenerateContent.mockResolvedValueOnce({
        text: 'This is not valid JSON { broken ...',
      });

      const req = new NextRequest('http://localhost:3000/api/biomechanics/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(samplePayload),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.assessment).toBeDefined();
      expect(json.assessment.pipeline_status).toBe('ai_error');
      expect(json.assessment.data_source).toBe('manual');
      expect(json.assessment.computed_score).toBe(91);
    });

    it('returns pipeline_status: ai_evaluated and agent_insights on valid Gemini AI response', async () => {
      process.env.GEMINI_API_KEY = 'test-key-mock';
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          computed_score: 93.5,
          rubric_grade: 'A',
          enhanced_coach_notes: 'Exceptional biomechanical symmetry and depth control.',
          kinematicAnalysis: 'Valgus deflection measured below 2.1 degrees.',
          fatigueAnalysis: 'Rep cadence remained within +/- 4% variance throughout.',
          faultDiagnostics: ['minor_lumbar_shear'],
          prescriptiveDrills: ['Banded glute bridge isometric hold 3x45s'],
          confidenceScore: 0.98,
        }),
      });

      const req = new NextRequest('http://localhost:3000/api/biomechanics/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(samplePayload),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.assessment).toBeDefined();
      expect(json.assessment.pipeline_status).toBe('ai_evaluated');
      expect(json.assessment.data_source).toBe('ai_agentic');
      expect(json.assessment.computed_score).toBe(93.5);
      expect(json.assessment.rubric_grade).toBe('A');
      expect(json.assessment.agent_insights).toBeDefined();
      expect(json.assessment.agent_insights.kinematicAnalysis).toContain('Valgus deflection');
      expect(json.assessment.agent_insights.confidenceScore).toBe(0.98);
    });
  });

  // Test (d): Authentication & Role Enforcement
  describe('d. Authentication & Role Enforcement', () => {
    it('rejects unauthenticated requests with status 401', async () => {
      mockVerifyRequestAuth.mockRejectedValueOnce(new AuthError('Missing authentication session', 401));

      const req = new NextRequest('http://localhost:3000/api/biomechanics/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(samplePayload),
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('Missing authentication session');
    });

    it('rejects parent role requests with status 403', async () => {
      mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'parent_user_1', role: 'parent' });
      mockRequireRole.mockImplementationOnce(() => {
        throw new AuthError('Forbidden: Insufficient role permissions', 403);
      });

      const req = new NextRequest('http://localhost:3000/api/biomechanics/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(samplePayload),
      });

      const res = await POST(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe('Forbidden: Insufficient role permissions');
    });
  });
});
