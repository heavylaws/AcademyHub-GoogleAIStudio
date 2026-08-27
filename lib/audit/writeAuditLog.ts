import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export type WriteAuditLogParams = {
  academyId?: string | null;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Prisma.InputJsonValue;
};

type PrismaTx = Omit<
  Prisma.TransactionClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export async function writeAuditLog(
  params: WriteAuditLogParams,
  tx?: PrismaTx
) {
  const data = {
    academyId: params.academyId ?? null,
    actorUserId: params.actorUserId,
    action: params.action,
    targetType: params.targetType,
    targetId: params.targetId,
    metadata: params.metadata !== undefined ? params.metadata : Prisma.DbNull,
  };

  if (tx) {
    await tx.auditLog.create({ data });
  } else {
    try {
      await prisma.auditLog.create({ data });
    } catch (error) {
      console.error(`Audit log failed for action ${params.action}:`, error);
    }
  }
}

