import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getInvoiceByIdAdmin } from '@/services/billingAdminService';
import { verifyRequestAuth } from '@/lib/auth/verifyRequestAuth';
import { requireRole } from '@/lib/auth/requireRole';
import { AuthError } from '@/lib/auth/types';

export async function POST(req: Request) {
  try {
    const user = await verifyRequestAuth(req);
    requireRole(user, ['parent', 'admin']);
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }

  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: 'STRIPE_SECRET_KEY is not configured on the server.' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-02-24.acacia' as any,
    });

    const body = await req.json();
    const { invoiceId } = body;

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Missing required field: invoiceId' },
        { status: 400 }
      );
    }

    const invoice = await getInvoiceByIdAdmin(invoiceId);

    if (!invoice) {
      return NextResponse.json(
        { error: `Invoice with ID "${invoiceId}" was not found.` },
        { status: 404 }
      );
    }

    if (invoice.payment_status === 'paid') {
      return NextResponse.json(
        { error: 'This invoice has already been paid.' },
        { status: 400 }
      );
    }

    const origin = req.headers.get('origin') || process.env.APP_URL || 'http://localhost:3000';

    // Charge the first/immediate installment amount (which is schedule-aware and includes early-pay discounts)
    const currentInstallment = invoice.installmentBreakdown?.[0];
    const chargeAmount = currentInstallment?.amount ?? invoice.netTotal;
    const isMultiInstallment = (invoice.installmentBreakdown?.length || 0) > 1;

    const description = isMultiInstallment
      ? `Installment 1 of ${invoice.installmentBreakdown.length} for: ${invoice.children.map((c) => c.childName).join(', ')} (${invoice.paymentSchedule} schedule)`
      : `Consolidated athletic tuition for: ${invoice.children.map((c) => c.childName).join(', ')}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `AcademyHub Athletics - Family Invoice (${invoice.id})`,
              description,
            },
            unit_amount: Math.round(chargeAmount * 100), // Stripe expects unit amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/?stripe_status=success&invoice_id=${invoice.id}`,
      cancel_url: `${origin}/?stripe_status=cancelled&invoice_id=${invoice.id}`,
      customer_email: invoice.parentEmail,
      metadata: {
        invoiceId: invoice.id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating Stripe Checkout Session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
