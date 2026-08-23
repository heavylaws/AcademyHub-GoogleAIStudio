import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkAndRecordAiUsage, AiRateLimitError } from './rateLimitAi';
import { prisma } from '@/lib/prisma';
import { appEnv } from '@/lib/env';
import { AuthError } from '@/lib/auth/types';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    aiUsage: {
      count: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe('checkAndRecordAiUsage', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('fails closed with 403 when user has no academyId and creates no AiUsage row', async () => {
    await expect(checkAndRecordAiUsage('user_no_acad', undefined, '/api/gemini')).rejects.toThrow(
      AuthError
    );

    expect(prisma.aiUsage.create).not.toHaveBeenCalled();
  });

  it('records usage row when below limits', async () => {
    vi.mocked(prisma.aiUsage.count).mockResolvedValue(0);
    vi.mocked(prisma.aiUsage.create).mockResolvedValue({
      id: 'usage_1',
      userId: 'user_1',
      academyId: 'acad_1',
      route: '/api/gemini',
      createdAt: new Date(),
    });

    await expect(
      checkAndRecordAiUsage('user_1', 'acad_1', '/api/gemini')
    ).resolves.not.toThrow();

    expect(prisma.aiUsage.create).toHaveBeenCalledWith({
      data: {
        userId: 'user_1',
        academyId: 'acad_1',
        route: '/api/gemini',
      },
    });
  });

  it('throws 429 AiRateLimitError when per-user per-minute limit is reached', async () => {
    vi.stubEnv('AI_RATE_LIMIT_PER_MINUTE', '10');
    // First count call (user count) returns 10
    vi.mocked(prisma.aiUsage.count).mockResolvedValueOnce(10);

    await expect(
      checkAndRecordAiUsage('user_1', 'acad_1', '/api/gemini')
    ).rejects.toThrow(AiRateLimitError);

    expect(prisma.aiUsage.create).not.toHaveBeenCalled();
  });

  it('throws 429 AiRateLimitError when per-academy monthly cap is reached', async () => {
    vi.stubEnv('AI_RATE_LIMIT_PER_MINUTE', '10');
    vi.stubEnv('AI_MONTHLY_CAP_PER_ACADEMY', '1000');

    // First count call (user count) returns 2, second count call (academy count) returns 1000
    vi.mocked(prisma.aiUsage.count)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1000);

    await expect(
      checkAndRecordAiUsage('user_1', 'acad_1', '/api/gemini')
    ).rejects.toThrow(AiRateLimitError);

    expect(prisma.aiUsage.create).not.toHaveBeenCalled();
  });
});
