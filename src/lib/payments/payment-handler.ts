// src/lib/payments/payment-handler.ts
// Simplified payment handler that works with multi-tenant DB architecture

import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { ownerDb } from '@/owner/db/config';
import { practices } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { createStripePayment, verifyStripePayment } from './providers/stripe';
import { createPaystackPayment, verifyPaystackPayment } from './providers/paystack';

/**
 * Payment parameters - what you need to make a payment
 */
interface PaymentParams {
  practiceId: number;
  amount: number; // In major currency unit (e.g., $10.50, not 1050 cents)
  email: string;
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * Payment result - what you get back
 */
interface PaymentResponse {
  success: boolean;
  paymentUrl?: string; // URL to redirect customer for payment
  paymentId?: string;
  provider: string; // 'stripe' or 'paystack'
  error?: string;
}

/**
 * Decrypt API keys (implement your actual decryption here)
 */
async function decryptApiKey(encrypted: string): Promise<string> {
  // TODO: Replace with your actual KMS/encryption service
  // For now, assuming keys are stored encrypted in DB
  return encrypted;
}

/**
 * Main function: Make a payment using the right provider
 * 
 * This function:
 * 1. Gets the practice's currency from tenant DB
 * 2. Finds which provider supports that currency from owner DB
 * 3. Gets the practice's API keys for that provider from tenant DB
 * 4. Creates payment with that provider
 */
export async function createPayment(params: PaymentParams): Promise<PaymentResponse> {
  try {
    const { practiceId, amount, email, description, metadata } = params;

    // STEP 1: Get practice info from tenant DB
    const tenantDb = await getCurrentTenantDb();
    const practice = await tenantDb.query.practices.findFirst({
      where: eq(practices.id, practiceId),
      with: {
        currency: true, // Get the practice's default currency
      },
    });

    if (!practice) {
      return { success: false, provider: 'none', error: 'Practice not found' };
    }

    const currencyCode = practice.currency?.code || 'USD';

    // STEP 2: Find which provider to use from Owner DB
    // Get provider that supports this currency
    const providerCurrency = await ownerDb.query.providerCurrencySupport.findFirst({
      where: (pcs: any, { eq }: any) => eq(pcs.currencyCode, currencyCode),
      with: {
        provider: true, // Include the full provider info
      },
      orderBy: (pcs: any, { asc }: any) => [asc(pcs.priority)], // Get highest priority
    });

    if (!providerCurrency || !providerCurrency.provider) {
      return { 
        success: false, 
        provider: 'none', 
        error: `No payment provider configured for currency ${currencyCode}` 
      };
    }

    const providerCode = providerCurrency.provider.code; // 'stripe' or 'paystack'

    // STEP 3: Get practice's API keys for this provider from tenant DB
    const practiceProvider = await tenantDb.query.practice_payment_providers.findFirst({
      where: (ppp: any, { and, eq }: any) => 
        and(
          eq(ppp.practiceId, practiceId),
          eq(ppp.providerCode, providerCode),
          eq(ppp.enabled, true)
        ),
    });

    if (!practiceProvider) {
      return { 
        success: false, 
        provider: providerCode, 
        error: `${providerCode} not configured for this practice` 
      };
    }

    // Decrypt API keys
    const secretKey = await decryptApiKey(practiceProvider.secretKeyEncrypted);
    const publicKey = practiceProvider.publicKey;

    // STEP 4: Create payment with the selected provider
    if (providerCode === 'stripe') {
      const result = await createStripePayment({
        secretKey,
        publicKey,
        amount,
        currency: currencyCode,
        email,
        description,
        metadata,
      });

      return {
        success: result.success,
        paymentUrl: result.clientSecret,
        paymentId: result.paymentId,
        provider: 'stripe',
        error: result.error,
      };
    } else if (providerCode === 'paystack') {
      const result = await createPaystackPayment({
        secretKey,
        publicKey,
        amount,
        currency: currencyCode,
        email,
        description,
        metadata,
      });

      return {
        success: result.success,
        paymentUrl: result.authorizationUrl,
        paymentId: result.paymentId,
        provider: 'paystack',
        error: result.error,
      };
    }

    return { 
      success: false, 
      provider: providerCode, 
      error: `Provider ${providerCode} not implemented` 
    };

  } catch (error) {
    console.error('Payment creation error:', error);
    return { 
      success: false, 
      provider: 'unknown', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Verify payment status (for webhooks or polling)
 * 
 * @param paymentId - Payment ID from provider
 * @param provider - Payment provider ('stripe' or 'paystack')
 * @param secretKey - Provider secret key
 * @returns Verification result
 */
export async function verifyPayment(
  paymentId: string,
  provider: 'stripe' | 'paystack',
  secretKey: string
): Promise<{ success: boolean; status: string; amount?: number; currency?: string }> {
  try {
    if (provider === 'stripe') {
      const result = await verifyStripePayment(paymentId, secretKey);
      return {
        success: result.success,
        status: result.status,
        amount: result.amount,
        currency: result.currency,
      };
    } else if (provider === 'paystack') {
      const result = await verifyPaystackPayment(paymentId, secretKey);
      return {
        success: result.success,
        status: result.status,
        amount: result.amount,
        currency: result.currency,
      };
    }
    
    return { success: false, status: 'unknown' };
  } catch (error) {
    console.error('Verification error:', error);
    return { success: false, status: 'error' };
  }
}
