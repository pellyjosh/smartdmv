# Payment Provider Selection Logic - Clarification

## ✅ Correct Architecture

### Currency → Provider Mapping Location

**Owner Database (Centralized):**

- `provider_currency_support` table determines which provider should be used for each currency
- NGN → Paystack (recommended)
- USD → Stripe (recommended)
- GHS → Paystack (recommended)
- EUR → Stripe (recommended)
- etc.

**Tenant Database (Practice-Specific):**

- `practice_payment_providers` stores ONLY the practice's API keys for providers they want to use
- NO currency mapping here
- Each practice just configures the providers they need

**Practice Settings:**

- `practices.defaultCurrencyId` determines the practice's currency (e.g., NGN, USD)

## 🔄 Payment Flow

```
1. User clicks "Pay Now" on invoice
   ↓
2. Get practice's currency
   SELECT defaultCurrencyId FROM practices WHERE id = {practiceId}
   ↓
   JOIN currencies to get code (e.g., "NGN")
   ↓
3. Query Owner DB for recommended provider
   SELECT provider_id, provider_code
   FROM provider_currency_support
   WHERE currencyCode = "NGN"
   AND isRecommended = true
   ↓
   Result: Paystack
   ↓
4. Check if practice has Paystack configured (Tenant DB)
   SELECT * FROM practice_payment_providers
   WHERE practiceId = {practiceId}
   AND providerCode = "paystack"
   AND isEnabled = true
   ↓
5a. If YES: Use this provider's API keys to process payment
5b. If NO: Show error "Payment provider not configured for your currency"
```

## 🎯 Example Scenarios

### Scenario 1: NGN Practice

```
Practice Settings:
- defaultCurrencyId → 2 (NGN)

Owner DB Says:
- NGN → Use Paystack (isRecommended = true)

Tenant DB Check:
- Does practice have Paystack configured?
  → YES (has Paystack API keys)

Result: ✅ Pay with Paystack
```

### Scenario 2: USD Practice

```
Practice Settings:
- defaultCurrencyId → 1 (USD)

Owner DB Says:
- USD → Use Stripe (isRecommended = true)

Tenant DB Check:
- Does practice have Stripe configured?
  → YES (has Stripe API keys)

Result: ✅ Pay with Stripe
```

### Scenario 3: Missing Configuration

```
Practice Settings:
- defaultCurrencyId → 2 (NGN)

Owner DB Says:
- NGN → Use Paystack

Tenant DB Check:
- Does practice have Paystack configured?
  → NO (only has Stripe configured)

Result: ❌ Error: "Please configure Paystack in payment settings"
```

### Scenario 4: Multi-Currency Practice

Some practices might support multiple currencies (future feature):

```
Practice Settings:
- defaultCurrencyId → 1 (USD)
- additionalCurrencies → [NGN, GHS] (future)

Configured Providers (Tenant DB):
- Stripe (for USD)
- Paystack (for NGN, GHS)

Invoice Currency: NGN
Owner DB Says: NGN → Paystack
Check: ✅ Paystack configured
Result: ✅ Pay with Paystack

Invoice Currency: USD
Owner DB Says: USD → Stripe
Check: ✅ Stripe configured
Result: ✅ Pay with Stripe
```

## 📊 Database Design Rationale

### Why Owner DB Controls Currency Mapping?

1. **Centralized Knowledge**: Platform owner knows which providers work best for which currencies
2. **Easy Updates**: Change provider recommendations globally without touching tenant DBs
3. **New Providers**: Add support for new currencies/providers centrally
4. **Fees & Limits**: Currency-specific transaction fees stored once in Owner DB

### Why NOT in Tenant DB?

1. **Redundancy**: Every practice would duplicate the same currency → provider knowledge
2. **Inconsistency**: Different practices might choose suboptimal providers
3. **Maintenance**: Updating currency support requires migrating all tenant DBs
4. **Expertise**: Practice admins shouldn't need to know which provider is best for their currency

## 🔧 Configuration Steps

### For Platform Owner:

1. Add provider to Owner DB (`payment_providers`)
2. Map currencies to provider (`provider_currency_support`)
3. Mark recommended provider per currency (`isRecommended = true`)

### For Practice Admin:

1. Go to Payment Settings
2. See recommended provider for their currency (auto-shown based on their practice currency)
3. Enter API keys for that provider
4. Enable provider
5. Done! No need to choose currencies

## ✨ Benefits

✅ **Simple for Practices**: Just configure the provider, no currency selection needed  
✅ **Optimal Selection**: Platform ensures best provider for each currency  
✅ **Flexible**: Owner can change recommendations without affecting practices  
✅ **Scalable**: New currencies/providers added centrally  
✅ **Smart Defaults**: System auto-selects based on practice's currency setting

## 🚀 Future: Multiple Providers Per Currency

The system can support this:

```sql
-- Owner DB: Mark multiple providers as available for USD
provider_currency_support:
  - Stripe + USD (isRecommended = true, priority = 10)
  - Paystack + USD (isRecommended = false, priority = 5)

-- Tenant DB: Practice configures both
practice_payment_providers:
  - Stripe (priority = 10)
  - Paystack (priority = 5)

-- Selection Logic:
1. Get all providers that support practice's currency (from Owner DB)
2. Filter by configured providers (from Tenant DB where isEnabled = true)
3. Sort by priority (descending)
4. Use highest priority provider
```

This allows:

- Failover if primary provider is down
- Load balancing between providers
- A/B testing different providers
- Practice-specific provider preferences

---

**Summary:** Currency in practice settings → Owner DB recommends provider → Practice configures that provider → Payment uses configured provider. Clean and simple! 🎉
