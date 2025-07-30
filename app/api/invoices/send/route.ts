import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sendInvoiceEmail } from '@/lib/resend'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getInvoice } from '@/lib/db/invoices'

// Zod schema for request validation
const sendInvoiceSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID format'),
  email: z.string().email('Invalid email format')
})

export async function POST(req: NextRequest) {
  try {
    // Parse and validate request body
    const body = await req.json()
    const validationResult = sendInvoiceSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { invoiceId, email } = validationResult.data

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

    // Generate PDF (you'll need to implement this based on your PDF generation library)
    // For now, we'll create a simple PDF buffer
    const pdfBuffer = await generateInvoicePDF(invoice)

    // Send email
    await sendInvoiceEmail({
      to: email,
      subject: `Invoice ${invoice.number} from BuildLedger`,
      invoiceNumber: invoice.number,
      amount: invoice.total,
      currency: 'USD', // You might want to make this configurable
      pdfBuffer,
      clientName: invoice.client_name,
      dueDate: invoice.due_date
    })

    // Update invoice to mark as sent
    const { error: updateError } = await supabase
      .from('invoices')
      .update({ 
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_to: email,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error updating invoice:', updateError)
      return NextResponse.json(
        { error: 'Failed to update invoice status' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Invoice sent successfully' 
    })

  } catch (error) {
    console.error('Error sending invoice:', error)
    return NextResponse.json(
      { error: 'Failed to send invoice' },
      { status: 500 }
    )
  }
}

async function generateInvoicePDF(invoice: any): Promise<Buffer> {
  // This is a placeholder - you'll need to implement actual PDF generation
  // You can use libraries like puppeteer, jsPDF, or @react-pdf/renderer
  
  // For now, return a simple text buffer
  const invoiceText = `
Invoice ${invoice.number}
Amount: USD ${invoice.total}
Date: ${invoice.invoice_date}
  `
  
  return Buffer.from(invoiceText, 'utf-8')
}