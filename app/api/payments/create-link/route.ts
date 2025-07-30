import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { stripe } from '@/lib/stripe'
import { getInvoice } from '@/lib/db/invoices'
import { updateInvoice } from '@/lib/db/invoices'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// Zod schema for request validation
const CreateLinkSchema = z.object({
  invoice_id: z.string().uuid("Invalid invoice ID format"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = CreateLinkSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: parsed.error.errors,
        },
        { status: 400 }
      )
    }

    const { invoice_id } = parsed.data

    // Get the current user
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Load invoice
    const invoice = await getInvoice(invoice_id, user)
    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Check if invoice already has a payment link
    if (invoice.stripe_payment_link) {
      return NextResponse.json({
        payment_link: invoice.stripe_payment_link
      })
    }

    // Create Stripe Payment Link
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Invoice ${invoice.number}`,
              description: `Payment for invoice ${invoice.number} - ${invoice.client_name}`,
            },
            unit_amount: Math.round(invoice.total * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invoices/${invoice.id}?payment=success`,
        },
      },
      metadata: {
        invoice_id: invoice.id,
        user_id: user.id,
      },
    })

    // Save the payment link to the invoice
    await updateInvoice(invoice_id, {
      stripe_payment_link: paymentLink.url
    }, user)

    return NextResponse.json({
      payment_link: paymentLink.url
    })

  } catch (error) {
    logger.error('Error creating payment link', { error, invoice_id })
    return NextResponse.json(
      { error: 'Failed to create payment link' },
      { status: 500 }
    )
  }
}