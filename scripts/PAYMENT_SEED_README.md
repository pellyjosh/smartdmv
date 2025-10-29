# Owner Payment Configuration Seed Scripts

These scripts allow you to seed payment provider configurations into the owner database without using the admin portal.

## Prerequisites

- `APP_KEY` environment variable must be set (64-character hex string for AES-256 encryption)
- Owner database must be running and accessible
- Payment providers must exist in the `payment_providers` table

## Scripts

### 1. Interactive Seed (Recommended for first-time setup)

Prompts you for all configuration details:

```bash
npm run db:owner:payment
```

This will:

1. Show available payment providers
2. Ask for configuration name
3. Request environment (production/sandbox)
4. Prompt for API keys (public key, secret key, webhook secret)
5. Ask for additional settings
6. Display summary and ask for confirmation
7. Encrypt and save to database

### 2. Quick Seed (Command-line arguments)

For automation or quick updates:

```bash
npm run db:owner:payment:quick -- --provider=stripe --pk=pk_test_... --sk=sk_test_... --env=sandbox
```

**Required Arguments:**

- `--provider=<code>` - Payment provider code (stripe, paystack, flutterwave)
- `--sk=<secret_key>` - Secret/Private API key

**Optional Arguments:**

- `--pk=<public_key>` - Public/Publishable API key
- `--webhook=<secret>` - Webhook secret
- `--name=<name>` - Configuration name (default: "[Provider] [Environment]")
- `--env=<environment>` - Environment: production or sandbox (default: sandbox)
- `--currency=<code>` - Default currency code (default: USD)
- `--default=<bool>` - Set as default config (default: true)
- `--currencies=<list>` - Comma-separated list of supported currencies
- `--notes=<text>` - Configuration notes

## Examples

### Example 1: Stripe Sandbox (Interactive)

```bash
npm run db:owner:payment
```

Then follow the prompts:

```
Select provider number: 1
Configuration name: Development Stripe
Environment: sandbox
Default currency: USD
Public Key: pk_test_51ABC...
Secret Key: sk_test_51ABC...
Webhook Secret: whsec_...
Set as default? y
```

### Example 2: Stripe Sandbox (Quick)

```bash
npm run db:owner:payment:quick -- \
  --provider=stripe \
  --pk=pk_test_51ABCxyz... \
  --sk=sk_test_51ABCxyz... \
  --webhook=whsec_abc123... \
  --env=sandbox \
  --name="Development Stripe"
```

### Example 3: Stripe Production

```bash
npm run db:owner:payment:quick -- \
  --provider=stripe \
  --pk=pk_live_51ABCxyz... \
  --sk=sk_live_51ABCxyz... \
  --webhook=whsec_xyz789... \
  --env=production \
  --currency=USD \
  --default=true
```

### Example 4: Paystack Production (Multiple Currencies)

```bash
npm run db:owner:payment:quick -- \
  --provider=paystack \
  --sk=sk_live_abc123... \
  --env=production \
  --currency=NGN \
  --currencies=NGN,USD,GHS \
  --name="Production Paystack"
```

### Example 5: Flutterwave Sandbox

```bash
npm run db:owner:payment:quick -- \
  --provider=flutterwave \
  --pk=FLWPUBK_TEST-... \
  --sk=FLWSECK_TEST-... \
  --env=sandbox \
  --currency=USD
```

### Example 6: Update Existing Configuration

To update, use the same provider and name:

```bash
npm run db:owner:payment:quick -- \
  --provider=stripe \
  --name="Production Stripe" \
  --pk=pk_live_NEW_KEY... \
  --sk=sk_live_NEW_KEY... \
  --env=production
```

## Security Notes

- **Keys are encrypted** using AES-256-CBC encryption before storing in database
- Encryption key is derived from `APP_KEY` environment variable
- Keys are stored in format: `iv:encryptedData`
- Never commit actual API keys to version control
- Use environment variables or secure key management for production

## After Seeding

1. **Verify Configuration:**

   ```bash
   curl -X POST http://localhost:9002/api/owner/payment-configs/1/verify
   ```

2. **Check Database:**

   ```bash
   npm run db:owner:studio
   ```

   Look at `owner_payment_configurations` table

3. **Test Marketplace Purchase:**
   - Login to a practice
   - Go to `/marketplace`
   - Try purchasing an addon
   - Check `tenant_billing_transactions` table for records

## Troubleshooting

### Error: APP_KEY environment variable is required

Make sure `APP_KEY` is set in your `.env` file:

```env
APP_KEY=your_64_character_hex_string_here
```

Generate a new key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Error: Provider not found

Available providers are managed in the `payment_providers` table. Check which providers are active:

```sql
SELECT code, name, status FROM payment_providers WHERE status = 'active';
```

### Error: Public key required

Some providers (like Stripe) require both public and secret keys. Make sure to include `--pk`:

```bash
--pk=pk_test_... --sk=sk_test_...
```

### Configuration Already Exists

The script will automatically update existing configurations if you use the same provider and name. To create a new configuration, use a different name:

```bash
--name="Production Stripe v2"
```

## Database Schema

### owner_payment_configurations

```sql
CREATE TABLE owner_payment_configurations (
  id SERIAL PRIMARY KEY,
  provider_id INTEGER NOT NULL,
  config_name TEXT NOT NULL,
  public_key TEXT,              -- Encrypted
  secret_key TEXT NOT NULL,     -- Encrypted
  webhook_secret TEXT,          -- Encrypted
  environment TEXT DEFAULT 'sandbox',
  default_currency TEXT DEFAULT 'USD',
  supported_currencies JSON,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  last_verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Related Files

- `/src/lib/payments/payment-handler.ts` - Main payment processing logic
- `/src/app/api/owner/payment-configs/` - API endpoints for managing configs
- `/src/owner/db/schemas/paymentConfigSchema.ts` - Database schema definition
- `/MARKETPLACE_PAYMENT_INTEGRATION.md` - Full documentation
