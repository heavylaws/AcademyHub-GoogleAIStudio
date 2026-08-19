import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ensureUserRecord } from './ensureUserRecord';

const mockUpsert = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: { user: { upsert: (args: unknown) => mockUpsert(args) } },
}));

describe('ensureUserRecord', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mirrors Firebase identity and claimed role into Postgres', async () => {
    mockUpsert.mockResolvedValueOnce(undefined);

    await ensureUserRecord({
      uid: 'firebase_parent_1',
      email: 'parent@example.com',
      role: 'parent',
      claims: { role: 'parent' },
    });

    expect(mockUpsert).toHaveBeenCalledWith({
      where: { id: 'firebase_parent_1' },
      update: { email: 'parent@example.com', role: 'PARENT' },
      create: { id: 'firebase_parent_1', email: 'parent@example.com', role: 'PARENT' },
    });
  });

  it('defaults the Postgres mirror role to parent when the claim is absent', async () => {
    mockUpsert.mockResolvedValueOnce(undefined);

    await ensureUserRecord({
      uid: 'firebase_unknown_1',
      email: 'unknown@example.com',
      claims: {},
    });

    expect(mockUpsert.mock.calls[0][0].create.role).toBe('PARENT');
  });
});
