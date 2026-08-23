import { NextResponse } from 'next/server';
import { verifyRequestAuth } from '@/lib/auth/verifyRequestAuth';
import { requireRole } from '@/lib/auth/requireRole';
import { AuthError } from '@/lib/auth/types';
import { ensureUserRecord } from '@/lib/auth/ensureUserRecord';
import { prisma } from '@/lib/prisma';
import {
  createInvoiceAdmin,
  listInvoicesAdmin,
  listInvoicesForParentUser,
} from '@/services/billingAdminService';

export const dynamic = 'force-dynamic';

function authFailure(err: unknown) {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode });
  }
  return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
}

export async function GET(request: Request) {
  let user;
  try {
    user = await verifyRequestAuth(request);
    requireRole(user, ['parent', 'admin']);
  } catch (err) {
    return authFailure(err);
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

  try {
    const body = await request.json();
    await ensureUserRecord(user);
    const parentUserId = body.parentUserId || user.uid;
    if (parentUserId !== user.uid) {
      const targetParent = await prisma.user.findUnique({ where: { id: parentUserId } });
      if (!targetParent) {
        return NextResponse.json(
          { error: 'Parent account must sign in before an invoice can be created for it.' },
          { status: 400 }
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
