import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { AuthError } from '@/lib/auth/types';

const mockVerifyRequestAuth = vi.fn();
const mockRequireRole = vi.fn();

vi.mock('@/lib/auth/verifyRequestAuth', () => ({
  verifyRequestAuth: (req: any) => mockVerifyRequestAuth(req),
}));

vi.mock('@/lib/auth/requireRole', () => ({
  requireRole: (user: any, allowedRoles: any) => mockRequireRole(user, allowedRoles),
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
  });

  it('rejects unauthenticated requests with status 401', async () => {
    mockVerifyRequestAuth.mockRejectedValueOnce(new AuthError('Missing Authorization header', 401));

    const req = new NextRequest('http://localhost:3000/api/gemini', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Analyze sprint' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Missing Authorization header');
  });

  it('rejects requests with unallowed role with status 403', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'user_1', role: 'guest' });
    mockRequireRole.mockImplementationOnce(() => {
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

  it('allows authenticated requests with allowed role', async () => {
    mockVerifyRequestAuth.mockResolvedValueOnce({ uid: 'user_parent', role: 'parent' });
    mockRequireRole.mockReturnValue(undefined);

    const req = new NextRequest('http://localhost:3000/api/gemini', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Analyze sprint' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.text).toBeDefined();
  });
});
