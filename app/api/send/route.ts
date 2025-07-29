import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getQuote } from '@/lib/db/quotes'
import { getInvoice } from '@/lib/db/invoices'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, id } = body

    if (!type || !id) {
      return NextResponse.json({ error: 'Type and ID are required' }, { status: 400 })
    }

    if (!['quote', 'invoice'].includes(type)) {
      return NextResponse.json({ error: 'Type must be "quote" or "invoice"' }, { status: 400 })
    }

    // Create Supabase server client
    const supabase = await createSupabaseServerClient()

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let record: any
    let pdfUrl: string | null = null

    // Fetch the record based on type
    if (type === 'quote') {
      record = await getQuote(id, user)
      if (!record) {
        return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
      }
      pdfUrl = record.pdf_url
    } else {
      record = await getInvoice(id, user)
      if (!record) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
      }
      pdfUrl = record.pdf_url
    }

    // If no PDF URL exists, generate one first
    if (!pdfUrl) {
      const pdfResponse = await fetch(`${request.nextUrl.origin}/api/pdf/${type}?id=${id}`, {
        method: 'GET',
        headers: {
          'Cookie': request.headers.get('cookie') || '',
        },
      })

      if (!pdfResponse.ok) {
        return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
      }

      const pdfData = await pdfResponse.json()
      pdfUrl = pdfData.pdf_url
    }

    // Compose email content
    const subject = type === 'quote' 
      ? `Quote #${record.number} from ${user.email}`
      : `Invoice #${record.number} from ${user.email}`

    const total = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(record.total)

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${type === 'quote' ? 'Quote' : 'Invoice'} #${record.number}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h1 style="color: #2c3e50; margin: 0 0 10px 0;">${type === 'quote' ? 'Quote' : 'Invoice'} #${record.number}</h1>
            <p style="margin: 0; color: #6c757d;">Generated on ${new Date(type === 'quote' ? record.quote_date : record.invoice_date).toLocaleDateString()}</p>
          </div>
          
          <div style="margin-bottom: 20px;">
            <h2 style="color: #2c3e50; margin-bottom: 10px;">Client Information</h2>
            <p><strong>Name:</strong> ${record.client_name}</p>
            <p><strong>Email:</strong> ${record.client_email}</p>
            ${type === 'quote' && record.expiry_date ? `<p><strong>Expiry Date:</strong> ${new Date(record.expiry_date).toLocaleDateString()}</p>` : ''}
            ${type === 'invoice' && record.due_date ? `<p><strong>Due Date:</strong> ${new Date(record.due_date).toLocaleDateString()}</p>` : ''}
          </div>
          
          <div style="margin-bottom: 20px;">
            <h2 style="color: #2c3e50; margin-bottom: 10px;">Summary</h2>
            <p><strong>Subtotal:</strong> $${record.subtotal.toFixed(2)}</p>
            <p><strong>Tax (${record.tax_rate}%):</strong> $${record.tax_amount.toFixed(2)}</p>
            <p><strong>Total:</strong> ${total}</p>
          </div>
          
          ${record.notes ? `
            <div style="margin-bottom: 20px;">
              <h2 style="color: #2c3e50; margin-bottom: 10px;">Notes</h2>
              <p style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 0;">${record.notes}</p>
            </div>
          ` : ''}
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${pdfUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View ${type === 'quote' ? 'Quote' : 'Invoice'} PDF
            </a>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 14px;">
            <p>This ${type === 'quote' ? 'quote' : 'invoice'} was generated by ${user.email}.</p>
            <p>If you have any questions, please contact us directly.</p>
          </div>
        </body>
      </html>
    `

    // Send email via Resend
    if (!resend) {
      return NextResponse.json({ error: 'Resend API key not configured' }, { status: 500 })
    }

    const { data, error } = await resend.emails.send({
      from: user.email || 'noreply@yourdomain.com',
      to: record.client_email,
      subject: subject,
      html: htmlContent,
    })

    if (error) {
      console.error('Error sending email:', error)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    // Update record status to 'sent'
    const statusField = type === 'quote' ? 'quotes' : 'invoices'
    const { error: updateError } = await supabase
      .from(statusField)
      .update({ 
        status: 'sent',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error updating status:', updateError)
      // Don't fail the request if this fails, just log it
    }

    return NextResponse.json({ 
      success: true, 
      message: `${type === 'quote' ? 'Quote' : 'Invoice'} sent successfully`,
      email_id: data?.id 
    })

  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}