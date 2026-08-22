import { afterEach, describe, expect, it, vi } from 'vitest';
import { appEnv, assertProductionEnvironment } from './env';

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
});
