// src/lib/payments/payment-handler.ts
// Simplified payment handler that works with multi-tenant DB architecture

import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { ownerDb } from '@/owner/db/config';
import { practices, practicePaymentProviders } from '@/db/schema';
import { paymentProviders, providerCurrencySupport } from '@/db/owner-schema';
import { eq, and, asc } from 'drizzle-orm';
import { createStripePayment, verifyStripePayment } from './providers/stripe';
import { createPaystackPayment, verifyPaystackPayment } from './providers/paystack';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key!!';
const ALGORITHM = 'aes-256-cbc';

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
 * Decrypt API keys
 */
async function decryptApiKey(encryptedKey: string): Promise<string> {
  try {
    const parts = encryptedKey.split(':');
    const iv = Buffer.from(parts.shift()!, 'hex');
    const encryptedText = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error('Error decrypting key:', error);
    throw new Error('Failed to decrypt API key');
  }
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
    const [practice] = await tenantDb
      .select({
        id: practices.id,
        defaultCurrencyId: practices.defaultCurrencyId,
      })
      .from(practices)
      .where(eq(practices.id, practiceId))
      .limit(1);

    if (!practice) {
      return { success: false, provider: 'none', error: 'Practice not found' };
    }

    // Use practice currency or default to 1 (usually USD)
    const currencyId = practice.defaultCurrencyId || 1;
    
    // TODO: Get actual currency code from currencies table
    // For now, assume 1 = USD
    const currencyCode = 'USD';

    // STEP 2: Find which provider supports this currency from Owner DB
    // First, get the provider that supports this currency (join with paymentProviders table)
    const [providerInfo] = await ownerDb
      .select({
        providerId: providerCurrencySupport.providerId,
        currencyCode: providerCurrencySupport.currencyCode,
        providerCode: paymentProviders.code,
      })
      .from(providerCurrencySupport)
      .innerJoin(paymentProviders, eq(providerCurrencySupport.providerId, paymentProviders.id))
      .where(
        and(
          eq(providerCurrencySupport.currencyCode, currencyCode),
          eq(providerCurrencySupport.isActive, true),
          eq(paymentProviders.status, 'active')
        )
      )
      .orderBy(asc(paymentProviders.priority))
      .limit(1);

    if (!providerInfo) {
      return { 
        success: false, 
        provider: 'none', 
        error: `No payment provider configured for currency ${currencyCode}` 
      };
    }

    const providerCode = providerInfo.providerCode; // 'stripe' or 'paystack'

    // STEP 3: Get practice's API keys for this provider from tenant DB
    const [practiceProvider] = await tenantDb
      .select()
      .from(practicePaymentProviders)
      .where(
        and(
          eq(practicePaymentProviders.practiceId, practiceId),
          eq(practicePaymentProviders.providerCode, providerCode),
          eq(practicePaymentProviders.isEnabled, true)
        )
      )
      .limit(1);

    if (!practiceProvider) {
      return { 
        success: false, 
        provider: providerCode, 
        error: `${providerCode} not configured for this practice` 
      };
    }

    // Decrypt API keys
    const secretKey = practiceProvider.secretKey 
      ? await decryptApiKey(practiceProvider.secretKey)
      : '';
    const publicKey = practiceProvider.publicKey || null;

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

/**
 * Get Stripe client configured for a specific practice
 * Returns null if Stripe is not configured for this practice
 */
export async function getStripeClientForPractice(practiceId: number): Promise<any | null> {
  try {
    const tenantDb = await getCurrentTenantDb();
    
    // Fetch Stripe configuration for this practice
    const [config] = await tenantDb
      .select()
      .from(practicePaymentProviders)
      .where(
        and(
          eq(practicePaymentProviders.practiceId, practiceId),
          eq(practicePaymentProviders.providerCode, 'stripe'),
          eq(practicePaymentProviders.isEnabled, true)
        )
      )
      .limit(1);

    if (!config || !config.secretKey) {
      console.log(`Stripe not configured for practice ${practiceId}`);
      return null;
    }

    // Decrypt the secret key
    const secretKey = await decryptApiKey(config.secretKey);

    // Dynamically import and initialize Stripe
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(secretKey, {
      apiVersion: '2025-09-30.clover',
    });

    return stripe;
  } catch (error) {
    console.error('Error getting Stripe client for practice:', error);
    return null;
  }
}

/**
 * Get Paystack client configured for a specific practice
 * Returns null if Paystack is not configured for this practice
 */
export async function getPaystackClientForPractice(practiceId: number): Promise<any | null> {
  try {
    const tenantDb = await getCurrentTenantDb();
    
    // Fetch Paystack configuration for this practice
    const [config] = await tenantDb
      .select()
      .from(practicePaymentProviders)
      .where(
        and(
          eq(practicePaymentProviders.practiceId, practiceId),
          eq(practicePaymentProviders.providerCode, 'paystack'),
          eq(practicePaymentProviders.isEnabled, true)
        )
      )
      .limit(1);

    if (!config || !config.secretKey) {
      console.log(`Paystack not configured for practice ${practiceId}`);
      return null;
    }

    // Decrypt the secret key
    const secretKey = await decryptApiKey(config.secretKey);

    // Create simple Paystack client
    const paystackClient = {
      secretKey,
      async request(endpoint: string, method: string = 'GET', body?: any) {
        const url = `https://api.paystack.co${endpoint}`;
        const response = await fetch(url, {
          method,
          headers: {
            'Authorization': `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
          body: body ? JSON.stringify(body) : undefined,
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Paystack API request failed');
        }

        return data;
      },
    };

    return paystackClient;
  } catch (error) {
    console.error('Error getting Paystack client for practice:', error);
    return null;
  }
}
