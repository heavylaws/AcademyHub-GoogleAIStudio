import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getInvoiceByIdAdmin, updateInvoiceAdmin } from '@/services/billingAdminService';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  try {
    if (!stripeSecretKey || !stripeWebhookSecret) {
      console.error('Stripe webhook error: Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET');
      return NextResponse.json(
        { error: 'Stripe webhook secrets are not configured on the server.' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-02-24.acacia' as any,
    });

    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
    } catch (err) {
      console.error('Stripe webhook signature verification failed:', err);
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err instanceof Error ? err.message : String(err)}` },
        { status: 400 }
      );
    }

    // Handle checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const invoiceId = session.metadata?.invoiceId;

      if (invoiceId) {
        console.log(`[Stripe Webhook] Payment completed for invoice: ${invoiceId}`);
        const existingInvoice = await getInvoiceByIdAdmin(invoiceId);

        if (existingInvoice) {
          const updatedInstallments = existingInvoice.installmentBreakdown ? [...existingInvoice.installmentBreakdown] : [];
          if (updatedInstallments.length > 0) {
            updatedInstallments[0] = {
              ...updatedInstallments[0],
              status: 'Paid',
            };
          }

          // In v1 scope: only mark overall invoice payment_status as 'paid' if there is exactly 1 installment (upfront payment).
          // For 2-part and monthly plans, the first installment is marked Paid while the overall invoice remains 'pending'.
          // NOTE / KNOWN LIMITATION: Full multi-installment payment lifecycle (handling subsequent installments 2 and 3)
          // is explicitly deferred to a future iteration.
          const isFullPayment = updatedInstallments.length === 1;
          const nextPaymentStatus = isFullPayment ? 'paid' : 'pending';

          await updateInvoiceAdmin(invoiceId, {
            installmentBreakdown: updatedInstallments,
            payment_status: nextPaymentStatus,
          });
        } else {
          // Fallback if invoice was not found by ID
          await updateInvoiceAdmin(invoiceId, { payment_status: 'paid' });
        }
      } else {
        console.warn('[Stripe Webhook] checkout.session.completed received with no invoiceId in metadata');
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Stripe webhook handler error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
