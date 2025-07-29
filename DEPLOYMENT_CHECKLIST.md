# 🚀 BuildLedger Deployment Checklist

## Pre-Deployment
- [ ] Install dependencies: `npm install`
- [ ] Test locally: `npm run dev`
- [ ] Build locally: `npm run build`

## Vercel Setup
- [ ] Create Vercel account
- [ ] Import project to Vercel
- [ ] Configure as Next.js project

## Environment Variables (Vercel Dashboard)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `RESEND_API_KEY`
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET` (set after webhook creation)
- [ ] `NEXT_PUBLIC_APP_URL=https://buildledger.pro`

## Domain Setup
- [ ] Add domain `buildledger.pro` in Vercel
- [ ] Configure DNS at Namecheap:
  - [ ] A record: @ → 76.76.19.36
  - [ ] CNAME record: www → cname.vercel-dns.com
- [ ] Wait for SSL certificate (up to 24 hours)

## Stripe Webhook Setup
- [ ] Go to Stripe Dashboard → Developers → Webhooks
- [ ] Add endpoint: `https://buildledger.pro/api/stripe/webhook`
- [ ] Select events:
  - [ ] `checkout.session.completed`
  - [ ] `payment_intent.succeeded`
  - [ ] `payment_intent.payment_failed`
- [ ] Copy webhook signing secret
- [ ] Add to Vercel env vars as `STRIPE_WEBHOOK_SECRET`

## Database Setup (Supabase)
- [ ] Ensure tables exist:
  - [ ] `clients` (id, name, email)
  - [ ] `invoices` (id, invoice_number, total_amount, currency, status, stripe_session_id, payment_link, sent_at, sent_to, paid_at)
  - [ ] `payments` (id, invoice_id, amount, currency, stripe_payment_intent_id, stripe_session_id, payment_method, status)

## Testing
- [ ] Run setup test: `npm run test-setup`
- [ ] Deploy to Vercel
- [ ] Run smoke test: `npm run smoke-test`
- [ ] Manual testing:
  - [ ] Login flow
  - [ ] Create client
  - [ ] Create quote → invoice
  - [ ] Send PDF invoice
  - [ ] Create payment link
  - [ ] Complete test payment
  - [ ] Verify webhook processing

## Post-Deployment
- [ ] Monitor Vercel function logs
- [ ] Check Stripe webhook events
- [ ] Verify Resend email delivery
- [ ] Test with real payment (optional)

## Troubleshooting
- [ ] Check Vercel function logs for errors
- [ ] Verify environment variables are set correctly
- [ ] Test webhook endpoint manually
- [ ] Check DNS propagation status
- [ ] Verify SSL certificate is active

## Security
- [ ] Use Stripe test mode for development
- [ ] Rotate API keys regularly
- [ ] Monitor webhook events
- [ ] Set up error monitoring