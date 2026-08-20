const placeholderValues = new Set([
  'change_me_in_production',
  'replace_with_your_gemini_key',
  'your_api_key_here',
  'placeholder',
]);

export function readEnv(name: string, fallback?: string): string {
  const value = process.env[name];
  const normalized = value?.trim();

  if (normalized && normalized.length > 0 && !placeholderValues.has(normalized.toLowerCase())) {
    return normalized;
  }

  if (fallback !== undefined) {
    return fallback;
  }

  return '';
}

export function assertProductionEnvironment(): void {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const checks = [
    'BETTER_AUTH_SECRET',
    'DATABASE_URL',
    'APP_URL',
  ];

  for (const key of checks) {
    const value = process.env[key];
    if (!value) continue;

    const normalized = value.trim().toLowerCase();
    if (placeholderValues.has(normalized)) {
      throw new Error(`Production config is incomplete. Set a real value for: ${key}`);
    }
  }
}

export const appEnv = {
  appUrl: readEnv('APP_URL', 'http://localhost:3000'),
  betterAuthUrl: readEnv('BETTER_AUTH_URL', readEnv('APP_URL', 'http://localhost:3000')),
  betterAuthSecret: readEnv('BETTER_AUTH_SECRET', 'change_me_in_production'),
  databaseUrl: readEnv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/academyhub?schema=public'),
  geminiApiKey: readEnv('GEMINI_API_KEY', ''),
  aiPipelineEnabled: readEnv('NEXT_PUBLIC_ENABLE_AI_PIPELINE', 'false') === 'true',
};

assertProductionEnvironment();
