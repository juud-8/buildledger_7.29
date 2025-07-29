import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export interface CreatePaymentLinkParams {
  invoiceId: string;
  amount: number;
  currency: string;
  description: string;
  customerEmail?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export async function createPaymentLink({
  invoiceId,
  amount,
  currency,
  description,
  customerEmail,
  successUrl,
  cancelUrl
}: CreatePaymentLinkParams) {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: description,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/invoices/${invoiceId}?success=true`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/invoices/${invoiceId}?canceled=true`,
      metadata: {
        invoiceId: invoiceId,
      },
      customer_email: customerEmail,
    });

    return {
      url: session.url,
      sessionId: session.id,
    };
  } catch (error) {
    console.error('Error creating payment link:', error);
    throw error;
  }
}

export async function getPaymentSession(sessionId: string) {
  try {
    return await stripe.checkout.sessions.retrieve(sessionId);
  } catch (error) {
    console.error('Error retrieving payment session:', error);
    throw error;
  }
}

export async function createCustomer(email: string, name?: string) {
  try {
    return await stripe.customers.create({
      email,
      name,
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    throw error;
  }
}

export { stripe };