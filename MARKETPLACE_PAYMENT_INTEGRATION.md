# Marketplace Payment Integration - Implementation Summary

## Overview

Successfully integrated owner-level payment processing for marketplace addon subscriptions. Practices can now purchase addons with payments processed through the owner's payment gateway configuration instead of individual practice payment keys.

## Architecture

### Two Payment Modes

1. **Practice Payments** (Existing)

   - Uses practice-specific payment keys stored in `practicePaymentProviders` table (tenant DB)
   - For invoices, appointments, and other practice services
   - Function: `createPayment()` in `/src/lib/payments/payment-handler.ts`

2. **Marketplace Payments** (New)
   - Uses owner-level payment keys stored in `owner_payment_configurations` table (owner DB)
   - For addon subscriptions and marketplace purchases
   - Function: `createMarketplacePayment()` in `/src/lib/payments/payment-handler.ts`

## Database Structure

### Owner Database Tables

#### `owner_payment_configurations`

Stores the owner's payment provider credentials (encrypted):

- `provider_id` - References payment_providers table
- `config_name` - Friendly name (e.g., "Production Stripe")
- `public_key` - Encrypted public/publishable key
- `secret_key` - Encrypted secret key
- `webhook_secret` - Encrypted webhook secret
- `environment` - 'production' or 'sandbox'
- `default_currency` - Default currency code
- `is_active`, `is_verified`, `is_default` - Status flags

#### `tenant_billing_transactions`

Tracks all marketplace payment attempts and results:

- `tenant_id` - Which tenant made the purchase
- `payment_config_id` - Which payment config was used
- `transaction_type` - 'addon', 'subscription', 'overage', etc.
- `amount`, `currency` - Transaction details
- `status` - 'pending', 'succeeded', 'failed', etc.
- `provider_transaction_id` - ID from payment provider
- `addon_id`, `subscription_id` - Related records

## API Endpoints

### Owner Payment Configuration Management

#### `POST /api/owner/payment-configs`

Create new payment configuration

```json
{
  "providerId": 1,
  "configName": "Production Stripe",
  "publicKey": "pk_live_...",
  "secretKey": "sk_live_...",
  "environment": "production",
  "defaultCurrency": "USD",
  "isDefault": true
}
```

#### `GET /api/owner/payment-configs`

List all payment configurations (keys are NOT returned)
Query params: `providerId`, `isActive`, `environment`

#### `GET /api/owner/payment-configs/[id]`

Get single configuration (keys are partially masked: `****last4`)

#### `PATCH /api/owner/payment-configs/[id]`

Update payment configuration

#### `DELETE /api/owner/payment-configs/[id]`

Delete payment configuration

#### `POST /api/owner/payment-configs/[id]/verify`

Verify payment configuration by testing API keys with provider

### Marketplace Subscription

#### `POST /api/marketplace/practice/[practiceId]/subscribe`

Modified to use owner payment configuration:

1. Gets practice currency
2. Calculates addon price based on tier and billing cycle
3. Calls `createMarketplacePayment()` with owner's keys
4. Creates billing transaction in owner DB
5. Returns payment URL if customer action needed
6. Creates subscription record in tenant DB

## Payment Flow

### Addon Purchase Flow

1. **Practice selects addon** in marketplace
2. **Frontend calls** `/api/marketplace/practice/[practiceId]/subscribe`
3. **Backend**:
   - Validates practice and addon
   - Calculates price (tier + billing cycle)
   - Gets practice currency from tenant DB
   - Fetches owner payment config from owner DB
   - Decrypts owner's API keys
   - Creates billing transaction (status: pending)
   - Calls payment provider API (Stripe/Paystack)
   - Updates transaction with provider response
4. **Response scenarios**:
   - **Immediate success**: Subscription created, status ACTIVE
   - **Requires action**: Returns payment URL, status PENDING
   - **Failed**: Returns error, no subscription created

### Payment Verification (Future)

When payment completes (webhook or redirect):

1. Payment provider sends callback
2. Verify payment with provider API
3. Update `tenant_billing_transactions` status
4. Update `practiceAddons` subscription status
5. Activate addon features for practice

## Key Functions

### `createMarketplacePayment()`

Location: `/src/lib/payments/payment-handler.ts`

Handles marketplace payments using owner configuration:

```typescript
const result = await createMarketplacePayment({
  tenantId: 1,
  practiceId: 5,
  amount: 29.99,
  currency: "USD",
  email: "practice@example.com",
  description: "Premium Addon - Monthly",
  metadata: { addonSlug: "telemedicine", tier: "PREMIUM" },
  addonId: 3,
});
```

Returns:

