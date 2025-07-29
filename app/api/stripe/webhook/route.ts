import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createPayment, getPaymentByExternalId } from '@/lib/db/payments'
import { getInvoice, updateInvoice } from '@/lib/db/invoices'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'Missing signature or webhook secret' },
      { status: 400 }
    )
  }

  let event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object)
        break
      
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object)
        break
      
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object)
        break
      
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutSessionCompleted(session: any) {
  const supabase = createSupabaseServerClient()
  
  // Get the invoice ID from metadata
  const invoiceId = session.metadata?.invoice_id
  const userId = session.metadata?.user_id
  
  if (!invoiceId || !userId) {
    console.error('Missing invoice_id or user_id in session metadata')
    return
  }

  // Check if payment already exists
  const existingPayment = await getPaymentByExternalId(session.payment_intent)
  if (existingPayment) {
    console.log('Payment already processed:', session.payment_intent)
    return
  }

  // Create payment record
  await createPayment({
    user_id: userId,
    invoice_id: invoiceId,
    amount: session.amount_total / 100, // Convert from cents
    method: 'stripe',
    external_id: session.payment_intent,
    status: 'completed'
  })

  // Update invoice status and balance
  const invoice = await getInvoice(invoiceId, { id: userId } as any)
  if (invoice) {
    const newBalanceDue = Math.max(0, invoice.balance_due - (session.amount_total / 100))
    const newStatus = newBalanceDue === 0 ? 'paid' : 'partial'
    
    await updateInvoice(invoiceId, {
      balance_due: newBalanceDue,
      status: newStatus
    }, { id: userId } as any)
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: any) {
  // This is a fallback in case checkout.session.completed doesn't fire
  // Check if payment already exists
  const existingPayment = await getPaymentByExternalId(paymentIntent.id)
  if (existingPayment) {
    console.log('Payment already processed:', paymentIntent.id)
    return
  }

  // Try to get invoice info from metadata or description
  const invoiceId = paymentIntent.metadata?.invoice_id
  const userId = paymentIntent.metadata?.user_id
  
  if (!invoiceId || !userId) {
    console.error('Missing invoice_id or user_id in payment intent metadata')
    return
  }

  // Create payment record
  await createPayment({
    user_id: userId,
    invoice_id: invoiceId,
    amount: paymentIntent.amount / 100, // Convert from cents
    method: 'stripe',
    external_id: paymentIntent.id,
    status: 'completed'
  })

  // Update invoice status and balance
  const invoice = await getInvoice(invoiceId, { id: userId } as any)
  if (invoice) {
    const newBalanceDue = Math.max(0, invoice.balance_due - (paymentIntent.amount / 100))
    const newStatus = newBalanceDue === 0 ? 'paid' : 'partial'
    
    await updateInvoice(invoiceId, {
      balance_due: newBalanceDue,
      status: newStatus
    }, { id: userId } as any)
  }
}

async function handlePaymentIntentFailed(paymentIntent: any) {
  // Create failed payment record
  const invoiceId = paymentIntent.metadata?.invoice_id
  const userId = paymentIntent.metadata?.user_id
  
  if (!invoiceId || !userId) {
    console.error('Missing invoice_id or user_id in payment intent metadata')
    return
  }

  // Check if payment already exists
  const existingPayment = await getPaymentByExternalId(paymentIntent.id)
  if (existingPayment) {
    // Update existing payment status
    await updatePaymentStatus(existingPayment.id, 'failed')
  } else {
    // Create new failed payment record
    await createPayment({
      user_id: userId,
      invoice_id: invoiceId,
      amount: paymentIntent.amount / 100,
      method: 'stripe',
      external_id: paymentIntent.id,
      status: 'failed'
    })
  }
}