# Payment Provider Auto-Selection Implementation

## Overview

Implemented automatic payment provider selection based on practice currency configuration. Users no longer need to manually choose between Stripe and Paystack - the system automatically selects the appropriate provider based on their practice's configured currency.

## Business Logic

### Currency-Based Provider Selection

- **NGN (Nigerian Naira)** → **Paystack** (automatically redirects to Paystack checkout)
- **USD & All Other Currencies** → **Stripe** (shows payment form dialog)

## Technical Implementation

### Database Schema

#### Practices Table (`practices`)

```typescript
{
  paymentProviders: jsonb('payment_providers'),
  // Structure: {
  //   stripe: { publishableKey, secretKeyEncrypted, enabled },
  //   paystack: { publicKey, secretKeyEncrypted, enabled }
  // }

  paymentEnabled: boolean('payment_enabled').default(false),

  defaultCurrencyId: foreignKeyInt('default_currency_id').default(1)
  // References currencies.id
}
```

#### Currencies Table (`currencies`)

```typescript
{
  id: number,
  code: text, // e.g., "USD", "NGN"
  name: text,
  symbol: text // e.g., "$", "₦"
}
```

### Modified Files

#### `/src/app/client/billing/page.tsx`

**Key Changes:**

1. **Updated `handlePayInvoice` Function:**

   - Fetches practice data with currency relation via `/api/practices/[practiceId]`
   - Uses `practice.currency.code` instead of legacy `currency` field
   - Auto-detects provider based on currency code
   - For **Paystack (NGN)**: Immediately initializes payment and redirects to Paystack checkout page
   - For **Stripe (USD/others)**: Shows payment form dialog

2. **Removed Manual Provider Selection:**

   - `showProviderDialog` is no longer shown to users
   - Provider selection dialog still exists in code but is bypassed
   - Users get seamless experience without choosing provider

3. **Added Visual Indicator:**
   - Payment dialog shows a badge indicating which provider is being used
   - Displays "Stripe" or "Paystack" in the dialog header

### Payment Flow

#### For NGN Currency (Paystack):

```
User clicks "Pay Now"
  ↓
System fetches practice currency
  ↓
Detects NGN currency code
  ↓
Sets selectedProvider = "paystack"
  ↓
Initializes Paystack payment
  ↓
Redirects to Paystack checkout page
```

#### For USD/Other Currencies (Stripe):

```
User clicks "Pay Now"
  ↓
System fetches practice currency
  ↓
Detects USD or other currency code
  ↓
Sets selectedProvider = "stripe"
  ↓
Shows payment form dialog with Stripe badge
  ↓
User enters card details
  ↓
Processes payment via Stripe
```

## API Endpoints

### Practice API

- **Endpoint:** `GET /api/practices/[practiceId]`
- **Returns:** Practice data including currency relation
- **Usage:** Auto-detection of payment provider

### Payment APIs

- **Stripe:** `/api/billing/payments/create-intent`
- **Paystack:** `/api/billing/payments` (POST with provider: "paystack")

## Configuration Required

### For Each Practice:

1. **Set Currency:**

   - Update `practices.defaultCurrencyId` to reference appropriate currency
   - Ensure currency exists in `currencies` table

2. **Configure Payment Providers:**
   - Update `practices.paymentProviders` JSONB field
   - For NGN practices: Configure Paystack keys
   - For USD practices: Configure Stripe keys
   - Set `practices.paymentEnabled = true`

### Example Configuration:

**NGN Practice (Uses Paystack):**

```sql
UPDATE practices
SET defaultCurrencyId = (SELECT id FROM currencies WHERE code = 'NGN'),
    paymentProviders = '{
      "paystack": {
        "publicKey": "pk_test_xxx",
        "secretKeyEncrypted": "encrypted_sk_test_xxx",
        "enabled": true
      }
    }',
    paymentEnabled = true
WHERE id = 1;
```

**USD Practice (Uses Stripe):**

```sql
UPDATE practices
SET defaultCurrencyId = (SELECT id FROM currencies WHERE code = 'USD'),
    paymentProviders = '{
      "stripe": {
        "publishableKey": "pk_test_xxx",
        "secretKeyEncrypted": "encrypted_sk_test_xxx",
        "enabled": true
      }
    }',
    paymentEnabled = true
WHERE id = 2;
```

## Testing Checklist

- [ ] **NGN Currency Practice:**

  - [ ] Click "Pay Now" on invoice
  - [ ] Verify automatic redirect to Paystack checkout
  - [ ] Complete payment on Paystack
  - [ ] Verify callback and payment recording

- [ ] **USD Currency Practice:**

  - [ ] Click "Pay Now" on invoice
  - [ ] Verify payment dialog appears with "Stripe" badge
  - [ ] Enter card details
  - [ ] Verify payment processes via Stripe

- [ ] **Error Handling:**
  - [ ] Test with practice having no currency configured (should default to Stripe)
  - [ ] Test with invalid currency code (should default to Stripe)
  - [ ] Test with payment provider not configured (should show appropriate error)

## Benefits

✅ **Seamless User Experience:** No manual provider selection needed  
✅ **Currency-Aware:** Automatically uses the best provider for each currency  
✅ **Reduced Friction:** Fewer clicks to complete payment  
✅ **Clear Indication:** Badge shows which provider is being used  
✅ **Backwards Compatible:** Legacy currency field handling still works as fallback

## Future Enhancements

1. **Multi-Currency Support:** Add support for more currencies (EUR → Stripe, GHS → Paystack, etc.)
2. **Provider Preferences:** Allow practices to override default provider selection
3. **Payment Method Saved:** Save successful payment methods for faster future payments
4. **Analytics:** Track provider usage and success rates by currency

## Support

For issues or questions about payment provider configuration:

- Check practice `defaultCurrencyId` is set correctly
- Verify `paymentProviders` JSONB has correct provider configuration
- Ensure `paymentEnabled` is set to `true`
- Check payment provider API keys are valid and not expired
