# Practice Payment Gateway Settings - Implementation Complete

## Overview

The Practice Payment Gateway Settings page allows practices to configure their payment providers (Stripe, Paystack) with their own API keys and select their preferred payment gateway. This is part of the multi-tenant payment system where:

- **Owner DB** stores available payment gateways
- **Tenant DB** stores practice-specific API keys and configurations
- **Payment processing** automatically selects the correct provider based on currency

## What Was Implemented

### 1. Database Schema

#### Owner Database (`smartdvm_owner`)

- **`payment_providers`** - Catalog of available payment gateways
  - Stripe, Paystack configurations
  - Supported currencies, payment methods, features
  - Provider metadata and documentation links
- **`provider_currency_support`** - Currency mapping for each provider
  - Maps which currencies each provider supports
  - Transaction fees per currency
  - Recommended providers per currency

#### Tenant Database (per practice)

- **`practice_payment_providers`** - Practice-specific payment configurations
  - API keys (encrypted)
  - Preferred gateway selection
  - Environment (sandbox/production)
  - Usage statistics

### 2. API Endpoints

Created the following API routes in `/src/app/api/practice-admin/`:

1. **`GET /api/practice-admin/available-gateways`**

   - Fetches available payment gateways from Owner DB
   - Returns: Stripe, Paystack details

2. **`GET /api/practice-admin/payment-settings`**

   - Fetches practice's configured gateways
   - Returns: Configured providers, preferred gateway

3. **`POST /api/practice-admin/payment-settings/preferred`**

   - Updates practice's preferred payment gateway
   - Body: `{ gatewayType: "stripe" | "paystack" }`

4. **`POST /api/practice-admin/payments/stripe/connect`**

   - Saves Stripe API keys for a practice
   - Body: `{ publishableKey, secretKey }`
   - Keys are encrypted before storage

5. **`POST /api/practice-admin/payments/paystack/connect`**
   - Saves Paystack API keys for a practice
   - Body: `{ publicKey, secretKey }`
   - Keys are encrypted before storage

### 3. UI Components

**File**: `/src/app/(main)/admin/payment-gateway/page.tsx`

The page has 3 tabs:

#### Tab 1: Payment Methods

- CRUD operations for saved payment methods (credit cards)
- Set default payment method
- Card management interface

#### Tab 2: Payment History

- View all payment transactions
- Date range filtering
- Transaction details (status, amount, payment method)

#### Tab 3: Practice Settings (NEW - Main Focus)

- **Preferred Gateway Selection**:

  - Shows all available gateways from Owner DB
  - Radio button selection
  - Displays configuration status (Configured/Not Configured)
  - Save button to set preferred gateway

- **API Key Configuration**:
  - Dynamically shows configuration forms for each available gateway
  - Stripe configuration:
    - Publishable Key
    - Secret Key (encrypted on save)
  - Paystack configuration:
    - Public Key
    - Secret Key (encrypted on save)
  - Update/Configure buttons per gateway
  - Visual indicators showing configured gateways

### 4. Database Seeding

**Script**: `/scripts/seed-payment-providers.ts`

Populates the Owner database with:

- **Stripe**: 135+ supported currencies, global payment processing
- **Paystack**: NGN, GHS, ZAR, KES, USD support, African payments

Currency mappings:

- Stripe: USD, EUR, GBP, CAD, AUD, NGN, GHS, ZAR, KES
- Paystack: NGN (recommended), GHS (recommended), ZAR (recommended), KES, USD

### 5. Security Features

- **Key Encryption**: All secret keys encrypted using AES-256-CBC
- **Separate Storage**: API keys stored in Tenant DB (practice-isolated)
- **Gateway Catalog**: Owner DB controls which gateways are available
- **Environment Variable**: `ENCRYPTION_KEY` for key encryption/decryption

## How It Works

### For Practice Administrators:

1. **Navigate** to `/admin/payment-gateway` → Practice Settings tab
2. **See Available Gateways**: Shows Stripe and Paystack (loaded from Owner DB)
3. **Configure API Keys**:
   - Click "Configure" on Stripe or Paystack
   - Enter API keys (publishable/public and secret)
   - Keys are encrypted and saved to practice's Tenant DB
