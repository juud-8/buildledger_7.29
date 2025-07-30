import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { renderToBuffer } from '@react-pdf/renderer'
import { generateQuotePDF } from '@/lib/pdf-generator'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getQuote } from '@/lib/db/quotes'
import { logger } from '@/lib/logger'

// Zod schema for query validation
const QuoteIdSchema = z.object({
  id: z.string().uuid("Invalid quote ID format"),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    // Validate query parameter
    const parsed = QuoteIdSchema.safeParse({ id })

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: parsed.error.errors,
        },
        { status: 400 }
      )
    }

    const { id: quoteId } = parsed.data

    // Create Supabase server client
    const supabase = await createSupabaseServerClient()

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch quote data with items
    const quote = await getQuote(quoteId, user)
    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    // Fetch quote items
    const { data: items, error: itemsError } = await supabase
      .from('quote_items')
      .select('*')
      .eq('quote_id', quoteId)
      .order('created_at')

    if (itemsError) {
      logger.error('Error fetching quote items', { error: itemsError, quoteId })
      return NextResponse.json({ error: 'Failed to fetch quote items' }, { status: 500 })
    }

    // Prepare data for PDF generation
    const pdfData = {
      number: quote.number,
      client_name: quote.client_name,
      client_email: quote.client_email,
      date: quote.quote_date,
      expiry_date: quote.expiry_date,
      items: items || [],
      subtotal: quote.subtotal,
      tax_rate: quote.tax_rate,
      tax_amount: quote.tax_amount,
      total: quote.total,
      notes: quote.notes,
      terms_and_conditions: quote.terms_and_conditions,
    }

    // Generate PDF buffer
    const pdfBuffer = await renderToBuffer(generateQuotePDF(pdfData))

    // Upload to Supabase Storage
    const fileName = `quotes/${quoteId}.pdf`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('docs')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      logger.error('Error uploading PDF', { error: uploadError, quoteId })
      return NextResponse.json({ error: 'Failed to upload PDF' }, { status: 500 })
    }

    // Get signed URL for the uploaded file
    const { data: signedUrlData } = await supabase.storage
      .from('docs')
      .createSignedUrl(fileName, 60 * 60 * 24 * 7) // 7 days expiry

    // Update quote with PDF URL
    const { error: updateError } = await supabase
      .from('quotes')
      .update({ 
        pdf_url: signedUrlData?.signedUrl || fileName,
        updated_at: new Date().toISOString()
      })
      .eq('id', quoteId)

    if (updateError) {
      logger.error('Error updating quote with PDF URL', { error: updateError, quoteId })
      // Don't fail the request if this fails, just log it
    }

    return NextResponse.json({ 
      success: true, 
      pdf_url: signedUrlData?.signedUrl || fileName,
      message: 'PDF generated and uploaded successfully' 
    })

  } catch (error) {
    logger.error('Error generating quote PDF', { error })
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}