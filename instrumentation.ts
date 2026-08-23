import { assertProductionEnvironment, appEnv } from './lib/env';
import { GoogleGenAI } from '@google/genai';

export function register() {
  assertProductionEnvironment();

  // Skip startup validation if GEMINI_API_KEY is unset or running under NODE_ENV=test
  const apiKey = appEnv.geminiApiKey;
  if (!apiKey || process.env.NODE_ENV === 'test') {
    return;
  }

  // Asynchronous non-blocking startup validation for AI model availability
  try {
    const ai = new GoogleGenAI({ apiKey });
    const modelName = appEnv.aiModel;

    ai.models
      .generateContent({
        model: modelName,
        contents: 'ping',
      })
      .then(() => {
        console.log(`[AI Startup] Gemini AI model '${modelName}' validated successfully.`);
      })
      .catch((err: any) => {
        console.error(
          `[AI Startup Warning] Gemini AI model validation failed [model: ${modelName}]:`,
          err?.message || err
        );
      });
  } catch (err: any) {
    console.error(
      `[AI Startup Warning] Failed to initialize Gemini AI client [model: ${appEnv.aiModel}]:`,
      err?.message || err
    );
  }
}
