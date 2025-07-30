import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function uploadPdfAndGetSignedUrl(userId: string, invoiceId: string, buffer: Buffer) {
  const supabase = createSupabaseServerClient();
  const key = `${userId}/invoice-${invoiceId}.pdf`;
  const { error: upErr } = await supabase.storage.from("pdfs").upload(key, buffer, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (upErr) throw new Error(`PDF upload failed: ${upErr.message}`);
  const { data: signed, error: urlErr } = await supabase.storage
    .from("pdfs")
    .createSignedUrl(key, 60 * 60); // 1 hour
  if (urlErr || !signed?.signedUrl) throw new Error(`Failed to create signed URL: ${urlErr?.message}`);
  return { key, signedUrl: signed.signedUrl };
}

export async function uploadLogoAndGetPublicUrl(userId: string, file: File | Blob) {
  const supabase = createSupabaseServerClient();
  const key = `${userId}/logo.png`;
  const { error: upErr } = await supabase.storage.from("logos").upload(key, file, {
    contentType: "image/png",
    upsert: true,
  });
  if (upErr) throw new Error(`Logo upload failed: ${upErr.message}`);
  const { data: pub } = await supabase.storage.from("logos").getPublicUrl(key);
  return { key, publicUrl: pub.publicUrl };
}