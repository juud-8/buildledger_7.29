import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createPaymentLink } from '@/lib/stripe';

// Zod schema for request validation
const paymentLinkSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID format'),
});

export async function POST(req: NextRequest) {
  try {
    // Parse and validate request body
    const body = await req.json();
    const validationResult = paymentLinkSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }

    const { invoiceId } = validationResult.data;

    // Create authenticated Supabase client
    const supabase = await createSupabaseServerClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch invoice with ownership check
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
      .eq('user_id', user.id) // Ensure user owns this invoice
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found or access denied' },
        { status: 404 }
      );
    }

    // Check if invoice is already paid
    if (invoice.status === 'paid') {
      return NextResponse.json(
        { error: 'Invoice is already paid' },
        { status: 400 }
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
    const { error: updateError } = await supabase
      .from('invoices')
      .update({ 
        stripe_session_id: paymentLink.sessionId,
        payment_link: paymentLink.url
      })
      .eq('id', invoiceId)
      .eq('user_id', user.id); // Double-check ownership

    if (updateError) {
      console.error('Error updating invoice:', updateError);
      return NextResponse.json(
        { error: 'Failed to update invoice with payment link' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      paymentUrl: paymentLink.url,
      sessionId: paymentLink.sessionId
    });

  } catch (error) {
    console.error('Error creating payment link:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}