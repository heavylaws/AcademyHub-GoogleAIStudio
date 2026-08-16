import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import {
  calculateComputedScore,
  deriveRubricGrade,
  CreateAssessmentInput,
} from '@/types/assessment';

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

      // Expected deterministic score with target_reps: 15:
      // Form Quality: 95 * 0.4 = 38
      // Endurance: 90 * 0.4 = 36
      // Reps Execution: (15 / 15 * 100) * 0.2 = 20
      // Fault penalty (1 fault * 3): -3
      // Total = 38 + 36 + 20 - 3 = 91.0
      expect(json.assessment.computed_score).toBe(91);
      expect(json.assessment.rubric_grade).toBe('A');
    });
  });

  // Test (b): Scoring formula integrity
  describe('b. Scoring Formula Integrity', () => {
    it('verifies calculateComputedScore matches deterministic weighted formula for known inputs', () => {
      // Set 1: Perfect reps with target_reps, high scores, no faults
      const score1 = calculateComputedScore(
        { valid_reps: 15, duration_seconds: 45, target_reps: 15 },
        { form_quality_score: 100, endurance_score: 100, fault_tags: [], coach_notes: '' }
      );
      // (100 * 0.4) + (100 * 0.4) + (100 * 0.2) = 100
      expect(score1).toBe(100);
      expect(deriveRubricGrade(score1)).toBe('A');

      // Set 2: Moderate scores with 2 fault penalties
      const score2 = calculateComputedScore(
        { valid_reps: 12, duration_seconds: 30, target_reps: 15 },
        { form_quality_score: 80, endurance_score: 75, fault_tags: ['trunk_lean', 'heel_lift'], coach_notes: '' }
      );
      // Form: 80 * 0.4 = 32
      // Endurance: 75 * 0.4 = 30
      // Reps: (12 / 15 * 100) * 0.2 = 80 * 0.2 = 16
      // Faults: 2 * 3 = -6
      // Subtotal = 32 + 30 + 16 - 6 = 72
      expect(score2).toBe(72);
      expect(deriveRubricGrade(score2)).toBe('C');

      // Set 3: Grade B boundary test (75 - 87)
      const score3 = calculateComputedScore(
        { valid_reps: 14, duration_seconds: 45, target_reps: 15 },
        { form_quality_score: 85, endurance_score: 80, fault_tags: [], coach_notes: '' }
      );
      // Form: 85 * 0.4 = 34
      // Endurance: 80 * 0.4 = 32
      // Reps: (14 / 15 * 100) * 0.2 = 93.33 * 0.2 = 18.67
      // Total = 34 + 32 + 18.67 = 84.7
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
});
