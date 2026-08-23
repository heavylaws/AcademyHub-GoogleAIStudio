import { prisma } from '@/lib/prisma';
import { appEnv } from '@/lib/env';
import { AuthError } from '@/lib/auth/types';

export class AiRateLimitError extends AuthError {
  constructor(message: string) {
    super(message, 429);
    this.name = 'AiRateLimitError';
  }
}

/**
 * Enforces per-user per-minute and per-academy monthly rate limits on AI routes.
 *
 * NOTE: Count-then-create is non-atomic under high concurrency; this is an
 * intentional cost-control design trade-off for this application's scale.
 *
 * MUST be called AFTER verifying academy membership (user.academyId MUST be defined).
 */
export async function checkAndRecordAiUsage(
  userId: string,
  academyId: string | undefined,
  route: string
): Promise<void> {
  // Fail closed with 403 if caller has no academy membership
  if (!academyId) {
    throw new AuthError('Forbidden: User does not belong to an academy', 403);
  }

  const now = new Date();

  // 1. Check per-user per-minute limit
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
  const userCount = await prisma.aiUsage.count({
    where: {
      userId,
      createdAt: {
        gte: oneMinuteAgo,
      },
    },
  });

  const perMinLimit = appEnv.aiRateLimitPerMinute;
  if (userCount >= perMinLimit) {
    throw new AiRateLimitError(
      `Rate limit exceeded: Maximum ${perMinLimit} AI requests per minute per user. Please try again later.`
    );
  }

  // 2. Check per-academy monthly cap
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const academyCount = await prisma.aiUsage.count({
    where: {
      academyId,
      createdAt: {
        gte: startOfMonth,
      },
    },
  });

  const monthlyCap = appEnv.aiMonthlyCapPerAcademy;
  if (academyCount >= monthlyCap) {
    throw new AiRateLimitError(
      `Monthly quota exceeded: Maximum ${monthlyCap} AI requests per month for this academy.`
    );
  }

  // 3. Record usage row BEFORE calling the model (so mid-flight/failed calls count)
  await prisma.aiUsage.create({
    data: {
      userId,
      academyId,
      route,
    },
  });
}
