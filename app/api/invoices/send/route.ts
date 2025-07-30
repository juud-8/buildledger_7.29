import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendInvoiceEmail } from "@/lib/resend";
import { getInvoice } from "@/lib/db/invoices";
import { generateInvoicePDF } from "@/lib/pdf-generator";
import { logger } from "@/lib/logger";

const SendInvoiceSchema = z.object({
  type: z.enum(["invoice", "quote"]),
  id: z.string().uuid("Invalid ID format"),
  to: z.string().email("Invalid email format"),
  subject: z.string().min(3).max(140),
  message: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    // Validate input
    const body = await req.json();
    const parsed = SendInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: parsed.error.errors },
        { status: 400 },
      );
    }
    const { type, id, to, subject, message } = parsed.data;

    // Auth
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ownership check via helper based on type
    let record;
    if (type === "invoice") {
      record = await getInvoice(id, user);
    } else {
      // Import and use getQuote for quotes
      const { getQuote } = await import("@/lib/db/quotes");
      record = await getQuote(id, user);
    }
    
    if (!record) {
      return NextResponse.json({ error: `${type} not found` }, { status: 404 });
    }

    // Check if PDF URL exists, generate if missing
    let pdfBuffer;
    if (!record.pdf_url) {
      if (type === "invoice") {
        pdfBuffer = await generateInvoicePDF({
          number: record.number,
          client_name: record.client_name,
          client_email: record.client_email,
          date: record.invoice_date,
          due_date: record.due_date,
          items: record.items,
          subtotal: record.subtotal,
          tax_rate: record.tax_rate,
          tax_amount: record.tax_amount,
          total: record.total,
          notes: record.notes,
        });
      } else {
        const { generateQuotePDF } = await import("@/lib/pdf-generator");
        pdfBuffer = await generateQuotePDF({
          number: record.number,
          client_name: record.client_name,
          client_email: record.client_email,
          date: record.quote_date,
          expiry_date: record.expiry_date,
          items: record.items,
          subtotal: record.subtotal,
          tax_rate: record.tax_rate,
          tax_amount: record.tax_amount,
          total: record.total,
          notes: record.notes,
          terms_and_conditions: record.terms_and_conditions,
        });
      }
      
      // Upload and persist PDF URL
      const fileName = `${type}s/${id}.pdf`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('docs')
        .upload(fileName, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) {
        logger.error('Error uploading PDF', { error: uploadError, id, type });
        return NextResponse.json({ error: 'Failed to upload PDF' }, { status: 500 });
      }

      // Get signed URL
      const { data: signedUrlData } = await supabase.storage
        .from('docs')
        .createSignedUrl(fileName, 60 * 60 * 24 * 7); // 7 days expiry

      // Update record with PDF URL
      const tableName = type === "invoice" ? "invoices" : "quotes";
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ 
          pdf_url: signedUrlData?.signedUrl || fileName,
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .eq("user_id", user.id);

      if (updateError) {
        logger.error('Error updating record with PDF URL', { error: updateError, id, type });
      }
    }

    // Send email with Resend
    const { sendInvoiceEmail } = await import("@/lib/resend");
    await sendInvoiceEmail({
      to: to,
      subject: subject,
      message: message,
      from: "invoices@buildledger.com", // Replace with your domain
      replyTo: user.email,
      pdfUrl: record.pdf_url,
      recordType: type,
      recordNumber: record.number,
      amount: record.total,
      currency: record.currency || "USD",
      clientName: record.client_name,
      dueDate: type === "invoice" ? record.due_date : record.expiry_date,
    });

    // Mark as sent
    const tableName = type === "invoice" ? "invoices" : "quotes";
    const { error: updateError } = await supabase
      .from(tableName)
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        sent_to: to,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id);
    if (updateError) {
      logger.error("Error updating record status", { error: updateError, id, type });
      return NextResponse.json({ error: "Failed to update record status" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `${type} sent successfully` });
  } catch (error) {
    logger.error("Error sending record", { error, type });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
