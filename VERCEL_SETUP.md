# Vercel Setup Guide for BuildLedger

## Prerequisites
- Vercel account
- Supabase project
- Stripe account
- Resend account
- Namecheap domain (buildledger.pro)

## Step 1: Create Vercel Project

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your GitHub repository or connect your local project
4. Configure the project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

## Step 2: Set Environment Variables

In your Vercel project dashboard, go to Settings → Environment Variables and add:

### Required Variables:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
RESEND_API_KEY=your_resend_api_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=will_be_set_after_webhook_creation
NEXT_PUBLIC_APP_URL=https://buildledger.pro
```

### How to get these values:

#### Supabase:
1. Go to your Supabase project dashboard
2. Settings → API
3. Copy Project URL and anon/public key

#### Resend:
1. Go to [resend.com](https://resend.com)
2. API Keys → Create API Key
3. Copy the API key

#### Stripe:
1. Go to [stripe.com](https://stripe.com) dashboard
2. Developers → API Keys
3. Copy Secret key (starts with `sk_`)

## Step 3: Connect Domain

1. In Vercel dashboard, go to Settings → Domains
2. Add domain: `buildledger.pro`
3. Vercel will provide DNS records to configure

## Step 4: Configure DNS at Namecheap

1. Log into Namecheap
2. Go to Domain List → buildledger.pro → Manage
3. Advanced DNS
4. Add these records (Vercel will provide exact values):
   - Type: A, Name: @, Value: 76.76.19.36
   - Type: CNAME, Name: www, Value: cname.vercel-dns.com

## Step 5: Set Up Stripe Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://buildledger.pro/api/stripe/webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Click "Add endpoint"
6. Copy the "Signing secret" (starts with `whsec_`)
7. Add this to Vercel environment variables as `STRIPE_WEBHOOK_SECRET`

## Step 6: Deploy and Test

1. Push your code to trigger a new deployment
2. Wait for SSL certificate to be issued (can take up to 24 hours)

## Step 7: Smoke Testing

Test the following flows:

### 1. Login Flow
- Navigate to https://buildledger.pro
- Test user authentication
- Verify login/logout works

### 2. Create Client, Quote, Invoice
- Create a new client
- Create a quote for the client
- Convert quote to invoice
- Verify all data is saved correctly

### 3. Generate and Send PDF
- Generate PDF invoice
- Send via email using Resend
- Check Resend dashboard for email logs
- Verify email delivery

### 4. Create Payment Link and Complete Test Payment
- Create Stripe payment link for invoice
- Complete test payment using Stripe test card:
  - Success: 4242 4242 4242 4242
  - Decline: 4000 0000 0000 0002
- Verify payment flow works

### 5. Verify Webhook Processing
- Check that webhook marks invoice as paid
- Verify payment record is inserted into database
- Confirm invoice status updates correctly

## Troubleshooting

### Common Issues:

1. **Environment Variables Not Working**
   - Ensure variables are set for Production environment
   - Redeploy after adding variables

2. **Webhook Not Receiving Events**
   - Check webhook endpoint URL is correct
   - Verify webhook secret is set correctly
   - Check Vercel function logs for errors

3. **Domain Not Working**
   - Verify DNS records are correct
   - Wait for DNS propagation (can take 24-48 hours)
   - Check SSL certificate status in Vercel

4. **PDF Generation Issues**
   - Check Resend API key is valid
   - Verify email sending permissions
   - Check function logs for errors

### Useful Commands:

```bash
# Check deployment status
vercel ls

# View function logs
vercel logs

# Redeploy
vercel --prod
```

## Database Schema Requirements

Ensure your Supabase database has these tables:

### invoices table:
- id (uuid, primary key)
- invoice_number (text)
- total_amount (numeric)
- currency (text, default 'USD')
- status (text, default 'draft')
- stripe_session_id (text, nullable)
- payment_link (text, nullable)
- sent_at (timestamp, nullable)
- sent_to (text, nullable)
- paid_at (timestamp, nullable)

### payments table:
- id (uuid, primary key)
- invoice_id (uuid, foreign key to invoices.id)
- amount (numeric)
- currency (text)
- stripe_payment_intent_id (text)
- stripe_session_id (text)
- payment_method (text)
- status (text)

### clients table:
- id (uuid, primary key)
- name (text)
- email (text)

## Security Notes

- Never commit environment variables to git
- Use Vercel's environment variable encryption
- Regularly rotate API keys
- Monitor webhook events for suspicious activity
- Use Stripe's test mode for development