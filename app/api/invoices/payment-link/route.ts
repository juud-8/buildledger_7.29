import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createPaymentLink } from '@/lib/stripe'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getInvoice } from '@/lib/db/invoices'

// Zod schema for request validation
const createPaymentLinkSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID format')
})

export async function POST(req: NextRequest) {
  try {
    // Parse and validate request body
    const body = await req.json()
    const validationResult = createPaymentLinkSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { invoiceId } = validationResult.data

    // Create Supabase server client
    const supabase = await createSupabaseServerClient()

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch invoice data with ownership check
    const invoice = await getInvoice(invoiceId, user)
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Create payment link
    const paymentLink = await createPaymentLink({
      invoiceId: invoice.id,
      amount: invoice.total,
      currency: 'USD', // You might want to make this configurable
      description: `Invoice ${invoice.number}`,
      customerEmail: invoice.client_email,
    })

    // Update invoice with payment link
    const { error: updateError } = await supabase
      .from('invoices')
      .update({ 
        stripe_payment_link: paymentLink.url,
        stripe_session_id: paymentLink.sessionId,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error updating invoice with payment link:', updateError)
      return NextResponse.json(
        { error: 'Failed to update invoice with payment link' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      paymentUrl: paymentLink.url,
      sessionId: paymentLink.sessionId
    })

  } catch (error) {
    console.error('Error creating payment link:', error)
    return NextResponse.json(
      { error: 'Failed to create payment link' },
      { status: 500 }
    )
  }
}