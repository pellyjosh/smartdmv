// src/lib/payments/providers/stripe.ts
// Stripe payment gateway implementation

/**
 * Stripe payment parameters
 */
export interface StripePaymentParams {
  secretKey: string;
  publicKey: string | null;
  amount: number; // In major currency unit (e.g., 10.50)
  currency: string;
  email: string;
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * Stripe payment response
 */
export interface StripePaymentResult {
  success: boolean;
  paymentId?: string;
  clientSecret?: string;
  error?: string;
}

/**
 * Create a Stripe payment intent
 * 
 * @param params - Payment parameters including API keys and amount
 * @returns Payment result with client secret for frontend
 */
export async function createStripePayment(
  params: StripePaymentParams
): Promise<StripePaymentResult> {
  try {
    // Dynamically import Stripe SDK
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(params.secretKey, {
      apiVersion: '2025-09-30.clover',
    });

    // Convert to smallest currency unit (cents)
    const amountInCents = convertToSmallestUnit(params.amount, params.currency);

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: params.currency.toLowerCase(),
      receipt_email: params.email,
      description: params.description,
      metadata: params.metadata,
      automatic_payment_methods: { enabled: true },
    });

    return {
      success: true,
      paymentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret || undefined,
    };
  } catch (error) {
    console.error('Stripe payment creation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Stripe payment failed',
    };
  }
}

/**
 * Verify a Stripe payment status
 * 
 * @param paymentId - Stripe payment intent ID
 * @param secretKey - Stripe secret key
 * @returns Payment verification result
 */
export async function verifyStripePayment(
  paymentId: string,
  secretKey: string
): Promise<{
  success: boolean;
  status: string;
  amount?: number;
  currency?: string;
  error?: string;
}> {
  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(secretKey, {
      apiVersion: '2025-09-30.clover',
    });

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentId);

    return {
      success: paymentIntent.status === 'succeeded',
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
    };
  } catch (error) {
    console.error('Stripe verification error:', error);
    return {
      success: false,
      status: 'error',
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

/**
 * Refund a Stripe payment
 * 
 * @param paymentId - Stripe payment intent ID
 * @param secretKey - Stripe secret key
 * @param amount - Optional partial refund amount
 * @returns Refund result
 */
export async function refundStripePayment(
  paymentId: string,
  secretKey: string,
  amount?: number
): Promise<{
  success: boolean;
  refundId?: string;
  amount?: number;
  error?: string;
}> {
  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(secretKey, {
      apiVersion: '2025-09-30.clover',
    });

    const refund = await stripe.refunds.create({
      payment_intent: paymentId,
      amount: amount ? Math.round(amount * 100) : undefined, // Full refund if amount not specified
    });

    return {
      success: refund.status === 'succeeded',
      refundId: refund.id,
      amount: refund.amount / 100,
    };
  } catch (error) {
    console.error('Stripe refund error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Refund failed',
    };
  }
}

/**
 * Validate Stripe webhook signature
 * 
 * @param payload - Raw request body
 * @param signature - Stripe signature from headers
 * @param webhookSecret - Stripe webhook secret
 * @returns Webhook event or null if invalid
 */
export async function validateStripeWebhook(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Promise<any | null> {
  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe('', { apiVersion: '2025-09-30.clover' }); // Key not needed for webhook validation

    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );

    return event;
  } catch (error) {
    console.error('Stripe webhook validation error:', error);
    return null;
  }
}

/**
 * Get Stripe checkout session URL
 * 
 * @param params - Session parameters
 * @returns Checkout session URL
 */
export async function createStripeCheckoutSession(params: {
  secretKey: string;
  amount: number;
  currency: string;
  email: string;
  successUrl: string;
  cancelUrl: string;
  description?: string;
  metadata?: Record<string, any>;
}): Promise<{
  success: boolean;
  sessionId?: string;
  checkoutUrl?: string;
  error?: string;
}> {
  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(params.secretKey, {
      apiVersion: '2025-09-30.clover',
    });

    const amountInCents = convertToSmallestUnit(params.amount, params.currency);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: params.currency.toLowerCase(),
            product_data: {
              name: params.description || 'Payment',
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: params.email,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata,
    });

    return {
      success: true,
      sessionId: session.id,
      checkoutUrl: session.url || undefined,
    };
  } catch (error) {
    console.error('Stripe checkout session error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Session creation failed',
    };
  }
}

/**
 * Convert amount to smallest currency unit
 * Most currencies use 2 decimal places (cents)
 * Some currencies like JPY, KRW don't use decimals
 */
function convertToSmallestUnit(amount: number, currency: string): number {
  const noDecimalCurrencies = ['JPY', 'KRW', 'VND', 'CLP', 'BIF', 'DJF', 'GNF', 'ISK', 'KMF', 'XAF', 'XOF', 'XPF'];

  if (noDecimalCurrencies.includes(currency.toUpperCase())) {
    return Math.round(amount);
  }

  return Math.round(amount * 100);
}
