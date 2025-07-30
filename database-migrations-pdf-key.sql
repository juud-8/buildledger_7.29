-- Add pdf_key column to invoices table for storing storage key with user ID prefix
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pdf_key TEXT;

-- Add pdf_key column to quotes table for storing storage key with user ID prefix
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS pdf_key TEXT;

-- Create indexes for better performance on pdf_key lookups
CREATE INDEX IF NOT EXISTS idx_invoices_pdf_key ON invoices(pdf_key);
CREATE INDEX IF NOT EXISTS idx_quotes_pdf_key ON quotes(pdf_key);