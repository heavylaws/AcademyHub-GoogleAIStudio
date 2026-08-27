import { NextResponse } from 'next/server';
import { verifyRequestAuth } from '@/lib/auth/verifyRequestAuth';
import { requireRole } from '@/lib/auth/requireRole';
import { authFailure } from '@/lib/auth/authFailure';
import { ensureUserRecord } from '@/lib/auth/ensureUserRecord';
import { prisma } from '@/lib/prisma';
import { appEnv } from '@/lib/env';
import {
  createInvoiceAdmin,
  listInvoicesAdmin,
  listInvoicesForParentUser,
} from '@/services/billingAdminService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  let user;
  try {
    user = await verifyRequestAuth(request);
    requireRole(user, ['parent', 'admin']);
  } catch (err) {
    return authFailure(err);
  }

  if (!appEnv.billingEnabled) {
    return NextResponse.json(
      { error: 'Service Unavailable: Billing feature is currently disabled.' },
      { status: 503 },
    );
  }

  if (!user.academyId) {
    return NextResponse.json({ error: 'Forbidden: No academy context' }, { status: 403 });
  }

  try {
    const invoices = user.role === 'parent'
      ? await listInvoicesForParentUser(user.uid, user.academyId)
      : await listInvoicesAdmin(user.academyId);
    return NextResponse.json({ invoices });
  } catch (err) {
    console.error('Error listing invoices:', err);
    return NextResponse.json({ error: 'Failed to list invoices' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let user;
  try {
    user = await verifyRequestAuth(request);
    requireRole(user, ['admin']);
  } catch (err) {
    return authFailure(err);
  }

  if (!appEnv.billingEnabled) {
    return NextResponse.json(
      { error: 'Service Unavailable: Billing feature is currently disabled.' },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    await ensureUserRecord(user);
    const parentUserId = body.parentUserId || user.uid;
    if (parentUserId !== user.uid) {
      if (!user.academyId) {
        return NextResponse.json(
          { error: 'No academy context. User must belong to an academy to create invoices.' },
          { status: 400 },
        );
      }
      const parentMembership = await prisma.membership.findUnique({
        where: {
          userId_academyId: {
            userId: parentUserId,
            academyId: user.academyId,
          },
        },
        select: { user: { select: { id: true, email: true } } },
      });

      if (!parentMembership) {
        return NextResponse.json(
          { error: 'Parent account must be a member of this academy.' },
          { status: 400 },
        );
      }
    }
    if (!user.academyId) {
      return NextResponse.json(
        { error: 'No academy context. User must belong to an academy to create invoices.' },
        { status: 400 },
      );
    }
    const invoice = await createInvoiceAdmin({
      ...body,
      parentUserId,
      academyId: user.academyId,
    });
    return NextResponse.json({ invoice }, { status: 201 });
  } catch (err) {
    console.error('Error creating invoice:', err);
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
  }
}