```typescript
{
  success: boolean,
  paymentUrl?: string,     // URL for customer to complete payment
  paymentId?: string,      // Provider transaction ID
  provider: string,        // 'stripe' or 'paystack'
  transactionId?: number,  // Our billing transaction ID
  error?: string
}
```

## Security

### Key Encryption

- Uses same encryption as practice keys (APP_KEY environment variable)
- Algorithm: AES-256-CBC
- Keys stored as `iv:encryptedData` format
- Decryption happens in-memory, never exposed in responses

### API Key Management

- GET endpoints return masked keys (`****last4`)
- Only owner admins can manage configurations
- Keys are re-encrypted when updated
- Verification required after key changes

## Configuration Steps

### For Owner Admin

1. **Add Payment Provider** (if not exists)

   - Providers managed in `payment_providers` table
   - Stripe, Paystack, Flutterwave pre-configured

2. **Create Payment Configuration**

   ```bash
   POST /api/owner/payment-configs
   {
     "providerId": 1,
     "configName": "Production Stripe",
     "secretKey": "sk_live_...",
     "publicKey": "pk_live_...",
     "environment": "production",
     "defaultCurrency": "USD"
   }
   ```

3. **Verify Configuration**

   ```bash
   POST /api/owner/payment-configs/1/verify
   ```

4. **Set as Default** (optional)
   ```bash
   PATCH /api/owner/payment-configs/1
   { "isDefault": true }
   ```

### For Development

1. **Set Environment Variables**

   ```env
   OWNER_DATABASE_URL=postgresql://...
   APP_KEY=your_64_char_hex_encryption_key
   PAYMENT_KEY_ENCRYPTION_SECRET=your_64_char_hex_key
   NODE_ENV=development
   ```

2. **Create Sandbox Configuration**
   - Use sandbox/test API keys
   - Set `environment: "sandbox"`

## Testing

### Test Marketplace Purchase

1. Login as practice admin
2. Navigate to `/marketplace`
3. Select an addon
4. Click "Subscribe"
5. Should redirect to payment page (Stripe/Paystack)
6. Complete test payment
7. Verify subscription created in tenant DB
8. Verify transaction logged in owner DB

### Verify Payment Configuration

```bash
curl -X POST http://localhost:9002/api/owner/payment-configs/1/verify
```

Should return:

```json
{
  "success": true,
  "message": "Stripe credentials verified successfully",
  "details": { "available": [...], "pending": [...] }
}
```

## Migration Notes

### Database Changes

Owner database now includes:

- `owner_payment_configurations` table
- `tenant_billing_transactions` table

Migration applied: `src/owner/db/migrations/0000_luxuriant_spirit.sql`

### No Breaking Changes

- Existing practice payment flows unchanged
- Only adds new marketplace payment capability
- Backward compatible with existing invoices/appointments

## Future Enhancements

1. **Webhook Handlers**

   - `/api/marketplace/webhooks/stripe`
   - `/api/marketplace/webhooks/paystack`
   - Auto-verify and activate subscriptions

2. **Retry Logic**

   - Auto-retry failed payments
   - Configurable retry schedule

3. **Multi-Currency Support**

   - Automatic currency detection
   - Currency conversion for reporting

4. **Payment Analytics**
   - Dashboard for owner billing overview
   - Revenue tracking per tenant
   - Failed payment monitoring

## Files Modified

### Created

- `/src/owner/db/schemas/paymentConfigSchema.ts` - Payment config schema
- `/src/app/api/owner/payment-configs/route.ts` - List/create configs
- `/src/app/api/owner/payment-configs/[id]/route.ts` - Update/delete configs
- `/src/app/api/owner/payment-configs/[id]/verify/route.ts` - Verify credentials

### Modified

- `/src/owner/db/schema.ts` - Export payment schemas
- `/src/lib/payments/payment-handler.ts` - Added `createMarketplacePayment()`
- `/src/app/api/marketplace/practice/[practiceId]/subscribe/route.ts` - Use owner payments
- `/drizzle.owner.config.ts` - Fixed schema path

### Deleted

- `/src/lib/payment/` - Removed duplicate payment folder

## Environment Variables Required

```env
# Required for payment encryption
APP_KEY=your_64_character_hex_string
PAYMENT_KEY_ENCRYPTION_SECRET=your_64_character_hex_string

# Owner database
OWNER_DATABASE_URL=postgresql://...

# Environment mode
NODE_ENV=development|production
```

## Support

For issues or questions:

1. Check owner payment configuration is active and verified
2. Verify APP_KEY is set correctly
3. Check tenant billing transactions table for error details
4. Review payment provider logs (Stripe/Paystack dashboard)
