d # Owner Marketplace Payment Webhooks & Callbacks

This document explains how marketplace payment verification works through webhooks and callbacks for the owner billing system.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    OWNER PAYMENT SYSTEM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Practice purchases addon → Owner payment config → Provider      │
│                                                                   │
│  Provider responses via:                                         │
│    1. Callback URL (redirect after payment)                     │
│    2. Webhook (server-to-server notification)                   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

vs

┌─────────────────────────────────────────────────────────────────┐
│                   TENANT PAYMENT SYSTEM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Client pays invoice → Practice payment keys → Provider         │
│                                                                   │
│  Provider responses via:                                         │
│    1. /api/payments/verify (client callback)                    │
│    2. /api/payments/webhook/* (tenant webhooks)                 │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Endpoint Structure

### Owner Marketplace Endpoints (New)

```
/api/owner/
├── marketplace/
│   └── verify-payment/          # Callback after payment redirect
└── webhooks/
    ├── stripe/                   # Stripe webhook events
    └── paystack/                 # Paystack webhook events
```

### Tenant Payment Endpoints (Existing)

```
/api/payments/
├── verify/                       # Client payment callback
└── webhook/
    └── paystack/                 # Tenant Paystack webhooks
```

## 1. Callback Handler (User Redirect)

### Endpoint: `/api/owner/marketplace/verify-payment`

**Purpose:** Handles user redirect after completing payment on provider's page

**URL Parameters:**

- `reference` - Payment reference from provider
- `transactionId` - Our billing transaction ID
- `provider` - Payment provider (stripe/paystack)

**Example URL:**

```
https://smartvet.yourdomain.com/api/owner/marketplace/verify-payment
  ?reference=T123456789
  &transactionId=42
  &provider=paystack
```

**Flow:**

```
1. User completes payment on Paystack/Stripe
2. Provider redirects to callback URL
3. Callback handler:
   a. Fetches transaction from owner DB
   b. Gets payment config (for API keys)
   c. Decrypts secret key
   d. Verifies payment with provider API
   e. Updates billing transaction status
   f. Activates addon subscription in tenant DB
4. Redirects user to: /marketplace?payment=success
```

**Response Codes:**

- `302` - Redirect to marketplace with status
  - Success: `?payment=success&message=...`
  - Failed: `?payment=failed&message=...`
  - Error: `?payment=error&message=...`

**Security:**

- ✅ Verifies transaction exists in owner DB
- ✅ Validates payment with provider API (not just trusting callback)
- ✅ Uses encrypted API keys from owner config
- ✅ Updates both owner and tenant databases atomically

### Implementation

```typescript
// src/app/api/owner/marketplace/verify-payment/route.ts

export async function GET(req: NextRequest) {
  const { reference, transactionId, provider } = req.nextUrl.searchParams;

  // 1. Get transaction from owner DB
  const transaction = await ownerDb
    .select()
    .from(tenantBillingTransactions)
    .where(eq(tenantBillingTransactions.id, transactionId));

  // 2. Get payment config and decrypt keys
  const config = await ownerDb
    .select()
    .from(ownerPaymentConfigurations)
    .where(eq(ownerPaymentConfigurations.id, transaction.paymentConfigId));

  const secretKey = await decryptApiKey(config.secretKey);

  // 3. Verify with provider
  const result = await verifyPaystackPayment(reference, secretKey);

  // 4. Update transaction
  await ownerDb
    .update(tenantBillingTransactions)
    .set({ status: "succeeded" })
    .where(eq(tenantBillingTransactions.id, transactionId));

  // 5. Activate subscription
  await tenantDb
    .update(practiceAddons)
    .set({ isActive: true, paymentStatus: "ACTIVE" })
    .where(eq(practiceAddons.id, transaction.subscriptionId));

  // 6. Redirect user
  return NextResponse.redirect("/marketplace?payment=success");
}
```

## 2. Webhook Handlers (Server-to-Server)

### Paystack Webhook: `/api/owner/webhooks/paystack`

**Purpose:** Receives real-time payment notifications from Paystack

**Headers Required:**

- `x-paystack-signature` - HMAC signature for verification

**Webhook Events:**

- `charge.success` - Payment completed successfully
- `charge.failed` - Payment failed

**Signature Verification:**

```typescript
const hash = crypto
  .createHmac('sha512', secretKey)
  .update(rawBody)
  .digest('hex');

if (hash !== signature) {
  return 401 Unauthorized;
}
```

**Flow:**

```
1. Paystack sends webhook POST request
2. Handler extracts transactionId from metadata
3. Fetches transaction from owner DB
4. Gets payment config for signature verification
5. Verifies webhook signature with secret key
6. Updates transaction status based on event
7. Activates/deactivates subscription if applicable
8. Returns 200 OK
```

**Security:**

- ✅ HMAC-SHA512 signature verification
- ✅ Uses owner's encrypted secret key
- ✅ Validates transaction exists before processing
- ✅ Idempotent (checks if already processed)

### Stripe Webhook: `/api/owner/webhooks/stripe`

**Purpose:** Receives real-time payment notifications from Stripe

**Headers Required:**

- `stripe-signature` - Stripe webhook signature

**Webhook Events:**

- `payment_intent.succeeded` - Payment completed
- `payment_intent.payment_failed` - Payment failed
- `payment_intent.canceled` - Payment canceled

**Signature Verification:**

```typescript
const elements = signature.split(",");
const timestamp = elements.find((e) => e.startsWith("t="));
const signedPayload = `${timestamp}.${rawBody}`;
const expectedSignature = crypto
  .createHmac("sha256", webhookSecret)
  .update(signedPayload)
  .digest("hex");
```

**Flow:**

```
1. Stripe sends webhook POST request
2. Handler extracts transactionId from payment_intent.metadata
3. Fetches transaction from owner DB
4. Gets payment config for webhook secret
5. Verifies Stripe signature
6. Updates transaction based on event type
7. Activates subscription on success
8. Returns 200 OK (or error code)
```

**Security:**

- ✅ Stripe signature verification with timestamp
- ✅ Uses owner's encrypted webhook secret
- ✅ Validates transaction exists
- ✅ Idempotent processing

## 3. Configuration Setup

### Configure Webhook URLs in Provider Dashboard

#### Paystack Dashboard

```
1. Go to Settings → Webhooks
2. Add webhook URL:
   https://yourdomain.com/api/owner/webhooks/paystack
3. Select events: charge.success, charge.failed
4. Save
```

#### Stripe Dashboard

```
1. Go to Developers → Webhooks
2. Add endpoint:
   https://yourdomain.com/api/owner/webhooks/stripe
3. Select events:
   - payment_intent.succeeded
   - payment_intent.payment_failed
   - payment_intent.canceled
4. Copy webhook signing secret
5. Save in owner payment config
```

### Store Webhook Secrets

Use the seed script to add webhook secrets:

```bash
npm run db:owner:payment:quick -- \
  --provider=stripe \
  --pk=pk_live_... \
  --sk=sk_live_... \
  --webhook=whsec_... \
  --env=production
```

## 4. Payment Flow Sequence

### Complete Marketplace Purchase Flow

```
┌─────────┐
│ Practice│ Selects addon in marketplace
└────┬────┘
     │
     ▼
┌────────────────────────────────────────────────────┐
│ POST /api/marketplace/practice/[id]/subscribe      │
│ - Validates practice & addon                        │
│ - Calls createMarketplacePayment()                 │
│ - Uses OWNER payment config                        │
└────┬───────────────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────────────────┐
│ createMarketplacePayment()                         │
│ - Creates billing transaction (status: pending)    │
│ - Decrypts owner's API keys                        │
│ - Calls provider API (Stripe/Paystack)            │
│ - Returns payment URL                              │
└────┬───────────────────────────────────────────────┘
     │
     ▼
┌─────────┐
│ Practice│ Redirected to Paystack/Stripe payment page
└────┬────┘
     │
     │ [Completes Payment]
     │
     ├─────────────────────────────────┬──────────────────────────────┐
     │                                 │                              │
     ▼                                 ▼                              ▼
┌──────────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐
│ CALLBACK (Redirect)  │    │ WEBHOOK (Async)      │    │ WEBHOOK (Async)      │
│ User returns         │    │ Paystack notifies    │    │ Stripe notifies      │
└────┬─────────────────┘    └────┬─────────────────┘    └────┬─────────────────┘
     │                           │                            │
     ▼                           ▼                            ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ /api/owner/marketplace/verify-payment  OR  /api/owner/webhooks/*            │
│                                                                               │
│ 1. Fetch transaction from owner DB                                          │
│ 2. Get payment config + decrypt keys                                        │
│ 3. Verify payment with provider API                                         │
│ 4. Update tenant_billing_transactions (status: succeeded)                   │
│ 5. Update practiceAddons (isActive: true, paymentStatus: ACTIVE)           │
│ 6. [Callback]: Redirect to /marketplace?payment=success                    │
│    [Webhook]: Return 200 OK                                                 │
└──────────────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────┐
│ Practice│ Sees success message, addon is active
└─────────┘
```

## 5. Database Updates

### Owner Database (tenant_billing_transactions)

**On payment initiation:**

```sql
INSERT INTO tenant_billing_transactions (
  tenant_id, payment_config_id, transaction_type,
  amount, currency, status, addon_id, subscription_id
) VALUES (
  1, 1, 'addon', 29.99, 'USD', 'pending', 5, 12
);
```

**On successful verification:**

```sql
UPDATE tenant_billing_transactions
SET
  status = 'succeeded',
  provider_response = {...},
  payment_method = 'card',
  payment_method_details = {...},
  updated_at = NOW()
WHERE id = 42;
```

### Tenant Database (practiceAddons)

**On successful payment:**

```sql
UPDATE practiceAddons
SET
  payment_status = 'ACTIVE',
  is_active = true,
  last_activated_at = NOW(),
  updated_at = NOW()
WHERE id = 12;
```

## 6. Testing

### Test Callback Handler

1. Create test transaction in owner DB
2. Call callback URL manually:
   ```bash
   curl "http://localhost:9002/api/owner/marketplace/verify-payment
     ?reference=test_ref_123
     &transactionId=1
     &provider=paystack"
   ```
3. Check transaction status updated
4. Verify redirect to marketplace

### Test Webhook Handler (Paystack)

```bash
# Generate valid signature
BODY='{"event":"charge.success","data":{"reference":"T123","amount":2999000,"metadata":{"transactionId":"1"}}}'
SIGNATURE=$(echo -n "$BODY" | openssl dgst -sha512 -hmac "YOUR_SECRET_KEY" | awk '{print $2}')

# Send webhook
curl -X POST http://localhost:9002/api/owner/webhooks/paystack \
  -H "Content-Type: application/json" \
  -H "x-paystack-signature: $SIGNATURE" \
  -d "$BODY"
```

### Test Webhook Handler (Stripe)

```bash
# Use Stripe CLI
stripe listen --forward-to http://localhost:9002/api/owner/webhooks/stripe

# Trigger test event
stripe trigger payment_intent.succeeded
```

## 7. Monitoring & Debugging

### Check Transaction Status

```sql
-- Owner DB
SELECT id, status, amount, currency, provider_transaction_id,
       failure_code, failure_message
FROM tenant_billing_transactions
ORDER BY created_at DESC
LIMIT 10;
```

### Check Subscription Status

```sql
-- Tenant DB
SELECT id, addon_id, payment_status, is_active,
       last_activated_at
FROM practiceAddons
WHERE practice_id = 5
ORDER BY created_at DESC;
```

### Enable Webhook Logs

Webhooks automatically log to console:

```
[OWNER PAYSTACK WEBHOOK] Event received: charge.success
[OWNER PAYSTACK WEBHOOK] Signature verified
[OWNER PAYSTACK WEBHOOK] Transaction updated to succeeded
[OWNER PAYSTACK WEBHOOK] Addon subscription activated: 12
```

### Common Issues

**Issue: Invalid webhook signature**

- ✅ Check webhook secret is correctly configured
- ✅ Verify secret is properly encrypted in DB
- ✅ Ensure APP_KEY environment variable is correct

**Issue: Transaction not found**

- ✅ Verify transactionId in metadata is correct
- ✅ Check transaction exists in owner DB
- ✅ Ensure metadata is passed during payment creation

**Issue: Subscription not activated**

- ✅ Check subscriptionId is stored in transaction
- ✅ Verify tenant DB connection works
- ✅ Check practiceAddons record exists

## 8. Security Checklist

- ✅ All API keys encrypted in database
- ✅ Webhook signatures verified before processing
- ✅ Payment status verified with provider API (not just trusted from callback)
- ✅ Idempotent processing (checks if already processed)
- ✅ Separate endpoints for owner vs tenant payments
- ✅ Transaction IDs in metadata for tracking
- ✅ Proper error handling and logging
- ✅ HTTPS required in production
- ✅ Rate limiting on webhook endpoints (TODO)
- ✅ IP whitelist for webhook sources (TODO)

## 9. Differences from Tenant Payment System

| Feature      | Owner Marketplace                       | Tenant Invoices           |
| ------------ | --------------------------------------- | ------------------------- |
| Payment Keys | Owner payment config                    | Practice payment config   |
| Database     | Owner DB (billing_transactions)         | Tenant DB (payments)      |
| Callback URL | `/api/owner/marketplace/verify-payment` | `/api/payments/verify`    |
| Webhooks     | `/api/owner/webhooks/*`                 | `/api/payments/webhook/*` |
| Purpose      | Addon subscriptions                     | Client invoices           |
| Redirect     | `/marketplace`                          | `/client/billing`         |

## 10. Files Reference

```
src/
├── app/api/
│   ├── owner/
│   │   ├── marketplace/
│   │   │   └── verify-payment/route.ts    # Owner callback handler
│   │   └── webhooks/
│   │       ├── stripe/route.ts             # Owner Stripe webhook
│   │       └── paystack/route.ts           # Owner Paystack webhook
│   └── payments/
│       ├── verify/route.ts                 # Tenant callback handler
│       └── webhook/
│           └── paystack/route.ts           # Tenant webhook
└── lib/payments/
    ├── payment-handler.ts                  # createMarketplacePayment()
    └── providers/
        ├── stripe.ts                       # Stripe API wrapper
        └── paystack.ts                     # Paystack API wrapper
```
