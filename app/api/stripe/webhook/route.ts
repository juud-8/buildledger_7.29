import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(paymentIntent);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const invoiceId = session.metadata?.invoiceId;
  
  if (!invoiceId) {
    console.error('No invoice ID found in session metadata');
    return;
  }

  // Update invoice status to paid
  const { error: invoiceError } = await supabase
    .from('invoices')
    .update({ 
      status: 'paid',
      paid_at: new Date().toISOString(),
      stripe_session_id: session.id
    })
    .eq('id', invoiceId);

  if (invoiceError) {
    console.error('Error updating invoice:', invoiceError);
    throw invoiceError;
  }

  // Insert payment record
  const { error: paymentError } = await supabase
    .from('payments')
    .insert({
      invoice_id: invoiceId,
      amount: session.amount_total! / 100, // Convert from cents
      currency: session.currency!,
      stripe_payment_intent_id: session.payment_intent as string,
      stripe_session_id: session.id,
      payment_method: 'stripe',
      status: 'completed'
    });

  if (paymentError) {
    console.error('Error inserting payment record:', paymentError);
    throw paymentError;
  }

  console.log(`Invoice ${invoiceId} marked as paid`);
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  // Additional payment intent handling if needed
  console.log(`Payment intent ${paymentIntent.id} succeeded`);
}