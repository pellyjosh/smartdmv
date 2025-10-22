# Payment Providers Architecture for Multi-Tenant System

## Overview

This document describes the payment provider management system designed for a multi-tenant architecture where each practice has its own isolated database.

## Architecture Strategy: Hybrid Model

### **Why Hybrid?**

With isolated tenant databases, we need:

1. **Centralized provider catalog** (Owner DB) - Easy to add new providers globally
2. **Decentralized configuration** (Tenant DB) - Each practice manages their own API keys
3. **Shared integration code** - Consistent payment processing across all tenants

## Database Schema Design

### **1. Owner Database (Centralized)**

Stores the **catalog** of available payment providers that can be used across all practices.

#### `payment_providers` Table (Owner DB)

```typescript
// Location: src/owner/db/schemas/paymentProvidersSchema.ts

export const paymentProviders = ownerDbTable("payment_providers", {
  id: primaryKeyId(),

  // Provider Identity
  code: text("code").notNull().unique(), // 'stripe', 'paystack', 'flutterwave', etc.
  name: text("name").notNull(), // 'Stripe', 'Paystack', 'Flutterwave'
  description: text("description"),

  // Provider Details
  logoUrl: text("logo_url"), // URL to provider logo
  websiteUrl: text("website_url"),
  documentationUrl: text("documentation_url"),

  // Technical Configuration
  apiBaseUrl: text("api_base_url"), // Base URL for API calls
  sandboxApiBaseUrl: text("sandbox_api_base_url"), // Sandbox/test URL

  // Features & Capabilities
  supportedCurrencies: jsonb("supported_currencies"), // ['USD', 'NGN', 'GHS', etc.]
  supportedPaymentMethods: jsonb("supported_payment_methods"), // ['card', 'bank_transfer', 'mobile_money', etc.]
  supportedFeatures: jsonb("supported_features"), // ['refunds', 'subscriptions', 'webhooks', etc.]

  // Integration Requirements
  requiresPublicKey: boolean("requires_public_key").default(true),
  requiresSecretKey: boolean("requires_secret_key").default(true),
  requiresWebhookSecret: boolean("requires_webhook_secret").default(false),
  configSchema: jsonb("config_schema"), // JSON schema for configuration fields

  // Status & Priority
  status: text("status", {
    enum: ["active", "inactive", "deprecated", "beta"],
  }).default("active"),
  isDefault: boolean("is_default").default(false), // Default provider for new practices
  priority: integer("priority").default(0), // Higher = preferred (for same currency)

  // Integration Code Reference
  integrationType: text("integration_type", {
    enum: ["built_in", "plugin", "custom"],
  }).default("built_in"),
  handlerModule: text("handler_module"), // e.g., '@/lib/payments/handlers/stripe'

  // Metadata
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  createdBy: text("created_by"), // Owner user ID who added this provider
});
```

#### `provider_currency_support` Table (Owner DB)

Maps which providers support which currencies (many-to-many).

```typescript
export const providerCurrencySupport = ownerDbTable(
  "provider_currency_support",
  {
    id: primaryKeyId(),

    providerId: foreignKeyInt("provider_id")
      .notNull()
      .references(() => paymentProviders.id),
    currencyCode: text("currency_code").notNull(), // 'USD', 'NGN', 'GHS', etc.

    // Currency-specific settings for this provider
    isRecommended: boolean("is_recommended").default(false), // Recommended for this currency
    transactionFeePercent: text("transaction_fee_percent"), // e.g., '2.9'
    transactionFeeFixed: text("transaction_fee_fixed"), // e.g., '30' (in smallest unit, cents)
    minAmount: text("min_amount"), // Minimum transaction amount
    maxAmount: text("max_amount"), // Maximum transaction amount

    // Status
    isActive: boolean("is_active").default(true),

    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }
);

// Unique constraint: one entry per provider-currency pair
export const providerCurrencySupportUnique = unique(
  "provider_currency_unique"
).on(providerCurrencySupport.providerId, providerCurrencySupport.currencyCode);
```

### **2. Tenant Database (Per-Practice)**

Stores **practice-specific** provider configurations and API keys.

#### `practice_payment_providers` Table (Tenant DB)

