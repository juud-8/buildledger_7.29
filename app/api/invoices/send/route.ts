import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendInvoiceEmail } from "@/lib/resend";
import { getInvoice } from "@/lib/db/invoices";
import { generateInvoicePDF } from "@/lib/pdf-generator";

const SendInvoiceSchema = z.object({
  invoiceId: z.string().uuid("Invalid invoice ID format"),
  email: z.string().email("Invalid email format"),
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
    const { invoiceId, email } = parsed.data;

    // Auth
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ownership check via helper
    const invoice = await getInvoice(invoiceId, user);
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Reuse cached PDF if you already store `pdf_url` and attach by URL
    // If your email helper prefers a Buffer, (recommended) generate once here:
    const pdfBuffer = await generateInvoicePDF({
      number: invoice.number,
      client_name: invoice.client_name,
      client_email: invoice.client_email,
      date: invoice.invoice_date,
      due_date: invoice.due_date,
      items: invoice.items,
      subtotal: invoice.subtotal,
      tax_rate: invoice.tax_rate,
      tax_amount: invoice.tax_amount,
      total: invoice.total,
      notes: invoice.notes,
    });

    // Send email
    await sendInvoiceEmail({
      to: email,
      subject: `Invoice ${invoice.number} from BuildLedger`,
      invoiceNumber: invoice.number,
      amount: invoice.total,
      currency: "USD",
      pdfBuffer, // your resend util should accept Buffer
      clientName: invoice.client_name,
      dueDate: invoice.due_date,
    });

    // Mark as sent
    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        sent_to: email,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId)
      .eq("user_id", user.id);
    if (updateError) {
      console.error("Error updating invoice:", updateError);
      return NextResponse.json({ error: "Failed to update invoice status" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Invoice sent successfully" });
  } catch (error) {
    console.error("Error sending invoice:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
