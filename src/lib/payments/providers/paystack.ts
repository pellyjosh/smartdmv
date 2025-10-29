// src/lib/payments/providers/paystack.ts
// Paystack payment gateway implementation

/**
 * Paystack payment parameters
 */
export interface PaystackPaymentParams {
  secretKey: string;
  publicKey: string | null;
  amount: number; // In major currency unit (e.g., 10.50)
  currency: string;
  email: string;
  description?: string;
  metadata?: Record<string, any>;
  callbackUrl?: string;
}

/**
 * Paystack payment response
 */
export interface PaystackPaymentResult {
  success: boolean;
  paymentId?: string;
  authorizationUrl?: string;
  accessCode?: string;
  reference?: string;
  error?: string;
}

/**
 * Create a Paystack payment transaction
 * 
 * @param params - Payment parameters including API keys and amount
 * @returns Payment result with authorization URL for redirect
 */
export async function createPaystackPayment(
  params: PaystackPaymentParams
): Promise<PaystackPaymentResult> {
  try {
    // Convert to smallest currency unit (kobo for NGN, cents for others)
    const amountInKobo = Math.round(params.amount * 100);

    console.log('[PAYSTACK] Initializing payment:', {
      amount: params.amount,
      amountInKobo,
      currency: params.currency,
      email: params.email,
      hasSecretKey: !!params.secretKey,
      secretKeyPrefix: params.secretKey?.substring(0, 7),
    });

    // Paystack transaction initialization
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${params.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountInKobo,
        currency: params.currency.toUpperCase(),
        email: params.email,
        metadata: params.metadata,
        callback_url: params.callbackUrl,
        channels: ['card', 'bank', 'ussd', 'mobile_money', 'qr', 'eft'],
      }),
    });

    console.log('[PAYSTACK] Response status:', response.status);

    const data = await response.json();

    console.log('[PAYSTACK] Response data:', {
      status: data.status,
      message: data.message,
      hasData: !!data.data,
    });

    if (!data.status) {
      console.error('[PAYSTACK] Payment initialization failed:', data.message);
      return {
        success: false,
        error: data.message || 'Paystack initialization failed',
      };
    }

    return {
      success: true,
      paymentId: data.data.reference,
      reference: data.data.reference,
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
    };
  } catch (error) {
    console.error('Paystack payment creation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Paystack payment failed',
    };
  }
}

/**
 * Verify a Paystack payment status
 * 
 * @param reference - Paystack transaction reference
 * @param secretKey - Paystack secret key
 * @returns Payment verification result
 */
export async function verifyPaystackPayment(
  reference: string,
  secretKey: string
): Promise<{
  success: boolean;
  status: string;
  amount?: number;
  currency?: string;
  paidAt?: string;
  channel?: string;
  error?: string;
}> {
  try {
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!data.status) {
      return {
        success: false,
        status: 'failed',
        error: data.message || 'Verification failed',
      };
    }

    const transaction = data.data;

    return {
      success: transaction.status === 'success',
      status: transaction.status,
      amount: transaction.amount / 100,
      currency: transaction.currency,
      paidAt: transaction.paid_at,
      channel: transaction.channel,
    };
  } catch (error) {
    console.error('Paystack verification error:', error);
    return {
      success: false,
      status: 'error',
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

/**
 * Refund a Paystack payment
 * 
 * @param reference - Paystack transaction reference
 * @param secretKey - Paystack secret key
 * @param amount - Optional partial refund amount
 * @returns Refund result
 */
export async function refundPaystackPayment(
  reference: string,
  secretKey: string,
  amount?: number
): Promise<{
  success: boolean;
  refundId?: string;
  message?: string;
  error?: string;
}> {
  try {
    const response = await fetch('https://api.paystack.co/refund', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transaction: reference,
        amount: amount ? Math.round(amount * 100) : undefined, // Full refund if not specified
      }),
    });

    const data = await response.json();

    if (!data.status) {
      return {
        success: false,
        error: data.message || 'Refund failed',
      };
    }

    return {
      success: true,
      refundId: data.data.id,
      message: data.message,
    };
  } catch (error) {
    console.error('Paystack refund error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Refund failed',
    };
  }
}

/**
 * Validate Paystack webhook signature
 * 
 * @param payload - Raw request body string
 * @param signature - Paystack signature from x-paystack-signature header
 * @param secretKey - Paystack secret key
 * @returns true if valid, false otherwise
 */
export async function validatePaystackWebhook(
  payload: string,
  signature: string,
  secretKey: string
): Promise<boolean> {
  try {
    // Paystack uses HMAC SHA512
    const crypto = await import('crypto');
    const hash = crypto
      .createHmac('sha512', secretKey)
      .update(payload)
      .digest('hex');

    return hash === signature;
  } catch (error) {
    console.error('Paystack webhook validation error:', error);
    return false;
  }
}

/**
 * Get list of supported banks (for bank transfer payments)
 * 
 * @param secretKey - Paystack secret key
 * @param currency - Currency code (NGN, GHS, etc.)
 * @returns List of banks
 */
export async function getPaystackBanks(
  secretKey: string,
  currency: string = 'NGN'
): Promise<{
  success: boolean;
  banks?: Array<{ id: number; name: string; code: string }>;
  error?: string;
}> {
  try {
    const response = await fetch(
      `https://api.paystack.co/bank?currency=${currency}`,
      {
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!data.status) {
      return {
        success: false,
        error: data.message || 'Failed to fetch banks',
      };
    }

    return {
      success: true,
      banks: data.data.map((bank: any) => ({
        id: bank.id,
        name: bank.name,
        code: bank.code,
      })),
    };
  } catch (error) {
    console.error('Paystack banks fetch error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch banks',
    };
  }
}

/**
 * Charge authorization (for recurring payments)
 * 
 * @param params - Charge parameters
 * @returns Charge result
 */
export async function chargePaystackAuthorization(params: {
  secretKey: string;
  authorizationCode: string;
  email: string;
  amount: number;
  currency?: string;
  metadata?: Record<string, any>;
}): Promise<{
  success: boolean;
  reference?: string;
  status?: string;
  error?: string;
}> {
  try {
    const amountInKobo = Math.round(params.amount * 100);

    const response = await fetch('https://api.paystack.co/transaction/charge_authorization', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${params.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authorization_code: params.authorizationCode,
        email: params.email,
        amount: amountInKobo,
        currency: params.currency || 'NGN',
        metadata: params.metadata,
      }),
    });

    const data = await response.json();

    if (!data.status) {
      return {
        success: false,
        error: data.message || 'Authorization charge failed',
      };
    }

    return {
      success: data.data.status === 'success',
      reference: data.data.reference,
      status: data.data.status,
    };
  } catch (error) {
    console.error('Paystack authorization charge error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Charge failed',
    };
  }
}

/**
 * Get transaction timeline/history
 * 
 * @param reference - Transaction reference
 * @param secretKey - Paystack secret key
 * @returns Transaction timeline
 */
export async function getPaystackTransactionTimeline(
  reference: string,
  secretKey: string
): Promise<{
  success: boolean;
  timeline?: Array<{ type: string; message: string; time: number }>;
  error?: string;
}> {
  try {
    const response = await fetch(
      `https://api.paystack.co/transaction/timeline/${reference}`,
      {
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!data.status) {
      return {
        success: false,
        error: data.message || 'Failed to fetch timeline',
      };
    }

    return {
      success: true,
      timeline: data.data.history,
    };
  } catch (error) {
    console.error('Paystack timeline fetch error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch timeline',
    };
  }
}
