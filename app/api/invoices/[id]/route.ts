import { NextResponse } from 'next/server';
import { verifyRequestAuth } from '@/lib/auth/verifyRequestAuth';
import { requireOwnership } from '@/lib/auth/requireOwnership';
import { requireRole } from '@/lib/auth/requireRole';
import { authFailure } from '@/lib/auth/authFailure';
import { appEnv } from '@/lib/env';
import {
  getInvoiceByIdAdmin,
  updateInvoiceAdmin,
} from '@/services/billingAdminService';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  let user;
  const { id } = await context.params;
  try {
    user = await verifyRequestAuth(request);
    await requireOwnership(user, 'invoice', id);
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
    const invoice = await getInvoiceByIdAdmin(id);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    return NextResponse.json({ invoice });
  } catch (err) {
    console.error(`Error reading invoice ${id}:`, err);
    return NextResponse.json({ error: 'Failed to read invoice' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const user = await verifyRequestAuth(request);
    requireRole(user, ['admin']);
    await requireOwnership(user, 'invoice', id);
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
    await updateInvoiceAdmin(id, await request.json());
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(`Error updating invoice ${id}:`, err);
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
  }
}
