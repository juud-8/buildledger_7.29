import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { generateQuotePDF } from '@/lib/pdf-generator'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getQuote } from '@/lib/db/quotes'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Quote ID is required' }, { status: 400 })
    }

    // Create Supabase server client
    const supabase = await createSupabaseServerClient()

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch quote data with items
    const quote = await getQuote(id, user)
    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    // Fetch quote items
    const { data: items, error: itemsError } = await supabase
      .from('quote_items')
      .select('*')
      .eq('quote_id', id)
      .order('created_at')

    if (itemsError) {
      console.error('Error fetching quote items:', itemsError)
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
    const fileName = `quotes/${id}.pdf`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('docs')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      console.error('Error uploading PDF:', uploadError)
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
      .eq('id', id)

    if (updateError) {
      console.error('Error updating quote with PDF URL:', updateError)
      // Don't fail the request if this fails, just log it
    }

    return NextResponse.json({ 
      success: true, 
      pdf_url: signedUrlData?.signedUrl || fileName,
      message: 'PDF generated and uploaded successfully' 
    })

  } catch (error) {
    console.error('Error generating quote PDF:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}