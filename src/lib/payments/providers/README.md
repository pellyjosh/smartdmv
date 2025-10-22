# Payment Providers

This folder contains all payment gateway implementations for the SmartDMV platform.

## Structure

```
providers/
├── index.ts       # Barrel export file
├── stripe.ts      # Stripe payment gateway
└── paystack.ts    # Paystack payment gateway
```

## Files Overview

### `stripe.ts` - Stripe Payment Gateway

Contains all Stripe-related functions:

#### **Main Functions:**

- `createStripePayment()` - Create a payment intent
- `verifyStripePayment()` - Verify payment status
- `refundStripePayment()` - Process refunds
- `validateStripeWebhook()` - Validate webhook signatures
- `createStripeCheckoutSession()` - Create hosted checkout page

#### **Usage Example:**

```typescript
import { createStripePayment } from "./providers/stripe";

const result = await createStripePayment({
  secretKey: "sk_test_...",
  publicKey: "pk_test_...",
  amount: 50.0,
  currency: "USD",
  email: "customer@example.com",
});

// Redirect to: result.clientSecret (for Stripe Elements)
```

---

### `paystack.ts` - Paystack Payment Gateway

Contains all Paystack-related functions:

#### **Main Functions:**

- `createPaystackPayment()` - Initialize transaction
- `verifyPaystackPayment()` - Verify payment status
- `refundPaystackPayment()` - Process refunds
- `validatePaystackWebhook()` - Validate webhook signatures
- `getPaystackBanks()` - Get list of banks for transfers
- `chargePaystackAuthorization()` - Charge saved cards
- `getPaystackTransactionTimeline()` - Get transaction history

#### **Usage Example:**

```typescript
import { createPaystackPayment } from "./providers/paystack";

const result = await createPaystackPayment({
  secretKey: "sk_test_...",
  publicKey: "pk_test_...",
  amount: 5000.0,
  currency: "NGN",
  email: "customer@example.com",
});

// Redirect to: result.authorizationUrl
```

---

### `index.ts` - Barrel Exports

Re-exports all provider functions for easier imports.

#### **Usage Example:**

```typescript
// Import from index
import { createStripePayment, createPaystackPayment } from "./providers";

// OR import directly
import { createStripePayment } from "./providers/stripe";
import { createPaystackPayment } from "./providers/paystack";
```

---

## How Payment Handler Uses These

The `payment-handler.ts` file imports these functions:

```typescript
import { createStripePayment, verifyStripePayment } from './providers/stripe';
import { createPaystackPayment, verifyPaystackPayment } from './providers/paystack';

// Then uses them based on selected provider
if (providerCode === 'stripe') {
  const result = await createStripePayment({...});
} else if (providerCode === 'paystack') {
  const result = await createPaystackPayment({...});
}
```

---

## Adding a New Provider

To add a new payment gateway (e.g., Flutterwave):

1. **Create provider file**: `flutterwave.ts`

```typescript
// src/lib/payments/providers/flutterwave.ts

export interface FlutterwavePaymentParams {
  secretKey: string;
  publicKey: string | null;
  amount: number;
  currency: string;
  email: string;
  // ... other params
}

export async function createFlutterwavePayment(
  params: FlutterwavePaymentParams
) {
  // Implementation here
}

export async function verifyFlutterwavePayment(
  txRef: string,
  secretKey: string
) {
  // Implementation here
}

// ... other functions
```

2. **Export from index.ts**:

```typescript
export {
  createFlutterwavePayment,
  verifyFlutterwavePayment,
  type FlutterwavePaymentParams,
} from "./flutterwave";
```

3. **Use in payment-handler.ts**:

```typescript
import { createFlutterwavePayment } from './providers/flutterwave';

// In createPayment function
else if (providerCode === 'flutterwave') {
  const result = await createFlutterwavePayment({...});
}
```

---

## Function Naming Convention

All provider functions follow this pattern:

- **Create Payment**: `create{Provider}Payment()`
- **Verify Payment**: `verify{Provider}Payment()`
- **Refund Payment**: `refund{Provider}Payment()`
- **Validate Webhook**: `validate{Provider}Webhook()`

Examples:

- ✅ `createStripePayment()`
- ✅ `verifyPaystackPayment()`
- ✅ `refundFlutterwavePayment()`
- ❌ `stripeCreatePayment()` (wrong order)
- ❌ `paystack_verify()` (wrong format)

---

## Key Features

### **Stripe Functions Include:**

- ✅ Payment Intents (for custom checkout)
- ✅ Checkout Sessions (for hosted checkout)
- ✅ Refunds
- ✅ Webhook validation with signature
- ✅ Currency conversion handling
- ✅ Automatic payment methods

### **Paystack Functions Include:**

- ✅ Transaction initialization
- ✅ Multiple payment channels (card, bank, USSD, etc.)
- ✅ Refunds
- ✅ Webhook validation with HMAC
- ✅ Bank list fetching
- ✅ Authorization charging (saved cards)
- ✅ Transaction timeline/history

---

## Return Value Patterns

All payment creation functions return:

```typescript
{
  success: boolean;
  paymentId?: string;
  paymentUrl?: string; // or clientSecret, authorizationUrl
  error?: string;
}
```

All verification functions return:

```typescript
{
  success: boolean;
  status: string;
  amount?: number;
  currency?: string;
  error?: string;
}
```

All refund functions return:

```typescript
{
  success: boolean;
  refundId?: string;
  amount?: number;
  error?: string;
}
```

---

## Testing

### **Stripe Test Cards:**

```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
3D Secure: 4000 0025 0000 3155
```

### **Paystack Test Cards:**

```
Success: 5060 6666 6666 6666 / CVV: 123 / PIN: 1234 / OTP: 123456
Decline: 5060 0000 0000 0000
```

---

## Error Handling

All functions handle errors gracefully:

```typescript
try {
  const result = await createStripePayment({...});
  if (!result.success) {
    console.error(result.error);
  }
} catch (error) {
  // Errors are caught internally and returned as { success: false, error: '...' }
}
```

---

## Important Notes

1. **Dynamic Imports**: Stripe SDK is imported dynamically to avoid bundling it when not needed
2. **No SDKs for Paystack**: Uses native `fetch()` API
3. **Currency Handling**: Amounts are converted to smallest unit (cents/kobo) internally
4. **Webhook Security**: Always validate webhook signatures before processing
5. **API Keys**: Never expose secret keys to frontend - only public keys

---

## Dependencies

### **Required:**

```bash
npm install stripe
```

### **Optional:**

- Paystack doesn't require any packages (uses fetch)

---

## Supported Currencies

### **Stripe:**

USD, EUR, GBP, CAD, AUD, JPY, and 130+ more currencies

### **Paystack:**

NGN, GHS, ZAR, KES, USD

---

## API Documentation

- **Stripe**: https://stripe.com/docs/api
- **Paystack**: https://paystack.com/docs/api

---

## Security Best Practices

✅ **DO:**

- Store API keys encrypted in database
- Validate all webhook signatures
- Use HTTPS in production
- Implement rate limiting
- Log all payment attempts

❌ **DON'T:**

- Expose secret keys to frontend
- Trust client-side amount values
- Skip webhook validation
- Store card details
- Hardcode API keys

---

## File Sizes

- `stripe.ts`: ~300 lines (6 functions)
- `paystack.ts`: ~400 lines (8 functions)
- `index.ts`: ~20 lines (exports)

**Total**: ~720 lines of well-documented, type-safe payment code
