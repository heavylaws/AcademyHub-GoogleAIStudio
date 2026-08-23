import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

const mockInviteFindUnique = vi.fn();
const mockUserFindUnique = vi.fn();

vi.mock('@/lib/auth/betterAuth', () => ({
  auth: {
    api: {
      signUpEmail: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    invite: {
      findUnique: (args: unknown) => mockInviteFindUnique(args),
    },
    user: {
      findUnique: (args: unknown) => mockUserFindUnique(args),
    },
  },
}));

describe('/api/invites/accept uniform error response', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns identical 400 Bad Request error for missing token hash', async () => {
    mockInviteFindUnique.mockResolvedValueOnce(null);

    const req = new NextRequest('http://localhost/api/invites/accept', {
      method: 'POST',
      body: JSON.stringify({ token: 'unknown_token', password: 'password123' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid or expired invitation token.');
  });

  it('returns identical 400 Bad Request error for expired token', async () => {
    mockInviteFindUnique.mockResolvedValueOnce({
      id: 'inv_expired',
      expiresAt: new Date(Date.now() - 1000), // expired
      acceptedAt: null,
      revokedAt: null,
      academy: { isActive: true },
    });

    const req = new NextRequest('http://localhost/api/invites/accept', {
      method: 'POST',
      body: JSON.stringify({ token: 'expired_token', password: 'password123' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid or expired invitation token.');
  });

  it('returns identical 400 Bad Request error for revoked token', async () => {
    mockInviteFindUnique.mockResolvedValueOnce({
      id: 'inv_revoked',
      expiresAt: new Date(Date.now() + 100000),
      acceptedAt: null,
      revokedAt: new Date(), // revoked
      academy: { isActive: true },
    });

    const req = new NextRequest('http://localhost/api/invites/accept', {
      method: 'POST',
      body: JSON.stringify({ token: 'revoked_token', password: 'password123' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid or expired invitation token.');
  });

  it('returns identical 400 Bad Request error for inactive academy', async () => {
    mockInviteFindUnique.mockResolvedValueOnce({
      id: 'inv_inactive_acad',
      expiresAt: new Date(Date.now() + 100000),
      acceptedAt: null,
      revokedAt: null,
      academy: { isActive: false }, // inactive
    });

    const req = new NextRequest('http://localhost/api/invites/accept', {
      method: 'POST',
      body: JSON.stringify({ token: 'inactive_acad_token', password: 'password123' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid or expired invitation token.');
  });
});
