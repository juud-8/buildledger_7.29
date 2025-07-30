import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createPaymentLink } from "@/lib/stripe";
import { getInvoice } from "@/lib/db/invoices";
import { logger } from "@/lib/logger";

// Zod schema for request validation
const paymentLinkSchema = z.object({
  invoiceId: z.string().uuid("Invalid invoice ID format"),
});

export async function POST(req: NextRequest) {
  try {
    // Parse and validate request body
    const body = await req.json();
    const parsed = paymentLinkSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: parsed.error.errors,
        },
        { status: 400 }
      );
    }

    const { invoiceId } = parsed.data;

    // Authenticated Supabase client
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ownership-checked fetch (centralized in lib/db/invoices)
    const invoice = await getInvoice(invoiceId, user);
    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found or access denied" },
        { status: 404 }
      );
    }

    // Guard: already paid
    if (invoice.status === "paid") {
      return NextResponse.json(
        { error: "Invoice is already paid" },
        { status: 400 }
      );
    }

    // Create payment link
    const paymentLink = await createPaymentLink({
      invoiceId: invoice.id,
      amount: invoice.total_amount,
      currency: invoice.currency || "USD",
      description: `Invoice ${invoice.invoice_number}`,
      customerEmail: invoice.clients?.email,
    });

    // Update invoice with payment link
    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        stripe_session_id: paymentLink.sessionId,
        stripe_payment_link: paymentLink.url,
      })
      .eq("id", invoiceId)
      .eq("user_id", user.id); // Double-check ownership

    if (updateError) {
      logger.error("Error updating invoice with payment link", { error: updateError, invoiceId });
      return NextResponse.json(
        { error: "Failed to update invoice with payment link" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      paymentUrl: paymentLink.url,
      sessionId: paymentLink.sessionId,
    });
  } catch (error) {
    logger.error("Error creating payment link", { error, invoiceId });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}