import { afterEach, describe, expect, it, vi } from 'vitest';
import { appEnv, assertProductionEnvironment, DEFAULT_AI_MODEL } from './env';

describe('runtime environment validation', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('allows local development with safe defaults', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(() => assertProductionEnvironment()).not.toThrow();
  });

  it('rejects a missing BETTER_AUTH_SECRET in non-production when accessed', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('BETTER_AUTH_SECRET', '');

    expect(() => appEnv.betterAuthSecret).toThrow('BETTER_AUTH_SECRET');
  });

  it('rejects a missing DATABASE_URL when accessed', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('DATABASE_URL', '');

    expect(() => appEnv.databaseUrl).toThrow('DATABASE_URL');
  });

  it('rejects a placeholder DATABASE_URL when accessed', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('DATABASE_URL', 'placeholder');

    expect(() => appEnv.databaseUrl).toThrow('DATABASE_URL');
  });

  it('rejects a missing BETTER_AUTH_SECRET in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('BETTER_AUTH_SECRET', '');
    vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@db.internal:5432/academyhub');
    vi.stubEnv('APP_URL', 'https://example.com');

    expect(() => assertProductionEnvironment()).toThrow('BETTER_AUTH_SECRET');
  });

  it('rejects an empty BETTER_AUTH_SECRET in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('BETTER_AUTH_SECRET', '   ');
    vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@db.internal:5432/academyhub');
    vi.stubEnv('APP_URL', 'https://example.com');

    expect(() => assertProductionEnvironment()).toThrow('BETTER_AUTH_SECRET');
  });

  it('rejects a placeholder BETTER_AUTH_SECRET in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('BETTER_AUTH_SECRET', 'change_me_in_production');
    vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@db.internal:5432/academyhub');
    vi.stubEnv('APP_URL', 'https://example.com');

    expect(() => assertProductionEnvironment()).toThrow('BETTER_AUTH_SECRET');
  });

  it('rejects a too-short BETTER_AUTH_SECRET in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('BETTER_AUTH_SECRET', 'short-secret');
    vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@db.internal:5432/academyhub');
    vi.stubEnv('APP_URL', 'https://example.com');

    expect(() => assertProductionEnvironment()).toThrow('BETTER_AUTH_SECRET');
  });

  it('rejects a missing DATABASE_URL in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('BETTER_AUTH_SECRET', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('APP_URL', 'https://example.com');

    expect(() => assertProductionEnvironment()).toThrow('DATABASE_URL');
  });

  it('accepts non-placeholder production values', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('BETTER_AUTH_SECRET', 'secure-production-secret-1234567890');
    vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@db.internal:5432/academyhub');
    vi.stubEnv('APP_URL', 'https://app.example.com');

    expect(() => assertProductionEnvironment()).not.toThrow();
  });

  it('defaults billingEnabled to false and activates when BILLING_ENABLED is true', () => {
    vi.stubEnv('BILLING_ENABLED', '');
    vi.stubEnv('NEXT_PUBLIC_BILLING_ENABLED', '');
    expect(appEnv.billingEnabled).toBe(false);

    vi.stubEnv('BILLING_ENABLED', 'true');
    expect(appEnv.billingEnabled).toBe(true);
  });

  it('does NOT enable billing when only NEXT_PUBLIC_BILLING_ENABLED is true', () => {
    vi.stubEnv('BILLING_ENABLED', '');
    vi.stubEnv('NEXT_PUBLIC_BILLING_ENABLED', 'true');
    expect(appEnv.billingEnabled).toBe(false);
  });

  it('returns default AI rate limits and overrides from env', () => {
    vi.stubEnv('AI_RATE_LIMIT_PER_MINUTE', '');
    vi.stubEnv('AI_MONTHLY_CAP_PER_ACADEMY', '');
    expect(appEnv.aiRateLimitPerMinute).toBe(10);
    expect(appEnv.aiMonthlyCapPerAcademy).toBe(1000);

    vi.stubEnv('AI_RATE_LIMIT_PER_MINUTE', '5');
    vi.stubEnv('AI_MONTHLY_CAP_PER_ACADEMY', '50');
    expect(appEnv.aiRateLimitPerMinute).toBe(5);
    expect(appEnv.aiMonthlyCapPerAcademy).toBe(50);
  });

  it('returns default AI model and allows AI_MODEL env override', () => {
    vi.stubEnv('AI_MODEL', '');
    expect(appEnv.aiModel).toBe(DEFAULT_AI_MODEL);

    vi.stubEnv('AI_MODEL', 'gemini-2.5-flash');
    expect(appEnv.aiModel).toBe('gemini-2.5-flash');
  });
});
