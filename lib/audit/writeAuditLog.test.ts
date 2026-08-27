import { beforeEach, describe, expect, it, vi } from 'vitest';
import { writeAuditLog } from './writeAuditLog';
import { prisma } from '@/lib/prisma';

const mockPrismaAuditLogCreate = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    auditLog: {
      create: (args: unknown) => mockPrismaAuditLogCreate(args),
    },
  },
}));

describe('writeAuditLog unit tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rethrows error when tx is provided and auditLog.create fails', async () => {
    const mockTxAuditLogCreate = vi.fn().mockRejectedValueOnce(new Error('Tx audit error'));
    const mockTx = {
      auditLog: {
        create: mockTxAuditLogCreate,
      },
    } as any;

    await expect(
      writeAuditLog(
        {
          academyId: 'acad_1',
          actorUserId: 'user_1',
          action: 'ROLE_CHANGED',
          targetType: 'Membership',
          targetId: 'mem_1',
          metadata: { before: 'parent', after: 'coach' },
        },
        mockTx
      )
    ).rejects.toThrow('Tx audit error');

    expect(mockTxAuditLogCreate).toHaveBeenCalledTimes(1);
    expect(mockPrismaAuditLogCreate).not.toHaveBeenCalled();
  });

  it('catches error and logs console.error when tx is NOT provided and auditLog.create fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockPrismaAuditLogCreate.mockRejectedValueOnce(new Error('Prisma audit error'));

    await expect(
      writeAuditLog({
        academyId: 'acad_1',
        actorUserId: 'user_1',
        action: 'ROLE_CHANGED',
        targetType: 'Membership',
        targetId: 'mem_1',
        metadata: { before: 'parent', after: 'coach' },
      })
    ).resolves.toBeUndefined();

    expect(mockPrismaAuditLogCreate).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      'Audit log failed for action ROLE_CHANGED:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});
