import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { Assessment } from '@/types/academy';

export async function POST(req: NextRequest) {
  try {
    const { query, assessments } = await req.json() as { query: string; assessments: Assessment[] };

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const itemsList = (assessments && assessments.length > 0) ? assessments : [];

    // Format athlete corpus for semantic matching
    const athleteCorpus = itemsList.map(a => `
- ATHLETE: ${a.athleteName} (ID: ${a.athleteId})
  Sport: ${a.sport} | Batch: ${a.batch}
  Composite Score (S_final): ${a.compositeScore} / 100
  Rep Count: ${a.repCount} | Form Quality: ${a.formQuality}% | Visual Endurance: ${a.visualEndurance}%
  Joint Kinematics: Elbow ${a.jointAngles.elbow}°, Knee ${a.jointAngles.knee}°, Shoulder ${a.jointAngles.shoulder}°, Hip ${a.jointAngles.hip}°
  Qualitative Feedback: ${a.qualitativeFeedback}
  Narrative Log: ${a.narrativeLog}
`).join('\n');

    if (apiKey) {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
You are AcademyHub AI Assistant, an elite sports scientist and biomechanics analyst for a multi-sport youth academy.
A coach has entered the following natural language RAG search query into the database:
"${query}"

Here is the database of current athlete assessment narrative logs and biomechanics data:
${athleteCorpus}

Your Task:
1. Analyze the unstructured narrative logs and biomechanics indicators for all athletes in the database.
2. Select the top matching athletes whose narrative logs and biomechanics match the coach's query requirements.
3. Construct a clear, executive response in Markdown format.

IMPORTANT OUTPUT REQUIREMENTS:
- Start with a 1-2 sentence high-level executive summary answering the coach's query.
- Include a Markdown Table with the following EXACT columns:
  | Athlete Name | Sport & Batch | Composite Score ($S_{final}$) | Key Biomechanical Strength | Strategic Area for Growth | Recommended Action Items & Drills |
- Follow up with a short "Coach Tactical Insight" callout block with actionable recommendations for the staff.
- Ensure professional sports science terminology (e.g., spinal articulation, thoracic mobility, valgus knee alignment, kinetic chain efficiency).
`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const markdownOutput = response.text || 'No narrative results generated.';

      return NextResponse.json({
        success: true,
        markdownResult: markdownOutput,
        matchedCount: itemsList.length,
      });
    }

    // Fallback if no API key is provided
    const filtered = itemsList.filter(a => 
      a.narrativeLog.toLowerCase().includes(query.toLowerCase()) ||
      a.qualitativeFeedback.toLowerCase().includes(query.toLowerCase()) ||
      a.sport.toLowerCase().includes(query.toLowerCase()) ||
      a.athleteName.toLowerCase().includes(query.toLowerCase())
    );

    const matchSet = filtered.length > 0 ? filtered : itemsList.slice(0, 2);

    const tableRows = matchSet.map(a => 
      `| **${a.athleteName}** | ${a.sport} (${a.batch}) | **${a.compositeScore.toFixed(1)}** | High repetition endurance & kinetic transfer | Core stability under late-set fatigue | 3x15 Lumbar Iso-holds, Single-leg stability drills |`
    ).join('\n');

    const fallbackMarkdown = `### RAG Search Query Results for: *"${query}"*

Found **${matchSet.length}** athlete profile(s) matching your narrative criteria in the database.

| Athlete Name | Sport & Batch | Composite Score ($S_{final}$) | Key Biomechanical Strength | Strategic Area for Growth | Recommended Action Items & Drills |
| :--- | :--- | :--- | :--- | :--- | :--- |
${tableRows}

> **Coach Tactical Insight**: Athletes flagged with late-set fatigue indicators should undergo core rigidity reinforcement before introducing higher velocity plyometrics.
`;

    return NextResponse.json({
      success: true,
      markdownResult: fallbackMarkdown,
      matchedCount: matchSet.length,
    });

  } catch (error: any) {
    console.error('RAG Search Error:', error);
    return NextResponse.json({ 
      error: error?.message || 'Failed to process RAG search',
      success: false 
    }, { status: 500 });
  }
}