```typescript
// Location: src/db/schemas/paymentProvidersSchema.ts (Tenant DB)

export const practicePaymentProviders = dbTable("practice_payment_providers", {
  id: primaryKeyId(),

  practiceId: foreignKeyInt("practice_id")
    .notNull()
    .references(() => practices.id),

  // Provider Reference (from Owner DB catalog)
  providerCode: text("provider_code").notNull(), // 'stripe', 'paystack', etc.
  providerName: text("provider_name").notNull(), // Cached from owner DB

  // Practice-Specific Configuration
  isEnabled: boolean("is_enabled").default(false),
  isDefault: boolean("is_default").default(false), // Default for this practice

  // API Credentials (Encrypted)
  publicKey: text("public_key"), // Encrypted
  secretKey: text("secret_key"), // Encrypted
  webhookSecret: text("webhook_secret"), // Encrypted

  // Environment
  environment: text("environment", {
    enum: ["sandbox", "production"],
  }).default("sandbox"),

  // Additional Configuration
  config: jsonb("config"), // Provider-specific settings

  // Usage Settings
  supportedCurrencies: jsonb("supported_currencies"), // Which currencies this practice uses this provider for
  priority: integer("priority").default(0), // If multiple providers for same currency

  // Metadata
  configuredBy: foreignKeyInt("configured_by").references(() => users.id), // User who set it up
  lastTestedAt: timestamp("last_tested_at"),
  lastUsedAt: timestamp("last_used_at"),

  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// Unique constraint: one configuration per practice-provider pair
export const practiceProviderUnique = unique("practice_provider_unique").on(
  practicePaymentProviders.practiceId,
  practicePaymentProviders.providerCode
);
```

#### `payment_transactions` Table Enhancement (Tenant DB)

Add provider tracking to existing payments.

```typescript
// Add to existing payments table
export const payments = dbTable("payments", {
  // ... existing fields ...

  // Provider Information
  providerCode: text("provider_code"), // 'stripe', 'paystack', etc.
  providerTransactionId: text("provider_transaction_id"), // External transaction ID
  providerResponse: jsonb("provider_response"), // Full provider response
  providerFee: text("provider_fee"), // Fee charged by provider

  // ... rest of existing fields ...
});
```

## Data Flow

### **1. Adding a New Provider (Owner/Admin)**

```
Owner adds new provider to Owner DB
         ↓
payment_providers table
         ↓
Maps to supported currencies in provider_currency_support
         ↓
Provider becomes available to ALL tenants
         ↓
Each practice can enable & configure it independently
```

### **2. Practice Configures Provider**

```
Practice Admin goes to Payment Settings
         ↓
Sees list of available providers (from Owner DB via API)
         ↓
Selects provider to configure
         ↓
Enters API keys (encrypted in Tenant DB)
         ↓
Saved to practice_payment_providers table
         ↓
Provider now available for that practice's payments
```

### **3. Payment Processing**

```
User clicks "Pay Now"
         ↓
System checks practice's currency (from practices.defaultCurrencyId)
         ↓
Queries practice_payment_providers WHERE:
  - practiceId = current practice
  - isEnabled = true
  - supportedCurrencies contains current currency
         ↓
Selects provider (based on isDefault or priority)
         ↓
Retrieves encrypted API keys
         ↓
Processes payment using provider's handler
         ↓
Logs to payment_transactions with providerCode
```

## API Design

### **Owner API Endpoints**

#### Get Available Providers

```typescript
GET /api/owner/payment-providers
Response: [
  {
    id: 1,
    code: 'stripe',
    name: 'Stripe',
    supportedCurrencies: ['USD', 'EUR', 'GBP', ...],
    status: 'active',
    ...
  }
]
```

#### Add New Provider

```typescript
POST /api/owner/payment-providers
{
  code: 'flutterwave',
  name: 'Flutterwave',
  supportedCurrencies: ['NGN', 'GHS', 'KES', 'ZAR'],
  apiBaseUrl: 'https://api.flutterwave.com/v3',
  ...
}
```

### **Tenant API Endpoints**

#### Get Available Providers for Practice

```typescript
GET /api/practices/[practiceId]/payment-providers/available
// Returns providers from Owner DB filtered by practice's currency
Response: [
  {
    code: 'stripe',
    name: 'Stripe',
    isConfigured: true,
    isEnabled: true,
    ...
  },
  {
    code: 'paystack',
    name: 'Paystack',
    isConfigured: false,
    isEnabled: false,
    ...
  }
]
```

#### Configure Provider for Practice

```typescript
POST /api/practices/[practiceId]/payment-providers
{
  providerCode: 'stripe',
  publicKey: 'pk_live_...',
  secretKey: 'sk_live_...',
  environment: 'production',
  isEnabled: true,
  supportedCurrencies: ['USD']
}
```

#### Get Provider for Currency

```typescript
GET /api/practices/[practiceId]/payment-providers/for-currency/USD
Response: {
  code: 'stripe',
  name: 'Stripe',
  publicKey: 'pk_live_...' // Decrypted for client use
}
```

## Provider Handler System

### **Base Provider Interface**

