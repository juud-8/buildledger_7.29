import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sendInvoiceEmail } from '@/lib/resend';

// Zod schema for request validation
const sendInvoiceSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID format'),
  email: z.string().email('Invalid email format'),
});

export async function POST(req: NextRequest) {
  try {
    // Parse and validate request body
    const body = await req.json();
    const validationResult = sendInvoiceSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }

    const { invoiceId, email } = validationResult.data;

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

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(invoice);

    // Send email
    await sendInvoiceEmail({
      to: email,
      subject: `Invoice ${invoice.invoice_number} from BuildLedger`,
      invoiceNumber: invoice.invoice_number,
      amount: invoice.total_amount,
      currency: invoice.currency || 'USD',
      pdfBuffer,
      clientName: invoice.clients?.name,
      dueDate: invoice.due_date
    });

    // Update invoice to mark as sent
    const { error: updateError } = await supabase
      .from('invoices')
      .update({ 
        sent_at: new Date().toISOString(),
        sent_to: email
      })
      .eq('id', invoiceId)
      .eq('user_id', user.id); // Double-check ownership

    if (updateError) {
      console.error('Error updating invoice:', updateError);
      return NextResponse.json(
        { error: 'Failed to update invoice status' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Invoice sent successfully' 
    });

  } catch (error) {
    console.error('Error sending invoice:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateInvoicePDF(invoice: any): Promise<Buffer> {
  // This is a placeholder - you&apos;ll need to implement actual PDF generation
  // You can use libraries like puppeteer, jsPDF, or @react-pdf/renderer
  
  // For now, return a simple text buffer
  const invoiceText = `
Invoice ${invoice.invoice_number}
Amount: ${invoice.currency || 'USD'} ${invoice.total_amount}
Date: ${invoice.created_at}
  `;
  
  return Buffer.from(invoiceText, 'utf-8');
}