import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export type WriteAuditLogParams = {
  academyId?: string | null;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: any;
};

type PrismaTx = Omit<
  Prisma.TransactionClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export async function writeAuditLog(
  params: WriteAuditLogParams,
  tx?: PrismaTx
) {
  const client = tx || prisma;
  try {
    await client.auditLog.create({
      data: {
        academyId: params.academyId ?? null,
        actorUserId: params.actorUserId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        metadata: params.metadata ? (params.metadata as Prisma.InputJsonValue) : Prisma.DbNull,
      },
    });
  } catch (error) {
    console.error(`Audit log failed for action ${params.action}:`, error);
  }
}