```typescript
// src/lib/payments/providers/base.ts

export interface PaymentProvider {
  code: string;
  name: string;

  // Initialize with practice config
  initialize(config: ProviderConfig): Promise<void>;

  // Payment operations
  createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent>;
  confirmPayment(params: ConfirmPaymentParams): Promise<PaymentResult>;
  refundPayment(params: RefundParams): Promise<RefundResult>;

  // Webhooks
  validateWebhook(signature: string, payload: any): boolean;
  processWebhook(event: any): Promise<WebhookResult>;

  // Utility
  getPublicConfig(): any; // Client-safe configuration
}
```

### **Provider Registry**

```typescript
// src/lib/payments/providers/registry.ts

import { StripeProvider } from "./stripe";
import { PaystackProvider } from "./paystack";
// Import more as needed

export const providerRegistry: Record<string, new () => PaymentProvider> = {
  stripe: StripeProvider,
  paystack: PaystackProvider,
  // flutterwave: FlutterwaveProvider, // Add new ones here
};

export async function getProviderHandler(
  practiceId: number,
  providerCode: string
): Promise<PaymentProvider> {
  const ProviderClass = providerRegistry[providerCode];
  if (!ProviderClass) {
    throw new Error(`Provider ${providerCode} not found in registry`);
  }

  // Get practice configuration from tenant DB
  const config = await getPracticeProviderConfig(practiceId, providerCode);

  const provider = new ProviderClass();
  await provider.initialize(config);

  return provider;
}
```

## Migration Strategy

### **Phase 1: Owner Database Setup**

1. Create `payment_providers` table in Owner DB
2. Create `provider_currency_support` table in Owner DB
3. Seed initial providers (Stripe, Paystack)

### **Phase 2: Tenant Database Setup**

1. Create `practice_payment_providers` table in Tenant DB
2. Migrate existing `practices.paymentProviders` JSONB to new table
3. Add provider tracking fields to `payments` table

### **Phase 3: Code Updates**

1. Build provider registry and base interfaces
2. Refactor Stripe and Paystack handlers to use new interface
3. Update payment selection logic to query new tables
4. Build admin UI for provider management

### **Phase 4: Gradual Rollout**

1. Deploy with backwards compatibility
2. Migrate existing practices to new system
3. Deprecate old `practices.paymentProviders` JSONB field

## Benefits of This Architecture

✅ **Easy to Add Providers**: Just add to Owner DB and implement handler  
✅ **Tenant Isolation**: Each practice manages their own API keys  
✅ **Centralized Catalog**: All practices see new providers immediately  
✅ **Flexible Configuration**: Practice-specific settings per provider  
✅ **Multi-Currency Support**: One practice can use different providers for different currencies  
✅ **Audit Trail**: Track who configured what and when  
✅ **Security**: Encrypted credentials in tenant DB  
✅ **Scalable**: No schema changes needed to add providers

## Adding a New Provider (Example: Flutterwave)

### **Step 1: Add to Owner Database**

```sql
INSERT INTO payment_providers (
  code, name, description,
  api_base_url, supported_currencies,
  status, handler_module
) VALUES (
  'flutterwave',
  'Flutterwave',
  'African payment gateway supporting multiple countries',
  'https://api.flutterwave.com/v3',
  '["NGN", "GHS", "KES", "ZAR", "UGX"]',
  'active',
  '@/lib/payments/handlers/flutterwave'
);

-- Map to currencies
INSERT INTO provider_currency_support (provider_id, currency_code, is_recommended)
SELECT id, 'NGN', true FROM payment_providers WHERE code = 'flutterwave';
-- Repeat for other currencies...
```

### **Step 2: Implement Handler**

```typescript
// src/lib/payments/handlers/flutterwave.ts

export class FlutterwaveProvider implements PaymentProvider {
  code = "flutterwave";
  name = "Flutterwave";

  async initialize(config: ProviderConfig) {
    // Initialize Flutterwave SDK
  }

  async createPaymentIntent(params: CreatePaymentParams) {
    // Implement payment creation
  }

  // ... implement other methods
}
```

### **Step 3: Register Handler**

```typescript
// src/lib/payments/providers/registry.ts

import { FlutterwaveProvider } from "./flutterwave";

export const providerRegistry = {
  stripe: StripeProvider,
  paystack: PaystackProvider,
  flutterwave: FlutterwaveProvider, // Add here
};
```

### **Step 4: Done!**

Now all practices can see and configure Flutterwave without any database migration!

## Summary

This hybrid architecture provides:

- **Owner DB**: Centralized provider catalog (easy updates)
- **Tenant DB**: Practice-specific configurations (tenant isolation)
- **Code Registry**: Modular handler system (easy integration)

It's designed specifically for your multi-tenant architecture while maintaining flexibility and security.
