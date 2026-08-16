import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { prompt, context } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        text: 'AI Insight (Simulated / Local Mode): Focus on maintaining a 90° knee angle during plyometric landings to optimize kinematic efficiency and reduce ACL strain. Schedule 48 hours recovery between max-effort velocity sessions.'
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    const fullPrompt = `You are an elite Sports Biomechanics & Performance Coach AI for AcademyHub.
Context: ${context || 'General Athletic Performance & Kinematics'}
User Prompt: ${prompt}

Provide concise, precise, actionable biomechanical analysis, training drills, or safety recommendations (150-250 words max).`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: fullPrompt,
    });

    return NextResponse.json({ text: response.text });
  } catch (err: any) {
    console.error('Gemini API Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate AI insights' },
      { status: 500 }
    );
  }
}
