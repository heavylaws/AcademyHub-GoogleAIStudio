import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const mockQueryRaw = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: (...args: unknown[]) => mockQueryRaw(...args),
  },
}));

describe('/api/health', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/academyhub';
    vi.clearAllMocks();
  });

  it('reports a healthy service when the database is reachable', async () => {
    mockQueryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.status).toBe('healthy');
    expect(payload.database).toBe('connected');
  });

  it('returns a degraded status when the database query fails', async () => {
    mockQueryRaw.mockRejectedValueOnce(new Error('db unavailable'));

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.ok).toBe(false);
    expect(payload.status).toBe('degraded');
  });
});
