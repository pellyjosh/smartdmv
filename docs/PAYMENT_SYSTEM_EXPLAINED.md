# Payment Provider System - Complete Explanation

## 🎯 What You Asked For

> "I want the most simplest implementation that allows tenant to use the saved information in DB to make payment via the right provider"

**✅ DELIVERED**: One function (`createPayment`) that automatically picks the right provider and processes payments.

---

## 📦 What's in `/src/lib/payments/`

### 1. **`simple-payment-handler.ts`** ⭐ (THIS IS WHAT YOU NEED)

**Purpose**: Main payment processing logic

**What it does**:

1. Takes `practiceId`, `amount`, `email`
2. Reads practice currency from tenant DB
3. Finds which provider supports that currency from owner DB
4. Gets practice's API keys from tenant DB
5. Creates payment with correct provider
6. Returns payment URL to redirect customer

**Functions**:

- `createPayment()` - Create a new payment
- `verifyPayment()` - Check if payment succeeded (for webhooks)

**Example**:

```typescript
const result = await createPayment({
  practiceId: 1,
  amount: 50.0,
  email: "customer@example.com",
});

// Redirect customer to: result.paymentUrl
```

---

### 2. **`providers/types.ts`** (Reference definitions)

**Purpose**: TypeScript type definitions

**What's in it**:

- `PaymentParams` - What you send to create payment
- `PaymentResponse` - What you get back
- `ProviderConfig` - How provider is configured
- Other interfaces for advanced features

**You don't need to import this directly** - the simple handler uses it internally.

---

### 3. **`providers/base.ts`** (Common utilities)

**Purpose**: Shared functionality for payment providers

**What's in it**:

- Currency conversion (dollars to cents)
- Configuration validation
- Helper methods

**You don't use this directly** - it's used by the handler internally.

---

### 4. **`providers.ts`** (OLD FILE - Can be deleted)

**Status**: ⚠️ LEGACY CODE

This was the old hardcoded implementation. You can delete it or ignore it. The new `simple-payment-handler.ts` replaces it entirely.

---

## 🔄 How Payment Flow Works

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Customer clicks "Pay Now" on your website                │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Your frontend calls: POST /api/payments/create          │
│    Body: { practiceId: 1, amount: 50, email: "..." }       │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. API route calls: createPayment(...)                     │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Handler reads Tenant DB:                                 │
│    - Gets practice currency (NGN, USD, etc.)                │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Handler reads Owner DB:                                  │
│    - Finds which provider supports that currency            │
│    - Example: NGN → Paystack, USD → Stripe                  │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Handler reads Tenant DB again:                           │
│    - Gets practice's API keys for selected provider         │
│    - Example: Paystack keys for this practice               │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Handler calls Stripe or Paystack API:                   │
│    - Creates payment intent/transaction                     │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. Returns payment URL:                                     │
│    { success: true, paymentUrl: "https://..." }             │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 9. Frontend redirects customer to payment URL               │
│    - Stripe checkout page OR Paystack payment page          │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 10. Customer completes payment                              │
│     - Enters card details                                   │
│     - Provider processes payment                            │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 11. Provider sends webhook to your server (optional)        │
│     - Confirms payment succeeded                            │
│     - You mark invoice as paid                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Database Tables Used

### **Owner Database** (Centralized)

#### `payment_providers`

```sql
- id: 1
- code: "stripe"
- name: "Stripe"
- supportedRegions: ["Global"]
- status: "ACTIVE"
```

#### `provider_currency_support`

```sql
- providerId: 1 (Stripe)
- currencyCode: "USD"
- priority: 1
- processingFee: 2.9
```

### **Tenant Database** (Per-Practice)

#### `practices`

```sql
- id: 1
- name: "ABC Veterinary"
- defaultCurrencyId: 3
```

#### `currencies`

```sql
- id: 3
- code: "USD"
- name: "US Dollar"
```

#### `practice_payment_providers`

```sql
- practiceId: 1
- providerCode: "stripe"
- publicKey: "pk_test_..."
- secretKeyEncrypted: "sk_test_..." (encrypted)
- enabled: true
```

---

## 💡 Simple Usage Examples

### Example 1: Booking Payment

```typescript
// In your appointment booking page
async function handlePayment(appointmentId: number) {
  const response = await fetch("/api/payments/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      practiceId: 1,
      amount: 75.0, // $75 consultation fee
      email: patient.email,
      description: "Veterinary consultation",
      metadata: { appointmentId },
    }),
  });

  const { paymentUrl } = await response.json();
  window.location.href = paymentUrl; // Redirect to Stripe/Paystack
}
```

### Example 2: Invoice Payment

```typescript
// In your invoice page
async function payInvoice(invoice: Invoice) {
  const result = await createPayment({
    practiceId: invoice.practiceId,
    amount: invoice.totalAmount,
    email: invoice.clientEmail,
    description: `Invoice #${invoice.number}`,
    metadata: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
    },
  });

  if (result.success) {
    router.push(result.paymentUrl);
  }
}
```

### Example 3: Product Purchase

```typescript
// In your product checkout
async function checkout(cart: CartItem[]) {
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const result = await createPayment({
    practiceId: currentPractice.id,
    amount: total,
    email: customer.email,
    description: "Product purchase",
    metadata: {
      items: cart.map((i) => ({ id: i.id, qty: i.quantity })),
    },
  });

  if (result.success) {
    // Redirect to payment page
    window.location.href = result.paymentUrl;
  } else {
    alert(result.error);
  }
}
```

---

## 🔧 Setup Required

### 1. Run Database Migration

```bash
# Push owner schema (adds payment tables)
npm run db:owner:push

