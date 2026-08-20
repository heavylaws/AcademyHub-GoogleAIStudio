import type { Prisma } from '@prisma/client';

export function toNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value == null) return 0;

  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return Number(value.toString());
}
