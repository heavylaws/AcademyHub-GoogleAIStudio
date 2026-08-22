const placeholderValues = new Set([
  'change_me_in_production',
  'replace_with_your_gemini_key',
  'your_api_key_here',
  'placeholder',
  'set_a_32_char_or_more_secret_here',
  'set-me-before-production',
  'set_me_before_production',
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

export function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim() ?? '';

  if (!value) {
    throw new Error(`Environment variable ${name} is required but was missing or empty.`);
  }

  if (placeholderValues.has(value.toLowerCase())) {
    throw new Error(`Environment variable ${name} cannot use a placeholder value.`);
  }

  if (name === 'BETTER_AUTH_SECRET' && value.length < 32) {
    throw new Error(`Environment variable ${name} must be at least 32 characters long.`);
  }

  return value;
}

export function assertProductionEnvironment(): void {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const checks = ['BETTER_AUTH_SECRET', 'DATABASE_URL', 'APP_URL'] as const;

  for (const key of checks) {
    const value = process.env[key]?.trim() ?? '';

    if (!value || placeholderValues.has(value.toLowerCase())) {
      throw new Error(`Production config is incomplete. Set a real value for: ${key}`);
    }

    if (key === 'BETTER_AUTH_SECRET' && value.length < 32) {
      throw new Error(`Production config is incomplete. Set a real value for: ${key}`);
    }
  }
}

export const appEnv = {
  get appUrl() {
    return readEnv('APP_URL', 'http://localhost:3000');
  },
  get betterAuthUrl() {
    return readEnv('BETTER_AUTH_URL', this.appUrl);
  },
  get betterAuthSecret() {
    return getRequiredEnv('BETTER_AUTH_SECRET');
  },
  get databaseUrl() {
    return process.env.DATABASE_URL?.trim() ?? '';
  },
  get geminiApiKey() {
    return readEnv('GEMINI_API_KEY', '');
  },
  get aiPipelineEnabled() {
    return readEnv('NEXT_PUBLIC_ENABLE_AI_PIPELINE', 'false') === 'true';
  },
};
