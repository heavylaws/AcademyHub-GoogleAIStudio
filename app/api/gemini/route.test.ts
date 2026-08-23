import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { AuthError } from '@/lib/auth/types';
import { AiRateLimitError } from '@/lib/auth/rateLimitAi';

const mockVerifyRequestAuth = vi.fn();
const mockRequireRole = vi.fn();
const mockCheckAndRecordAiUsage = vi.fn();

vi.mock('@/lib/auth/verifyRequestAuth', () => ({
  verifyRequestAuth: (req: any) => mockVerifyRequestAuth(req),
}));

vi.mock('@/lib/auth/requireRole', () => ({
  requireRole: (user: any, allowedRoles: any) => mockRequireRole(user, allowedRoles),
}));

vi.mock('@/lib/auth/rateLimitAi', () => ({
  checkAndRecordAiUsage: (...args: any[]) => mockCheckAndRecordAiUsage(...args),
  AiRateLimitError: class extends Error {
    statusCode = 429;
    constructor(msg: string) {
      super(msg);
      this.name = 'AiRateLimitError';
    }
  },
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = {
      generateContent: vi.fn().mockResolvedValue({ text: 'Biomechanical analysis text' }),
    };
  },
}));

describe('POST /api/gemini', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('GEMINI_API_KEY', 'test-api-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('rejects unauthenticated requests with status 401', async () => {
    mockVerifyRequestAuth.mockRejectedValueOnce(new AuthError('Missing authentication session', 401));

    const req = new NextRequest('http://localhost:3000/api/gemini', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Analyze sprint' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Missing authentication session');
  });

  it('rejects parent role requests with status 403', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'user_parent', role: 'parent', academyId: 'acad_1' });
    mockRequireRole.mockImplementationOnce((user: any, roles: string[]) => {
      expect(roles).toEqual(['admin', 'coach']);
      throw new AuthError('Forbidden: Insufficient role permissions', 403);
    });

    const req = new NextRequest('http://localhost:3000/api/gemini', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Analyze sprint' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe('Forbidden: Insufficient role permissions');
  });

  it('rejects user without academyId with status 403 before rate limiting', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'user_coach', role: 'coach', academyId: undefined });
    mockRequireRole.mockReturnValue(undefined);

    const req = new NextRequest('http://localhost:3000/api/gemini', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Analyze sprint' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe('Forbidden: User does not belong to an academy');
    expect(mockCheckAndRecordAiUsage).not.toHaveBeenCalled();
  });

  it('returns HTTP 503 when GEMINI_API_KEY is missing', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'user_coach', role: 'coach', academyId: 'acad_1' });
    mockRequireRole.mockReturnValue(undefined);

    const req = new NextRequest('http://localhost:3000/api/gemini', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Analyze sprint' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toContain('AI features are currently unavailable');
    expect(json.text).toBeUndefined(); // Confirms no fabricated response returned
  });

  it('rejects oversized prompt field (>1000 chars) with HTTP 400', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'user_coach', role: 'coach', academyId: 'acad_1' });
    mockRequireRole.mockReturnValue(undefined);

    const longPrompt = 'a'.repeat(1001);
    const req = new NextRequest('http://localhost:3000/api/gemini', {
      method: 'POST',
      body: JSON.stringify({ prompt: longPrompt }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('exceeds maximum allowed length');
  });

  it('returns HTTP 429 when rate limit is exceeded', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'user_coach', role: 'coach', academyId: 'acad_1' });
    mockRequireRole.mockReturnValue(undefined);
    mockCheckAndRecordAiUsage.mockRejectedValueOnce(
      new AiRateLimitError('Rate limit exceeded: Maximum 10 AI requests per minute per user.')
    );

    const req = new NextRequest('http://localhost:3000/api/gemini', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Analyze sprint' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toContain('Rate limit exceeded');
  });

  it('allows authenticated coach with valid prompt and records usage before call', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'user_coach', role: 'coach', academyId: 'acad_1' });
    mockRequireRole.mockReturnValue(undefined);
    mockCheckAndRecordAiUsage.mockResolvedValueOnce(undefined);

    const req = new NextRequest('http://localhost:3000/api/gemini', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Analyze sprint' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.text).toBe('Biomechanical analysis text');
    expect(mockCheckAndRecordAiUsage).toHaveBeenCalledWith('user_coach', 'acad_1', '/api/gemini');
  });
});