# Push tenant schema (adds practice provider config)
npm run db:tenant:push
```

### 2. Seed Payment Providers

```bash
# Run seed script (creates Stripe and Paystack providers)
npm run seed:payment-providers
```

This creates:

- ✅ Stripe provider supporting 35+ currencies
- ✅ Paystack provider supporting NGN, GHS, ZAR, KES, USD
- ✅ Currency mappings (USD → Stripe, NGN → Paystack, etc.)

### 3. Configure Practice API Keys

Each practice needs to add their provider credentials in practice settings:

```typescript
// Save to practice_payment_providers table
{
  practiceId: 1,
  providerCode: 'stripe',
  publicKey: 'pk_test_51J...',
  secretKeyEncrypted: 'sk_test_51J...',  // Should be encrypted!
  webhookSecret: 'whsec_...',
  environment: 'sandbox',  // or 'production'
  enabled: true
}
```

### 4. Install Payment SDKs

```bash
npm install stripe
# Paystack doesn't need SDK (uses fetch)
```

---

## 🎨 What Makes This "Simple"

### ❌ What you DON'T need to do:

- ❌ Manually check which provider to use
- ❌ Write if/else statements for Stripe vs Paystack
- ❌ Handle currency conversion logic
- ❌ Import Stripe/Paystack SDKs in your code
- ❌ Manage API keys in your code
- ❌ Write separate functions for each provider

### ✅ What you DO:

- ✅ Call ONE function: `createPayment()`
- ✅ Pass simple parameters: practiceId, amount, email
- ✅ Get back payment URL
- ✅ Redirect customer
- ✅ Done! 🎉

---

## 🚀 Adding a New Provider (Future)

Let's say you want to add **Flutterwave**:

1. **Add to Owner DB** (one time):

```sql
INSERT INTO payment_providers (code, name, ...)
VALUES ('flutterwave', 'Flutterwave', ...);

INSERT INTO provider_currency_support (providerId, currencyCode)
VALUES (3, 'KES'), (3, 'UGX'), ...;
```

2. **Add handler function** in `simple-payment-handler.ts`:

```typescript
async function createFlutterwavePayment(...) {
  // Flutterwave API call
}
```

3. **Update switch statement**:

```typescript
if (providerCode === 'flutterwave') {
  return await createFlutterwavePayment(...);
}
```

4. **Practices configure keys** - no code changes needed!

---

## 🔐 Security Checklist

- [ ] Encrypt API keys in database (use KMS or encryption service)
- [ ] Validate webhook signatures before processing
- [ ] Use HTTPS in production
- [ ] Implement rate limiting on payment endpoints
- [ ] Log all payment attempts for audit
- [ ] Never expose secret keys to frontend
- [ ] Validate amounts on server-side (don't trust client)
- [ ] Set up PCI compliance if handling cards directly

---

## 📝 File Locations Summary

| File                                         | Purpose            | Use This?          |
| -------------------------------------------- | ------------------ | ------------------ |
| `src/lib/payments/simple-payment-handler.ts` | Main payment logic | ✅ YES             |
| `src/lib/payments/providers/types.ts`        | Type definitions   | ℹ️ Reference only  |
| `src/lib/payments/providers/base.ts`         | Utilities          | ℹ️ Internal use    |
| `src/lib/payments/providers.ts`              | Old implementation | ❌ Can delete      |
| `src/app/api/payments/create/route.ts`       | Example API        | ✅ Use as template |
| `docs/SIMPLE_PAYMENT_USAGE.md`               | Usage guide        | 📖 Read this       |

---

## ❓ Common Questions

**Q: Do I need to know Stripe or Paystack APIs?**  
A: No! The handler abstracts all provider-specific logic.

**Q: What if a practice wants to use both Stripe and Paystack?**  
A: The system picks one based on currency. For multi-provider support per practice, you'd need to add provider selection logic.

**Q: How do I test this?**  
A: Use `environment: 'sandbox'` in practice config and test API keys from Stripe/Paystack dashboards.

**Q: What about webhooks?**  
A: Add webhook endpoints later using `verifyPayment()` function.

**Q: Can I customize payment page?**  
A: Yes - both Stripe and Paystack support custom branding in their dashboards.

---

## 🎯 TL;DR (Too Long; Didn't Read)

1. **One file matters**: `simple-payment-handler.ts`
2. **One function to use**: `createPayment()`
3. **Three steps**:
   - Call `createPayment({ practiceId, amount, email })`
   - Get back `paymentUrl`
   - Redirect customer to URL
4. **System automatically**:
   - Picks right provider based on currency
   - Uses saved API keys from database
   - Handles Stripe or Paystack for you

**That's it!** 🚀
