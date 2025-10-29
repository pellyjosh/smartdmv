// src/lib/payments/payment-handler.ts
// Simplified payment handler that works with multi-tenant DB architecture

import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { ownerDb } from '@/owner/db/config';
import { practices, practicePaymentProviders } from '@/db/schema';
import { paymentProviders, providerCurrencySupport } from '@/owner/db/schemas/ownerSchema';
import { eq, and, asc } from 'drizzle-orm';
import { createStripePayment, verifyStripePayment } from './providers/stripe';
import { createPaystackPayment, verifyPaystackPayment } from './providers/paystack';
import crypto from 'crypto';

// Use APP_KEY from environment for encryption (must be 32 bytes hex)
const ENCRYPTION_KEY = process.env.APP_KEY;
if (!ENCRYPTION_KEY) {
  throw new Error('APP_KEY environment variable is required for payment encryption');
}
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
  callbackBaseUrl?: string; // Tenant-specific base URL for callbacks (e.g., https://smartvet.yourdomain.com)
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
    // console.log('[DECRYPT] Starting decryption...');
    // console.log('[DECRYPT] Encrypted key format:', encryptedKey.substring(0, 20) + '...');
    // console.log('[DECRYPT] APP_KEY available:', !!ENCRYPTION_KEY);
    // console.log('[DECRYPT] APP_KEY length:', ENCRYPTION_KEY.length);

    const parts = encryptedKey.split(':');
    console.log('[DECRYPT] Parts count:', parts.length);

    if (parts.length < 2) {
      throw new Error('Invalid encrypted key format - expected format: iv:encryptedText');
    }

    const iv = Buffer.from(parts.shift()!, 'hex');
    // console.log('[DECRYPT] IV length:', iv.length, 'bytes (expected 16)');

    const encryptedText = Buffer.from(parts.join(':'), 'hex');
    // console.log('[DECRYPT] Encrypted text length:', encryptedText.length, 'bytes');

    // Convert hex key to Buffer (32 bytes for AES-256)
    const keyBuffer = Buffer.from(ENCRYPTION_KEY!, 'hex');
    // console.log('[DECRYPT] Key buffer length:', keyBuffer.length, 'bytes (expected 32)');

    if (keyBuffer.length !== 32) {
      throw new Error(`Invalid key length: ${keyBuffer.length} bytes (expected 32 bytes for AES-256-CBC)`);
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    // console.log('[DECRYPT] Decryption successful');
    return decrypted.toString();
  } catch (error) {
    // console.error('[DECRYPT] Error decrypting key:', error);
    // console.error('[DECRYPT] Error details:', {
    //   errorName: error instanceof Error ? error.name : 'Unknown',
    //   errorMessage: error instanceof Error ? error.message : 'Unknown error',
    //   errorCode: (error as any)?.code,
    // });
    throw new Error(`Failed to decrypt API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

    if (!practice.defaultCurrencyId) {
      return { success: false, provider: 'none', error: 'No currency configured for this practice' };
    }

    // Get actual currency code from currencies table
    const currency = await tenantDb.query.currencies.findFirst({
      where: (c: any, { eq }: any) => eq(c.id, practice.defaultCurrencyId),
    });

    if (!currency) {
      return { success: false, provider: 'none', error: 'Currency not found' };
    }

    const currencyCode = (currency as any).code; // e.g., 'USD', 'NGN', 'GHS'

    console.log('[PAYMENT HANDLER] Practice:', practiceId, 'Currency:', currencyCode);

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

    console.log('[PAYMENT HANDLER] Provider info for currency:', currencyCode, providerInfo);

    if (!providerInfo) {
      return {
        success: false,
        provider: 'none',
        error: `No payment provider configured for currency ${currencyCode}`
      };
    }

    const providerCode = providerInfo.providerCode; // 'stripe' or 'paystack'

    console.log('[PAYMENT HANDLER] Selected provider:', providerCode);

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

    console.log('[PAYMENT HANDLER] Practice provider config:', practiceProvider ? 'Found' : 'Not found');

    if (!practiceProvider) {
      return {
        success: false,
        provider: providerCode,
        error: `${providerCode} not configured for this practice. Please configure API keys in Practice Settings > Payment Gateway.`
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
      // Build callback URL with invoice ID for verification
      // Use tenant-specific URL if provided, otherwise fallback to env var
      const baseUrl = params.callbackBaseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
      const callbackUrl = `${baseUrl}/api/payments/verify?provider=paystack&invoiceId=${metadata?.invoiceId || ''}`;

      console.log('[PAYMENT HANDLER] Paystack callback URL:', callbackUrl);

      const result = await createPaystackPayment({
        secretKey,
        publicKey,
        amount,
        currency: currencyCode,
        email,
        description,
        metadata,
        callbackUrl,
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
 * Create marketplace payment using OWNER payment configuration
 * 
 * This is used for addon subscriptions where the owner bills the tenant
 * instead of the practice using their own payment keys
 */
export async function createMarketplacePayment(params: {
  tenantId: number;
  practiceId: number;
  amount: number;
  currency: string;
  email: string;
  description?: string;
  metadata?: Record<string, any>;
  addonId?: number;
  subscriptionId?: number;
}): Promise<PaymentResponse & { transactionId?: number }> {
  try {
    const { tenantId, practiceId, amount, currency, email, description, metadata, addonId, subscriptionId } = params;

    console.log('[MARKETPLACE PAYMENT] Starting payment for tenant:', tenantId, 'Currency:', currency);

    // Import owner payment configuration
    const { ownerPaymentConfigurations, tenantBillingTransactions } = await import('@/owner/db/schema');

    // Check environment
    const nodeEnv = process.env.NODE_ENV;
    const environment = nodeEnv === 'production' ? 'production' : 'sandbox';
    console.log('[MARKETPLACE PAYMENT] NODE_ENV:', nodeEnv, '| Looking for environment:', environment);

    // Get active, verified owner payment configuration for this currency
    const [configResult] = await ownerDb
      .select({
        config: ownerPaymentConfigurations,
        provider: paymentProviders,
      })
      .from(ownerPaymentConfigurations)
      .leftJoin(paymentProviders, eq(ownerPaymentConfigurations.providerId, paymentProviders.id))
      .where(
        and(
          eq(ownerPaymentConfigurations.isActive, true),
          eq(ownerPaymentConfigurations.isVerified, true),
          eq(ownerPaymentConfigurations.environment, environment)
        )
      )
      .limit(1);

    console.log('[MARKETPLACE PAYMENT] Query result:', configResult ? 'Found' : 'Not found');
    if (configResult) {
      console.log('[MARKETPLACE PAYMENT] Config:', {
        id: configResult.config?.id,
        name: configResult.config?.configName,
        environment: configResult.config?.environment,
        isActive: configResult.config?.isActive,
        isVerified: configResult.config?.isVerified,
      });
    }

    if (!configResult || !configResult.config || !configResult.provider) {
      console.error('[MARKETPLACE PAYMENT] No payment configuration found');
      console.error('[MARKETPLACE PAYMENT] Debug: Fetching all configs to see what exists...');
      
      try {
        const allConfigs = await ownerDb.select().from(ownerPaymentConfigurations).limit(5);
        console.error('[MARKETPLACE PAYMENT] Total configs in DB:', allConfigs.length);
        allConfigs.forEach(c => {
          console.error('[MARKETPLACE PAYMENT] Config:', {
            id: c.id,
            name: c.configName,
            env: c.environment,
            active: c.isActive,
            verified: c.isVerified,
          });
        });
      } catch (debugError) {
        console.error('[MARKETPLACE PAYMENT] Failed to fetch debug info:', debugError);
      }

      return {
        success: false,
        provider: 'none',
        error: 'No payment configuration available. Please contact support.',
      };
    }

    const { config, provider } = configResult;

    // Check if config supports this currency
    const supportedCurrencies = config.supportedCurrencies || provider.supportedCurrencies || [];
    if (!supportedCurrencies.includes(currency)) {
      return {
        success: false,
        provider: provider.code,
        error: `Currency ${currency} not supported by payment provider`,
      };
    }

    console.log('[MARKETPLACE PAYMENT] Using provider:', provider.code);

    // Create pending billing transaction
    const [transaction] = await ownerDb
      .insert(tenantBillingTransactions)
      .values({
        tenantId,
        paymentConfigId: config.id,
        transactionType: 'addon',
        amount: amount.toString(),
        currency,
        status: 'pending',
        subscriptionId,
        addonId,
        description,
        metadata: {
          ...metadata,
          practiceId,
          email,
        },
      })
      .returning();

    console.log('[MARKETPLACE PAYMENT] Created transaction:', transaction.id);

    // Decrypt owner's API keys
    const secretKey = config.secretKey ? await decryptApiKey(config.secretKey) : '';
    const publicKey = config.publicKey ? await decryptApiKey(config.publicKey) : null;

    console.log('[MARKETPLACE PAYMENT] Decrypted keys, creating payment...');

    // Create payment with provider
    let paymentResult: PaymentResponse;

    if (provider.code === 'stripe') {
      const result = await createStripePayment({
        secretKey,
        publicKey,
        amount,
        currency,
        email,
        description: description || `Marketplace addon purchase - Transaction #${transaction.id}`,
        metadata: {
          ...metadata,
          transactionId: transaction.id,
          tenantId,
          practiceId,
          type: 'marketplace',
        },
      });

      paymentResult = {
        success: result.success,
        paymentUrl: result.clientSecret,
        paymentId: result.paymentId,
        provider: 'stripe',
        error: result.error,
      };
    } else if (provider.code === 'paystack') {
      // First create the Paystack payment to get the reference
      const result = await createPaystackPayment({
        secretKey,
        publicKey,
        amount,
        currency,
        email,
        description: description || `Marketplace addon purchase - Transaction #${transaction.id}`,
        metadata: {
          ...metadata,
          transactionId: transaction.id,
          tenantId,
          practiceId,
          type: 'marketplace',
        },
        // We'll update the callback URL after getting the reference
        callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/api/owner/marketplace/verify-payment?transactionId=${transaction.id}&provider=paystack`,
      });

      // Update transaction with Paystack reference
      if (result.success && result.reference) {
        await ownerDb
          .update(tenantBillingTransactions)
          .set({ providerTransactionId: result.reference })
          .where(eq(tenantBillingTransactions.id, transaction.id));
      }

      paymentResult = {
        success: result.success,
        paymentUrl: result.authorizationUrl,
        paymentId: result.reference,
        provider: 'paystack',
        error: result.error,
      };

      console.log('[MARKETPLACE PAYMENT] Paystack result:', {
        success: result.success,
        hasUrl: !!result.authorizationUrl,
        hasPaymentId: !!result.paymentId,
        error: result.error,
      });
    } else {
      paymentResult = {
        success: false,
        provider: provider.code,
        error: `Provider ${provider.code} not implemented for marketplace payments`,
      };
    }

    // Update transaction with payment result
    const updateData: any = {
      providerTransactionId: paymentResult.paymentId,
      updatedAt: new Date(),
    };

    if (!paymentResult.success) {
      updateData.status = 'failed';
      updateData.failureCode = 'PAYMENT_INIT_FAILED';
      updateData.failureMessage = paymentResult.error;
      console.log('[MARKETPLACE PAYMENT] Payment failed:', paymentResult.error);
    }

    await ownerDb
      .update(tenantBillingTransactions)
      .set(updateData)
      .where(eq(tenantBillingTransactions.id, transaction.id));

    console.log('[MARKETPLACE PAYMENT] Payment created, result:', paymentResult.success);

    return {
      ...paymentResult,
      transactionId: transaction.id,
    };

  } catch (error) {
    console.error('[MARKETPLACE PAYMENT] Error:', error);
    return {
      success: false,
      provider: 'unknown',
      error: error instanceof Error ? error.message : 'Unknown error creating marketplace payment',
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
