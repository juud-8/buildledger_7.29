-- Add stripe_payment_link column to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS stripe_payment_link TEXT;

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('stripe', 'zelle', 'venmo', 'paypal', 'cashapp', 'cash')),
  external_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_external_id ON payments(external_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payments_updated_at 
    BEFORE UPDATE ON payments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to recalculate invoice balance_due when payments are inserted/updated
CREATE OR REPLACE FUNCTION recalculate_invoice_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the invoice balance_due
    UPDATE invoices 
    SET balance_due = (
        SELECT total - COALESCE(SUM(amount), 0)
        FROM payments 
        WHERE invoice_id = NEW.invoice_id 
        AND status = 'completed'
    )
    WHERE id = NEW.invoice_id;
    
    -- Update invoice status based on balance_due
    UPDATE invoices 
    SET status = CASE 
        WHEN balance_due <= 0 THEN 'paid'
        WHEN balance_due < total THEN 'partial'
        ELSE status
    END
    WHERE id = NEW.invoice_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_recalculate_invoice_balance
    AFTER INSERT OR UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_invoice_balance();