import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { renderToBuffer } from '@react-pdf/renderer'
import { generateInvoicePDF } from '@/lib/pdf-generator'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getInvoice } from '@/lib/db/invoices'
import { logger } from '@/lib/logger'

// Zod schema for query validation
const InvoiceIdSchema = z.object({
  id: z.string().uuid("Invalid invoice ID format"),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    // Validate query parameter
    const parsed = InvoiceIdSchema.safeParse({ id })

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: parsed.error.errors,
        },
        { status: 400 }
      )
    }

    const { id: invoiceId } = parsed.data

    // Create Supabase server client
    const supabase = await createSupabaseServerClient()

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch invoice data with items
    const invoice = await getInvoice(invoiceId, user)
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Fetch invoice items
    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('created_at')

    if (itemsError) {
      logger.error('Error fetching invoice items', { error: itemsError, invoiceId })
      return NextResponse.json({ error: 'Failed to fetch invoice items' }, { status: 500 })
    }

    // Prepare data for PDF generation
    const pdfData = {
      number: invoice.number,
      client_name: invoice.client_name,
      client_email: invoice.client_email,
      date: invoice.invoice_date,
      due_date: invoice.due_date,
      items: items || [],
      subtotal: invoice.subtotal,
      tax_rate: invoice.tax_rate,
      tax_amount: invoice.tax_amount,
      total: invoice.total,
      notes: invoice.notes,
    }

    // Generate PDF buffer
    const pdfBuffer = await renderToBuffer(generateInvoicePDF(pdfData))

    // Upload to Supabase Storage
    const fileName = `invoices/${invoiceId}.pdf`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('docs')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      logger.error('Error uploading PDF', { error: uploadError, invoiceId })
      return NextResponse.json({ error: 'Failed to upload PDF' }, { status: 500 })
    }

    // Get signed URL for the uploaded file
    const { data: signedUrlData } = await supabase.storage
      .from('docs')
      .createSignedUrl(fileName, 60 * 60 * 24 * 7) // 7 days expiry

    // Update invoice with PDF URL
    const { error: updateError } = await supabase
      .from('invoices')
      .update({ 
        pdf_url: signedUrlData?.signedUrl || fileName,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId)

    if (updateError) {
      logger.error('Error updating invoice with PDF URL', { error: updateError, invoiceId })
      // Don't fail the request if this fails, just log it
    }

    return NextResponse.json({ 
      success: true, 
      pdf_url: signedUrlData?.signedUrl || fileName,
      message: 'PDF generated and uploaded successfully' 
    })

  } catch (error) {
    logger.error('Error generating invoice PDF', { error })
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}