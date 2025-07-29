#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');
const { Resend } = require('resend');

async function testSetup() {
  console.log('🔍 Testing BuildLedger Setup...\n');

  // Test environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'RESEND_API_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'NEXT_PUBLIC_APP_URL'
  ];

  console.log('📋 Checking Environment Variables:');
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      console.log(`✅ ${envVar}: Set`);
    } else {
      console.log(`❌ ${envVar}: Missing`);
    }
  }
  console.log('');

  // Test Supabase connection
  console.log('🗄️ Testing Supabase Connection:');
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    const { data, error } = await supabase.from('invoices').select('count').limit(1);
    if (error) {
      console.log(`❌ Supabase Error: ${error.message}`);
    } else {
      console.log('✅ Supabase: Connected successfully');
    }
  } catch (error) {
    console.log(`❌ Supabase Connection Failed: ${error.message}`);
  }
  console.log('');

  // Test Stripe connection
  console.log('💳 Testing Stripe Connection:');
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
    });
    
    const account = await stripe.accounts.retrieve();
    console.log(`✅ Stripe: Connected (Account: ${account.id})`);
  } catch (error) {
    console.log(`❌ Stripe Connection Failed: ${error.message}`);
  }
  console.log('');

  // Test Resend connection
  console.log('📧 Testing Resend Connection:');
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    // Test API key by trying to list domains
    const { data, error } = await resend.domains.list();
    if (error) {
      console.log(`❌ Resend Error: ${error.message}`);
    } else {
      console.log('✅ Resend: Connected successfully');
    }
  } catch (error) {
    console.log(`❌ Resend Connection Failed: ${error.message}`);
  }
  console.log('');

  // Test webhook endpoint
  console.log('🔗 Testing Webhook Endpoint:');
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ test: true }),
    });
    
    if (response.status === 400) {
      console.log('✅ Webhook Endpoint: Accessible (400 expected for invalid signature)');
    } else {
      console.log(`⚠️ Webhook Endpoint: Responded with ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Webhook Endpoint Failed: ${error.message}`);
  }
  console.log('');

  console.log('🎉 Setup test completed!');
  console.log('\nNext steps:');
  console.log('1. Deploy to Vercel');
  console.log('2. Set up Stripe webhook');
  console.log('3. Configure DNS for buildledger.pro');
  console.log('4. Run smoke tests');
}

testSetup().catch(console.error);