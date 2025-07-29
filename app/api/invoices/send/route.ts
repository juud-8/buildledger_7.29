import { NextRequest, NextResponse } from 'next/server';
import { sendInvoiceEmail } from '@/lib/resend';
import { createSupabaseApiClient } from '@/lib/supabase/api';

export async function POST(req: NextRequest) {
  try {
    const { invoiceId, email } = await req.json();

    if (!invoiceId || !email) {
      return NextResponse.json(
        { error: 'Invoice ID and email are required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseApiClient();

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

    // Generate PDF (you'll need to implement this based on your PDF generation library)
    // For now, we'll create a simple PDF buffer
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
    await supabase
      .from('invoices')
      .update({ 
        sent_at: new Date().toISOString(),
        sent_to: email
      })
      .eq('id', invoiceId);

    return NextResponse.json({ 
      success: true, 
      message: 'Invoice sent successfully' 
    });

  } catch (error) {
    console.error('Error sending invoice:', error);
    return NextResponse.json(
      { error: 'Failed to send invoice' },
      { status: 500 }
    );
  }
}

async function generateInvoicePDF(invoice: any): Promise<Buffer> {
  // This is a placeholder - you'll need to implement actual PDF generation
  // You can use libraries like puppeteer, jsPDF, or @react-pdf/renderer
  
  // For now, return a simple text buffer
  const invoiceText = `
Invoice ${invoice.invoice_number}
Amount: ${invoice.currency || 'USD'} ${invoice.total_amount}
Date: ${invoice.created_at}
  `;
  
  return Buffer.from(invoiceText, 'utf-8');
}