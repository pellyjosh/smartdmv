// scripts/seed-payment-providers.ts
// Seed initial payment providers to Owner database

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { paymentProviders, providerCurrencySupport } from '../src/db/owner-schema';

const OWNER_DATABASE_URL = process.env.OWNER_DATABASE_URL;

if (!OWNER_DATABASE_URL) {
  console.error('OWNER_DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString: OWNER_DATABASE_URL,
});

const db = drizzle(pool);

const providersData = [
  {
    code: 'stripe',
    name: 'Stripe',
    description: 'Global payment processing platform supporting credit cards, debit cards, and more',
    logoUrl: 'https://stripe.com/img/v3/newsroom/social.png',
    websiteUrl: 'https://stripe.com',
    documentationUrl: 'https://stripe.com/docs/api',
    apiBaseUrl: 'https://api.stripe.com/v1',
    sandboxApiBaseUrl: 'https://api.stripe.com/v1', // Stripe uses same URL with test keys
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'SGD', 'HKD', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'HRK', 'RUB', 'TRY', 'BRL', 'MXN', 'CLP', 'COP', 'PEN', 'ARS', 'INR', 'THB', 'MYR', 'PHP', 'IDR', 'KRW', 'TWD', 'NZD', 'ZAR'],
    supportedPaymentMethods: ['card', 'bank_transfer', 'wallet'],
    supportedFeatures: ['refunds', 'subscriptions', 'webhooks', 'recurring_payments', 'invoicing'],
    requiresPublicKey: true,
    requiresSecretKey: true,
    requiresWebhookSecret: true,
    configSchema: {
      fields: [
        {
          name: 'publicKey',
          label: 'Publishable Key',
          type: 'text' as const,
          required: true,
          placeholder: 'pk_test_... or pk_live_...',
        },
        {
          name: 'secretKey',
          label: 'Secret Key',
          type: 'password' as const,
          required: true,
          placeholder: 'sk_test_... or sk_live_...',
        },
        {
          name: 'webhookSecret',
          label: 'Webhook Secret',
          type: 'password' as const,
          required: false,
          placeholder: 'whsec_...',
        },
      ],
    },
    status: 'active' as const,
    isDefault: true,
    priority: 10,
    integrationType: 'built_in' as const,
    handlerModule: 'stripe',
  },
  {
    code: 'paystack',
    name: 'Paystack',
    description: 'Leading payment gateway for businesses in Africa',
    logoUrl: 'https://paystack.com/assets/img/paystack-icon.png',
    websiteUrl: 'https://paystack.com',
    documentationUrl: 'https://paystack.com/docs/api',
    apiBaseUrl: 'https://api.paystack.co',
    sandboxApiBaseUrl: 'https://api.paystack.co', // Paystack uses same URL with test keys
    supportedCurrencies: ['NGN', 'GHS', 'ZAR', 'KES', 'USD'],
    supportedPaymentMethods: ['card', 'bank_transfer', 'mobile_money', 'ussd'],
    supportedFeatures: ['refunds', 'subscriptions', 'webhooks', 'recurring_payments', 'split_payments'],
    requiresPublicKey: true,
    requiresSecretKey: true,
    requiresWebhookSecret: false,
    configSchema: {
      fields: [
        {
          name: 'publicKey',
          label: 'Public Key',
          type: 'text' as const,
          required: true,
          placeholder: 'pk_test_... or pk_live_...',
        },
        {
          name: 'secretKey',
          label: 'Secret Key',
          type: 'password' as const,
          required: true,
          placeholder: 'sk_test_... or sk_live_...',
        },
      ],
    },
    status: 'active' as const,
    isDefault: false,
    priority: 10,
    integrationType: 'built_in' as const,
    handlerModule: 'paystack',
  },
];

const currencySupportData = [
  // Stripe currency support
  { providerCode: 'stripe', currencyCode: 'USD', isRecommended: true, transactionFeePercent: '2.9', transactionFeeFixed: '30' },
  { providerCode: 'stripe', currencyCode: 'EUR', isRecommended: true, transactionFeePercent: '1.4', transactionFeeFixed: '25' },
  { providerCode: 'stripe', currencyCode: 'GBP', isRecommended: true, transactionFeePercent: '1.4', transactionFeeFixed: '20' },
  { providerCode: 'stripe', currencyCode: 'CAD', isRecommended: true, transactionFeePercent: '2.9', transactionFeeFixed: '30' },
  { providerCode: 'stripe', currencyCode: 'AUD', isRecommended: true, transactionFeePercent: '1.75', transactionFeeFixed: '30' },
  
  // Paystack currency support
  { providerCode: 'paystack', currencyCode: 'NGN', isRecommended: true, transactionFeePercent: '1.5', transactionFeeFixed: '100' },
  { providerCode: 'paystack', currencyCode: 'GHS', isRecommended: true, transactionFeePercent: '1.95', transactionFeeFixed: '0' },
  { providerCode: 'paystack', currencyCode: 'ZAR', isRecommended: true, transactionFeePercent: '2.9', transactionFeeFixed: '0' },
  { providerCode: 'paystack', currencyCode: 'KES', isRecommended: true, transactionFeePercent: '3.5', transactionFeeFixed: '0' },
  { providerCode: 'paystack', currencyCode: 'USD', isRecommended: false, transactionFeePercent: '3.9', transactionFeeFixed: '100' },
];

async function seedProviders() {
  try {
    console.log('🌱 Seeding payment providers to Owner database...');
    
    // Insert providers
    for (const providerData of providersData) {
      console.log(`  → Adding ${providerData.name}...`);
      
      const [provider] = await db
        .insert(paymentProviders)
        .values(providerData as any) // Use type assertion for JSON fields
        .onConflictDoUpdate({
          target: paymentProviders.code,
          set: {
            ...providerData,
            updatedAt: new Date(),
          } as any,
        })
        .returning();
      
      console.log(`    ✓ ${provider.name} added (ID: ${provider.id})`);
    }
    
    console.log('\n💱 Seeding currency support mappings...');
    
    // Get all providers for mapping
    const allProviders = await db.select().from(paymentProviders);
    const providersMap = new Map(allProviders.map(p => [p.code, p]));
    
    // Insert currency support mappings
    for (const supportData of currencySupportData) {
      const provider = providersMap.get(supportData.providerCode);
      
      if (!provider) {
        console.log(`  ⚠ Provider ${supportData.providerCode} not found, skipping currency ${supportData.currencyCode}`);
        continue;
      }
      
      await db
        .insert(providerCurrencySupport)
        .values({
          providerId: provider.id,
          currencyCode: supportData.currencyCode,
          isRecommended: supportData.isRecommended,
          transactionFeePercent: supportData.transactionFeePercent,
          transactionFeeFixed: supportData.transactionFeeFixed,
          isActive: true,
        })
        .onConflictDoNothing();
      
      const recommended = supportData.isRecommended ? '⭐' : '  ';
      console.log(`  ${recommended} ${provider.name} → ${supportData.currencyCode}`);
    }
    
    console.log('\n✅ Payment providers seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Providers: ${providersData.length}`);
    console.log(`   Currency Mappings: ${currencySupportData.length}`);
    
  } catch (error) {
    console.error('❌ Error seeding payment providers:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seedProviders();
