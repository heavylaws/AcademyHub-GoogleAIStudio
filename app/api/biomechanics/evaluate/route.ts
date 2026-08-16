import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import {
  calculateComputedScore,
  deriveRubricGrade,
  CreateAssessmentInput,
} from '@/types/assessment';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const input: CreateAssessmentInput & { id?: string } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;

    // 1. Prepare deterministic baseline metrics as ground truth
    const quantitative = {
      valid_reps: Number(input.quantitative_metrics?.valid_reps || 0),
      avg_depth_angle: input.quantitative_metrics?.avg_depth_angle !== undefined
        ? Number(input.quantitative_metrics.avg_depth_angle)
        : undefined,
      duration_seconds: Number(input.quantitative_metrics?.duration_seconds || 0),
      target_reps: input.quantitative_metrics?.target_reps,
      cadence_reps_per_minute:
        (input.quantitative_metrics?.duration_seconds || 0) > 0
          ? Math.round(
              ((input.quantitative_metrics?.valid_reps || 0) /
                ((input.quantitative_metrics?.duration_seconds || 30) / 60)) *
                10
            ) / 10
          : undefined,
    };

    const qualitative = {
      form_quality_score: Number(input.qualitative_observations?.form_quality_score || 85),
      endurance_score: Number(input.qualitative_observations?.endurance_score || 80),
      fault_tags: input.qualitative_observations?.fault_tags || [],
      coach_notes: input.qualitative_observations?.coach_notes || '',
    };

    const baseComputedScore = calculateComputedScore(
      quantitative,
      qualitative,
      input.custom_weights
    );
    const baseRubricGrade = deriveRubricGrade(baseComputedScore);

    // If no Gemini API key configured, return deterministic score only — no fake AI insights
    if (!apiKey) {
      return NextResponse.json({
        assessment: {
          id: input.id || `asm_det_${Date.now()}`,
          athlete_id: input.athlete_id,
          athlete_name: input.athlete_name,
          parent_email: input.parent_email,
          sport: input.sport,
          exercise_type: input.exercise_type,
          grading_rubric_sop: input.grading_rubric_sop || `${input.sport} - ${input.exercise_type} SOP`,
          coach_id: input.coach_id || 'coach_manual_entry',
          coach_name: input.coach_name || 'Coach',
          data_source: 'manual',
          pipeline_status: 'deterministic_fallback',
          quantitative_metrics: quantitative,
          qualitative_observations: qualitative,
          media_references: {
            video_storage_path: input.media_references?.video_storage_path,
            smart_grid_processed: false,
            thumbnail_url: input.media_references?.thumbnail_url,
            keypoints_json_path: input.media_references?.keypoints_json_path,
          },
          computed_score: baseComputedScore,
          rubric_grade: baseRubricGrade,
          created_at: new Date().toISOString(),
        },
      });
    }

    // 2. Attempt Gemini AI evaluation
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const prompt = `You are the AcademyHub Multi-Agent Biomechanics & Kinematic Assessment Engine.
Process the incoming athletic performance data through the multi-agent biomechanics pipeline:
- Agent 1 (Kinematics & Joint Trajectory): Analyzes movement quality, joint angles, depth, symmetry.
- Agent 2 (Neuromuscular Fatigue & Cadence): Evaluates rep tempo, power decline, stamina.
- Agent 3 (Movement Fault Diagnostics): Identifies any kinetic flaws or injury risk vectors.
- Agent 4 (Prescriptive Coaching): Generates actionable corrective training drills.

Input Assessment Data:
- Athlete: ${input.athlete_name} (ID: ${input.athlete_id})
- Sport: ${input.sport}
- Exercise Drill / SOP: ${input.exercise_type} (${input.grading_rubric_sop || 'Standard SOP'})
- Valid Reps: ${quantitative.valid_reps}
- Duration: ${quantitative.duration_seconds} seconds
- Avg Joint / Depth Angle: ${quantitative.avg_depth_angle ?? 'N/A'} degrees
- Form Quality Score: ${qualitative.form_quality_score} / 100
- Endurance Score: ${qualitative.endurance_score} / 100
- Input Fault Tags: ${qualitative.fault_tags.join(', ') || 'None reported'}
- Coach Notes: ${qualitative.coach_notes || 'None'}

Provide an objective assessment score (0-100), letter grade ('A', 'B', 'C', 'D'), synthesis of notes, and detailed agent insights.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              computed_score: {
                type: Type.NUMBER,
                description: 'Refined biomechanical assessment score between 0 and 100',
              },
              rubric_grade: {
                type: Type.STRING,
                description: 'Grade rubric letter: A, B, C, or D',
              },
              enhanced_coach_notes: {
                type: Type.STRING,
                description: 'Comprehensive, structured coach diagnostic notes synthesized by the AI pipeline',
              },
              kinematicAnalysis: {
                type: Type.STRING,
                description: 'Detailed kinematic path, joint angle, and symmetry analysis',
              },
              fatigueAnalysis: {
                type: Type.STRING,
                description: 'Neuromuscular fatigue, rep cadence, and endurance degradation evaluation',
              },
              faultDiagnostics: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'List of detected biomechanical faults or kinematic risk tags',
              },
              prescriptiveDrills: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Prescriptive corrective drills for the athlete',
              },
              confidenceScore: {
                type: Type.NUMBER,
                description: 'Model confidence score between 0.0 and 1.0',
              },
            },
            required: [
              'computed_score',
              'rubric_grade',
              'enhanced_coach_notes',
              'kinematicAnalysis',
              'fatigueAnalysis',
              'faultDiagnostics',
              'prescriptiveDrills',
              'confidenceScore',
            ],
          },
        },
      });

      const parsed = JSON.parse(response.text?.trim() || '{}');

      const finalScore =
        typeof parsed.computed_score === 'number'
          ? Math.max(0, Math.min(100, Math.round(parsed.computed_score * 10) / 10))
          : baseComputedScore;

      const finalGrade = parsed.rubric_grade || deriveRubricGrade(finalScore);

      const evaluatedAssessment = {
        id: input.id || `asm_ai_${Date.now()}`,
        athlete_id: input.athlete_id,
        athlete_name: input.athlete_name,
        parent_email: input.parent_email,
        sport: input.sport,
        exercise_type: input.exercise_type,
        grading_rubric_sop: input.grading_rubric_sop || `${input.sport} - ${input.exercise_type} SOP`,
        coach_id: input.coach_id || 'coach_gemini_agent',
        coach_name: input.coach_name || 'Coach',
        data_source: 'ai_agentic',
        pipeline_status: 'ai_evaluated',
        quantitative_metrics: quantitative,
        qualitative_observations: {
          form_quality_score: qualitative.form_quality_score,
          endurance_score: qualitative.endurance_score,
          fault_tags: parsed.faultDiagnostics && parsed.faultDiagnostics.length > 0
            ? parsed.faultDiagnostics
            : qualitative.fault_tags,
          coach_notes: parsed.enhanced_coach_notes || qualitative.coach_notes,
        },
        media_references: {
          video_storage_path: input.media_references?.video_storage_path,
          smart_grid_processed: true,
          thumbnail_url: input.media_references?.thumbnail_url,
          keypoints_json_path: input.media_references?.keypoints_json_path,
        },
        computed_score: finalScore,
        rubric_grade: finalGrade,
        created_at: new Date().toISOString(),
        agent_insights: {
          kinematicAnalysis: parsed.kinematicAnalysis || 'Kinematics assessed through multi-agent pipeline.',
          fatigueAnalysis: parsed.fatigueAnalysis || 'Neuromuscular pacing evaluated.',
          faultDiagnostics: parsed.faultDiagnostics || qualitative.fault_tags,
          prescriptiveDrills: parsed.prescriptiveDrills || ['Maintain standard movement progression'],
          confidenceScore: typeof parsed.confidenceScore === 'number' ? parsed.confidenceScore : 0.95,
          processingPipeline: 'gemini_multi_agent',
        },
      };

      return NextResponse.json({ assessment: evaluatedAssessment });
    } catch (aiError: any) {
      // Gemini call failed or returned malformed JSON — return deterministic score with error detail (HTTP 200)
      console.error('Gemini AI evaluation failed, returning deterministic fallback:', aiError);
      return NextResponse.json({
        assessment: {
          id: input.id || `asm_det_${Date.now()}`,
          athlete_id: input.athlete_id,
          athlete_name: input.athlete_name,
          parent_email: input.parent_email,
          sport: input.sport,
          exercise_type: input.exercise_type,
          grading_rubric_sop: input.grading_rubric_sop || `${input.sport} - ${input.exercise_type} SOP`,
          coach_id: input.coach_id || 'coach_manual_entry',
          coach_name: input.coach_name || 'Coach',
          data_source: 'manual',
          pipeline_status: 'ai_error',
          error_detail: aiError.message || 'Gemini evaluation failed',
          quantitative_metrics: quantitative,
          qualitative_observations: qualitative,
          media_references: {
            video_storage_path: input.media_references?.video_storage_path,
            smart_grid_processed: false,
            thumbnail_url: input.media_references?.thumbnail_url,
            keypoints_json_path: input.media_references?.keypoints_json_path,
          },
          computed_score: baseComputedScore,
          rubric_grade: baseRubricGrade,
          created_at: new Date().toISOString(),
        },
      });
    }
  } catch (error: any) {
    console.error('Error in Gemini biomechanics evaluation pipeline:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process biomechanics evaluation pipeline' },
      { status: 500 }
    );
  }
}
