import { afterEach, describe, expect, it } from 'vitest';
import { assertProductionEnvironment } from './env';

describe('runtime environment validation', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('allows local development with safe defaults', () => {
    process.env.NODE_ENV = 'development';
    expect(() => assertProductionEnvironment()).not.toThrow();
  });

  it('rejects placeholder secrets in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.BETTER_AUTH_SECRET = 'change_me_in_production';
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/academyhub';
    process.env.APP_URL = 'https://example.com';

    expect(() => assertProductionEnvironment()).toThrow('Production config is incomplete');
  });

  it('accepts non-placeholder production values', () => {
    process.env.NODE_ENV = 'production';
    process.env.BETTER_AUTH_SECRET = 'secure-production-secret-1234567890';
    process.env.DATABASE_URL = 'postgresql://prod:secret@db.internal:5432/academyhub';
    process.env.APP_URL = 'https://app.example.com';

    expect(() => assertProductionEnvironment()).not.toThrow();
  });
});
