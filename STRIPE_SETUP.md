# Stripe Payment Integration Setup

This guide will help you set up Stripe payments for your invoice application.

## Prerequisites

1. A Stripe account (sign up at https://stripe.com)
2. Your application already set up with Supabase

## Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Database Setup

Run the following SQL commands in your Supabase SQL editor to create the required tables and triggers:

```sql
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
```

## Stripe Dashboard Setup

### 1. Get Your API Keys

1. Go to your [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to Developers > API keys
3. Copy your **Publishable key** and **Secret key**
4. Add the secret key to your environment variables as `STRIPE_SECRET_KEY`

### 2. Set Up Webhooks

1. In your Stripe Dashboard, go to Developers > Webhooks
2. Click "Add endpoint"
3. Set the endpoint URL to: `https://yourdomain.com/api/stripe/webhook`
4. Select the following events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Click "Add endpoint"
6. Copy the webhook signing secret and add it to your environment variables as `STRIPE_WEBHOOK_SECRET`

### 3. Test Mode vs Live Mode

- For development, use test mode (keys starting with `sk_test_`)
- For production, use live mode (keys starting with `sk_live_`)

## Features Implemented

### 1. Payment Link Creation
- API endpoint: `/api/payments/create-link`
- Creates Stripe Payment Links for invoices
- Stores payment link in invoice record

### 2. Webhook Processing
- API endpoint: `/api/stripe/webhook`
- Processes payment events from Stripe
- Updates invoice status and balance automatically
- Creates payment records in database

### 3. UI Integration
- "Pay" button in invoices list (only shows for unpaid invoices)
- Payment section in invoice detail page
- Payment history display
- Success notifications after payment completion

### 4. Database Integration
- Payments table to track all payment transactions
- Automatic balance recalculation via database triggers
- Invoice status updates based on payment status

## Testing

### Test Cards (Test Mode Only)
Use these test card numbers in Stripe test mode:

- **Successful payment**: `4242 4242 4242 4242`
- **Declined payment**: `4000 0000 0000 0002`
- **Requires authentication**: `4000 0025 0000 3155`

### Test the Integration

1. Create an invoice in your application
2. Click the "Pay" button
3. Complete a test payment using one of the test cards above
4. Verify that the invoice status updates to "paid"
5. Check the payment history in the invoice detail page

## Security Considerations

1. **Never expose your secret key** in client-side code
2. **Always verify webhook signatures** (implemented in the webhook handler)
3. **Use HTTPS** in production for webhook endpoints
4. **Validate payment amounts** server-side before processing
5. **Handle webhook idempotency** (implemented to prevent duplicate processing)

## Troubleshooting

### Common Issues

1. **Webhook not receiving events**: Check your webhook endpoint URL and ensure it's publicly accessible
2. **Payment link not working**: Verify your Stripe secret key is correct
3. **Database errors**: Ensure you've run the database migration scripts
4. **Environment variables**: Double-check that all required environment variables are set

### Debug Mode

To enable debug logging, add this to your environment variables:
```bash
DEBUG=stripe:*
```

## Support

For Stripe-specific issues, refer to the [Stripe Documentation](https://stripe.com/docs).
For application-specific issues, check the application logs and database for error messages.