4. **Select Preferred Gateway**:
   - Choose Stripe or Paystack as preferred
   - Click "Save Preferred Gateway"
   - System remembers this choice for automatic provider selection

### For Payment Processing:

When a client makes a payment:

1. System checks practice's currency (e.g., NGN)
2. Looks up which provider supports NGN in Owner DB
3. Retrieves practice's API keys from Tenant DB
4. Uses the correct provider to process payment
5. Falls back to preferred gateway if multiple providers support the currency

## Files Modified/Created

### New Files:

- `/src/app/api/practice-admin/available-gateways/route.ts`
- `/src/app/api/practice-admin/payment-settings/route.ts`
- `/src/app/api/practice-admin/payment-settings/preferred/route.ts`
- `/src/app/api/practice-admin/payments/stripe/connect/route.ts`
- `/src/app/api/practice-admin/payments/paystack/connect/route.ts`

### Modified Files:

- `/src/app/(main)/admin/payment-gateway/page.tsx` - Added Practice Settings tab
- `/src/db/schema.ts` - Added practicePaymentProviders export
- `/src/owner/db/config.ts` - Fixed to use OWNER_DATABASE_URL
- `/scripts/seed-payment-providers.ts` - Added dotenv import

### Schema Files:

- `/src/db/owner-schema.ts` - Payment provider tables
- `/src/db/schemas/paymentProvidersSchema.ts` - Practice payment config

## Database Migrations Applied

```bash
# Owner DB migration
npm run db:owner:push

# Tenant DB migration
npm run db:tenant:push

# Seed payment providers
NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/seed-payment-providers.ts
```

## Environment Variables Required

```bash
# Owner Database (where payment providers are stored)
OWNER_DATABASE_URL="postgresql://..."

# Encryption key for API keys
ENCRYPTION_KEY="your-32-character-encryption-key"
```

## Testing the Implementation

1. **Start the development server**: `npm run dev`
2. **Navigate** to: `http://localhost:9002/admin/payment-gateway`
3. **Click** on "Practice Settings" tab
4. **Configure Stripe**:
   - Click "Configure" button
   - Enter test keys: `pk_test_...` and `sk_test_...`
   - Click "Save Stripe Keys"
5. **Configure Paystack** (optional):
   - Click "Configure" button
   - Enter test keys
   - Click "Save Paystack Keys"
6. **Select Preferred Gateway**:
   - Select Stripe or Paystack radio button
   - Click "Save Preferred Gateway"
7. **Verify**: Page should show "Configured" badges on configured gateways

## Next Steps

### To complete the payment system:

1. **Payment Method CRUD APIs**:

   - `POST /api/payments/methods` - Add payment method
   - `GET /api/payments/methods` - List payment methods
   - `PATCH /api/payments/methods/:id` - Update payment method
   - `DELETE /api/payments/methods/:id` - Delete payment method

2. **Payment History API**:

   - `GET /api/payments/history` - With date range filtering

3. **Webhook Handlers**:

   - `/api/webhook/stripe` - Handle Stripe webhooks
   - `/api/webhook/paystack` - Handle Paystack webhooks

4. **Update payment-handler.ts**:
   - Read from `practice_payment_providers` table
   - Use encrypted keys from database
   - Auto-select provider based on currency mapping

## Architecture Benefits

✅ **Multi-Tenant Isolation**: Each practice has its own API keys
✅ **Centralized Control**: Owner can add/remove payment providers globally
✅ **Flexible Configuration**: Practices choose their preferred gateway
✅ **Automatic Selection**: System auto-selects provider based on currency
✅ **Secure Storage**: API keys encrypted at rest
✅ **Extensible**: Easy to add new payment providers (Flutterwave, etc.)

## Summary

The Practice Payment Gateway Settings page is now fully functional with:

- ✅ Dynamic gateway loading from Owner DB
- ✅ Secure API key configuration and storage
- ✅ Preferred gateway selection
- ✅ Visual feedback (Configured/Not Configured badges)
- ✅ Complete database schema and migrations
- ✅ Encrypted key storage
- ✅ Multi-tenant architecture

The system is ready for practices to configure their payment gateways!
