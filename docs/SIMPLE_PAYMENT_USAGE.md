# Simple Payment Handler - Usage Guide

## Overview

The simplified payment handler automatically selects the correct payment provider based on your practice's currency and uses the configuration stored in the database.

## How It Works

```
1. Practice has currency set (e.g., NGN, USD)
   ↓
2. System checks Owner DB for which provider supports that currency
   ↓
3. System gets practice's API keys for that provider from Tenant DB
   ↓
4. System creates payment using selected provider
   ↓
5. Returns payment URL for customer
```

## Basic Usage

### 1. Create a Payment

```typescript
import { createPayment } from "@/lib/payments/simple-payment-handler";

// In your API route or server component
const result = await createPayment({
  practiceId: 1,
  amount: 50.0, // $50.00 or ₦50.00 (in major currency unit)
  email: "customer@example.com",
  description: "Veterinary consultation",
  metadata: {
    appointmentId: "123",
    patientName: "Max the Dog",
  },
});

if (result.success) {
  // Redirect customer to payment URL
  redirect(result.paymentUrl);
} else {
  // Show error
  console.error(result.error);
}
```

### 2. Verify Payment (After Webhook/Callback)

```typescript
import { verifyPayment } from "@/lib/payments/simple-payment-handler";

const verification = await verifyPayment(
  "pi_1234567890", // Payment ID from Stripe/Paystack
  "stripe", // Provider used
  "sk_test_..." // Secret key
);

if (verification.success) {
  // Payment successful - mark order as paid
  console.log("Paid amount:", verification.amount);
}
```

## API Route Example

```typescript
// src/app/api/payments/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createPayment } from "@/lib/payments/simple-payment-handler";
import { getTenantContext } from "@/lib/tenant-context";

export async function POST(req: NextRequest) {
  try {
    const { amount, email, description, metadata } = await req.json();
    const { practiceId } = await getTenantContext();

    const result = await createPayment({
      practiceId,
      amount,
      email,
      description,
      metadata,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      paymentUrl: result.paymentUrl,
      paymentId: result.paymentId,
      provider: result.provider,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Payment creation failed" },
      { status: 500 }
    );
  }
}
```

## Client-Side Integration

```typescript
// In your billing page component
async function handlePayment() {
  const response = await fetch("/api/payments/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: 50.0,
      email: user.email,
      description: "Service payment",
      metadata: { orderId: "123" },
    }),
  });

  const { paymentUrl } = await response.json();

  // Redirect to payment provider
  window.location.href = paymentUrl;
}
```

## What Happens Behind the Scenes

### 1. **Currency Detection**

```sql
-- Gets practice currency from tenant DB
SELECT defaultCurrencyId FROM practices WHERE id = ?
SELECT code FROM currencies WHERE id = ?
```

### 2. **Provider Selection**

```sql
-- Gets recommended provider from owner DB
SELECT * FROM provider_currency_support
WHERE currencyCode = 'NGN'
ORDER BY priority ASC
LIMIT 1
```

### 3. **API Key Retrieval**

```sql
-- Gets practice's encrypted keys from tenant DB
SELECT * FROM practice_payment_providers
WHERE practiceId = ? AND providerCode = 'paystack' AND enabled = true
```

### 4. **Payment Creation**

- **Stripe**: Creates PaymentIntent via Stripe SDK
- **Paystack**: Initializes transaction via Paystack API

## Response Format

### Success Response

```typescript
{
  success: true,
  paymentUrl: "https://checkout.stripe.com/...",
  paymentId: "pi_1234567890",
  provider: "stripe"
}
```

### Error Response

```typescript
{
  success: false,
  provider: "stripe",
  error: "Insufficient funds"
}
```

## Prerequisites

### 1. Owner Database Setup

Run the seed script to populate payment providers:

```bash
npm run seed:payment-providers
```

This creates:

- Stripe provider with 35+ currency support
- Paystack provider with NGN, GHS, ZAR, KES, USD support

### 2. Practice Configuration

Each practice must configure their API keys in practice settings:

```typescript
// Store in practice_payment_providers table
{
  practiceId: 1,
  providerCode: 'stripe',
  publicKey: 'pk_test_...',
  secretKeyEncrypted: '...encrypted...',
  environment: 'sandbox',
  enabled: true
}
```

### 3. Install Payment SDKs

```bash
npm install stripe
# Paystack uses native fetch API, no SDK needed
```

## Benefits

✅ **Automatic Provider Selection**: No manual provider choice needed  
✅ **Multi-Tenant Safe**: Each practice has isolated credentials  
✅ **Currency Aware**: Right provider for each currency  
✅ **Simple API**: Just 2 functions for most use cases  
✅ **Type Safe**: Full TypeScript support  
✅ **Error Handling**: Clear error messages

## Next Steps

1. **Implement Webhooks**: Handle payment confirmations
2. **Add Refunds**: Use provider-specific refund APIs
3. **Transaction Logging**: Save all payments to database
4. **Receipt Generation**: Email receipts after successful payment
5. **Failed Payment Retry**: Handle declined cards gracefully

## Comparison: Old vs New

### Old Way (Hardcoded)

```typescript
// Manual selection, hardcoded logic
const provider = currency === "NGN" ? "paystack" : "stripe";
const keys = await getHardcodedKeys(provider);
```

### New Way (Database-Driven)

```typescript
// Automatic selection, database-driven
const result = await createPayment({ practiceId, amount, email });
// System automatically picks right provider
```

## Security Notes

🔒 **Encrypt API Keys**: Use KMS or encryption service  
🔒 **Validate Webhooks**: Always verify webhook signatures  
🔒 **HTTPS Only**: Never send payment data over HTTP  
🔒 **PCI Compliance**: Don't store card details  
🔒 **Rate Limiting**: Protect payment endpoints

## Support

For issues or questions:

1. Check error messages in response
2. Verify practice has provider configured
3. Ensure owner DB has currency-provider mapping
4. Check API key validity in provider dashboard
