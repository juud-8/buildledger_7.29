import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createPayment, getPaymentByExternalId } from '@/lib/db/payments'
import { getInvoice, updateInvoice } from '@/lib/db/invoices'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

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
    logger.error('Webhook signature verification failed', { error: err })
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
        logger.info(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    logger.error('Error processing webhook', { error })
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutSessionCompleted(session: any) {
  const supabase = createSupabaseServerClient()
  
  // Validate required metadata
  const invoiceId = session.metadata?.invoice_id
  const userId = session.metadata?.user_id
  
  if (!invoiceId || !userId) {
    logger.error('Missing required metadata in session', { 
      sessionId: session.id,
      metadata: session.metadata 
    })
    return
  }

  // Check if payment already exists (idempotency)
  const existingPayment = await getPaymentByExternalId(session.payment_intent)
  if (existingPayment) {
    logger.info('Payment already processed, skipping', { 
      paymentIntent: session.payment_intent,
      sessionId: session.id 
    })
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

  // Update invoice status and balance with ownership verification
  const invoice = await getInvoice(invoiceId, { id: userId } as any)
  if (invoice) {
    // Verify ownership matches metadata
    if (invoice.user_id !== userId) {
      logger.error('Invoice ownership mismatch', { 
        invoiceId,
        invoiceUserId: invoice.user_id,
        metadataUserId: userId 
      })
      return
    }
    
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
  // Check if payment already exists (idempotency)
  const existingPayment = await getPaymentByExternalId(paymentIntent.id)
  if (existingPayment) {
    logger.info('Payment already processed, skipping', { 
      paymentIntentId: paymentIntent.id 
    })
    return
  }

  // Validate required metadata
  const invoiceId = paymentIntent.metadata?.invoice_id
  const userId = paymentIntent.metadata?.user_id
  
  if (!invoiceId || !userId) {
    logger.error('Missing required metadata in payment intent', { 
      paymentIntentId: paymentIntent.id,
      metadata: paymentIntent.metadata 
    })
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

  // Update invoice status and balance with ownership verification
  const invoice = await getInvoice(invoiceId, { id: userId } as any)
  if (invoice) {
    // Verify ownership matches metadata
    if (invoice.user_id !== userId) {
      logger.error('Invoice ownership mismatch', { 
        invoiceId,
        invoiceUserId: invoice.user_id,
        metadataUserId: userId 
      })
      return
    }
    
    const newBalanceDue = Math.max(0, invoice.balance_due - (paymentIntent.amount / 100))
    const newStatus = newBalanceDue === 0 ? 'paid' : 'partial'
    
    await updateInvoice(invoiceId, {
      balance_due: newBalanceDue,
      status: newStatus
    }, { id: userId } as any)
  }
}

async function handlePaymentIntentFailed(paymentIntent: any) {
  // Validate required metadata
  const invoiceId = paymentIntent.metadata?.invoice_id
  const userId = paymentIntent.metadata?.user_id
  
  if (!invoiceId || !userId) {
    logger.error('Missing required metadata in payment intent', { 
      paymentIntentId: paymentIntent.id,
      metadata: paymentIntent.metadata 
    })
    return
  }

  // Check if payment already exists (idempotency)
  const existingPayment = await getPaymentByExternalId(paymentIntent.id)
  if (existingPayment) {
    // Update existing payment status
    await updatePaymentStatus(existingPayment.id, 'failed')
    logger.info('Updated existing payment status to failed', { 
      paymentId: existingPayment.id,
      paymentIntentId: paymentIntent.id 
    })
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
    logger.info('Created new failed payment record', { 
      paymentIntentId: paymentIntent.id,
      invoiceId 
    })
  }
}