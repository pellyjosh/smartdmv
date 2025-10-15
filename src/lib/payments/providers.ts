import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { practices } from '@/db/schema';

// Note: Install stripe and paystack SDKs in the host project when ready:
// npm install stripe @paystack/inline-js (or appropriate server SDK)

async function decryptSecret(encrypted: string | null | undefined): Promise<string | null> {
  // TODO: Replace with real decryption using KMS or environment-backed secrets.
  if (!encrypted) return null;
  return encrypted;
}

export async function getPracticePaymentConfig(practiceId: number) {
  const db = await getCurrentTenantDb();
  const practice = await db.query.practices.findFirst({ where: (p: any, { eq }: any) => eq(p.id, practiceId) });
  if (!practice) return null;

  // paymentProviders stored as JSON: { stripe: { publishableKey, secretKeyEncrypted, enabled }, paystack: { publicKey, secretKeyEncrypted, enabled } }
  const providers = (practice as any).paymentProviders || {};

  // Decrypt secrets synchronously for use
  const stripeSecret = providers.stripe ? await decryptSecret(providers.stripe.secretKeyEncrypted) : null;
  const paystackSecret = providers.paystack ? await decryptSecret(providers.paystack.secretKeyEncrypted) : null;

  return {
    enabled: !!practice.paymentEnabled,
    stripe: providers.stripe
      ? {
          publishableKey: providers.stripe.publishableKey,
          secretKey: stripeSecret,
          enabled: !!providers.stripe.enabled,
        }
      : null,
    paystack: providers.paystack
      ? {
          publicKey: providers.paystack.publicKey,
          secretKey: paystackSecret,
          enabled: !!providers.paystack.enabled,
        }
      : null,
  };
}

// Example factory functions. Import SDKs inside functions to avoid hard dependency at module load.
export async function getStripeClientForPractice(practiceId: number) {
  const config = await getPracticePaymentConfig(practiceId);
  if (!config?.stripe?.enabled || !config.stripe.secretKey) return null;
  // Dynamically import stripe to avoid forcing it as a dependency at runtime unless used
  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(config.stripe.secretKey, { apiVersion: '2022-11-15' });
  return stripe;
}

export async function getPaystackClientForPractice(practiceId: number) {
  const config = await getPracticePaymentConfig(practiceId);
  if (!config?.paystack?.enabled || !config.paystack.secretKey) return null;
  // There is no official Node SDK from Paystack included by default; many use simple fetch calls.
  return {
    secretKey: config.paystack.secretKey,
    publicKey: config.paystack.publicKey,
    // Helper to make API calls
    request: async (path: string, method = 'GET', body?: any) => {
      const base = 'https://api.paystack.co';
      const res = await fetch(base + path, {
        method,
        headers: {
          Authorization: `Bearer ${config.paystack.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) throw new Error(`Paystack API error: ${res.statusText}`);
      return res.json();
    },
  };
}

export default {
  getPracticePaymentConfig,
  getStripeClientForPractice,
  getPaystackClientForPractice,
};
