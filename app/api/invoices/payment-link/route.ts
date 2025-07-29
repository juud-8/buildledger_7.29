import { NextRequest, NextResponse } from 'next/server';
import { createPaymentLink } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { invoiceId } = await req.json();

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    // Fetch invoice data
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        clients (
          name,
          email
        )
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Create payment link
    const paymentLink = await createPaymentLink({
      invoiceId: invoice.id,
      amount: invoice.total_amount,
      currency: invoice.currency || 'USD',
      description: `Invoice ${invoice.invoice_number}`,
      customerEmail: invoice.clients?.email,
    });

    // Update invoice with payment link
    await supabase
      .from('invoices')
      .update({ 
        stripe_session_id: paymentLink.sessionId,
        payment_link: paymentLink.url
      })
      .eq('id', invoiceId);

    return NextResponse.json({ 
      success: true, 
      paymentUrl: paymentLink.url,
      sessionId: paymentLink.sessionId
    });

  } catch (error) {
    console.error('Error creating payment link:', error);
    return NextResponse.json(
      { error: 'Failed to create payment link' },
      { status: 500 }
    );
  }
}