#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

async function smokeTest() {
  console.log('🚀 Running BuildLedger Smoke Tests...\n');

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://buildledger.pro';

  // Test 1: Check if the app is accessible
  console.log('1️⃣ Testing App Accessibility:');
  try {
    const response = await fetch(baseUrl);
    if (response.ok) {
      console.log('✅ App is accessible');
    } else {
      console.log(`❌ App returned status: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ App accessibility failed: ${error.message}`);
  }
  console.log('');

  // Test 2: Check API endpoints
  console.log('2️⃣ Testing API Endpoints:');
  
  const endpoints = [
    '/api/stripe/webhook',
    '/api/invoices/send',
    '/api/invoices/payment-link'
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true })
      });
      
      if (response.status === 400 || response.status === 404) {
        console.log(`✅ ${endpoint}: Accessible (${response.status} expected)`);
      } else {
        console.log(`⚠️ ${endpoint}: Responded with ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint}: Failed - ${error.message}`);
    }
  }
  console.log('');

  // Test 3: Check Supabase connection
  console.log('3️⃣ Testing Database Connection:');
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    // Test basic queries
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id')
      .limit(1);
    
    if (clientsError) {
      console.log(`❌ Clients table: ${clientsError.message}`);
    } else {
      console.log('✅ Clients table: Accessible');
    }

    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('id')
      .limit(1);
    
    if (invoicesError) {
      console.log(`❌ Invoices table: ${invoicesError.message}`);
    } else {
      console.log('✅ Invoices table: Accessible');
    }

    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('id')
      .limit(1);
    
    if (paymentsError) {
      console.log(`❌ Payments table: ${paymentsError.message}`);
    } else {
      console.log('✅ Payments table: Accessible');
    }

  } catch (error) {
    console.log(`❌ Database connection failed: ${error.message}`);
  }
  console.log('');

  // Test 4: Check SSL certificate
  console.log('4️⃣ Testing SSL Certificate:');
  try {
    const httpsResponse = await fetch(`https://${baseUrl.replace('https://', '')}`);
    if (httpsResponse.ok) {
      console.log('✅ SSL certificate is valid');
    } else {
      console.log(`⚠️ SSL certificate issue: ${httpsResponse.status}`);
    }
  } catch (error) {
    console.log(`❌ SSL certificate failed: ${error.message}`);
  }
  console.log('');

  console.log('🎯 Smoke Test Summary:');
  console.log('If all tests pass, your deployment is ready!');
  console.log('\nManual tests to perform:');
  console.log('1. Login to the application');
  console.log('2. Create a new client');
  console.log('3. Create a quote and convert to invoice');
  console.log('4. Generate and send PDF invoice');
  console.log('5. Create payment link and complete test payment');
  console.log('6. Verify webhook updates invoice status');
}

smokeTest().catch(console.error);