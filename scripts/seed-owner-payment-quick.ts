// scripts/seed-owner-payment-quick.ts
// Quick seed for owner payment configurations with command-line arguments
// Usage: tsx scripts/seed-owner-payment-quick.ts --provider=stripe --pk=pk_test_... --sk=sk_test_... --env=sandbox

import 'dotenv/config';
import { ownerDb } from '../src/owner/db/config';
import { ownerPaymentConfigurations, paymentProviders } from '../src/owner/db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

// Use APP_KEY from environment for encryption
const ENCRYPTION_KEY = process.env.APP_KEY;
if (!ENCRYPTION_KEY) {
  throw new Error('APP_KEY environment variable is required for payment encryption');
}
const ALGORITHM = 'aes-256-cbc';

/**
 * Encrypt sensitive data
 */
function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY!, 'hex');
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Parse command-line arguments
 */
function parseArgs() {
  const args: Record<string, string> = {};
  process.argv.slice(2).forEach(arg => {
    const [key, value] = arg.split('=');
    if (key.startsWith('--')) {
      args[key.substring(2)] = value || 'true';
    }
  });
  return args;
}

/**
 * Display usage instructions
 */
function showUsage() {
  console.log(`
🔐 Quick Owner Payment Configuration Seed

Usage:
  tsx scripts/seed-owner-payment-quick.ts [options]

Required Options:
  --provider=<code>     Payment provider code (stripe, paystack, flutterwave)
  --sk=<secret_key>     Secret/Private API key

Optional Options:
  --pk=<public_key>     Public/Publishable API key (required for some providers)
  --webhook=<secret>    Webhook secret (optional)
  --name=<name>         Configuration name (default: "[Provider] [Environment]")
  --env=<environment>   Environment: production or sandbox (default: sandbox)
  --currency=<code>     Default currency code (default: USD)
  --default=<bool>      Set as default config (default: true)
  --currencies=<list>   Comma-separated list of supported currencies (optional)
  --notes=<text>        Configuration notes (optional)

Examples:

  # Stripe sandbox
  tsx scripts/seed-owner-payment-quick.ts \\
    --provider=stripe \\
    --pk=pk_test_51ABC... \\
    --sk=sk_test_51ABC... \\
    --env=sandbox

  # Paystack production
  tsx scripts/seed-owner-payment-quick.ts \\
    --provider=paystack \\
    --sk=sk_live_abc123... \\
    --env=production \\
    --currency=NGN \\
    --currencies=NGN,USD,GHS

  # Update existing (use same provider and name)
  tsx scripts/seed-owner-payment-quick.ts \\
    --provider=stripe \\
    --name="Production Stripe" \\
    --pk=pk_live_new... \\
    --sk=sk_live_new... \\
    --env=production
`);
}

/**
 * Main seeding function
 */
async function seedPaymentConfig() {
  try {
    const args = parseArgs();

    // Show help if requested
    if (args.help || args.h) {
      showUsage();
      process.exit(0);
    }

    // Validate required arguments
    if (!args.provider || !args.sk) {
      console.error('❌ Error: Missing required arguments\n');
      showUsage();
      process.exit(1);
    }

    const providerCode = args.provider.toLowerCase();
    const secretKey = args.sk;
    const publicKey = args.pk || null;
    const webhookSecret = args.webhook || null;
    const environment = (args.env || 'sandbox') as 'production' | 'sandbox';
    const defaultCurrency = (args.currency || 'USD').toUpperCase();
    const isDefault = args.default !== 'false';
    const notes = args.notes || null;
    
    const supportedCurrencies = args.currencies 
      ? args.currencies.split(',').map(c => c.trim().toUpperCase())
      : null;

    // Validate environment
    if (environment !== 'production' && environment !== 'sandbox') {
      console.error('❌ Error: Environment must be "production" or "sandbox"');
      process.exit(1);
    }

    console.log('🔐 Seeding Owner Payment Configuration\n');

    // Find provider
    const [provider] = await ownerDb
      .select()
      .from(paymentProviders)
      .where(
        and(
          eq(paymentProviders.code, providerCode),
          eq(paymentProviders.status, 'active')
        )
      )
      .limit(1);

    if (!provider) {
      console.error(`❌ Error: Provider "${providerCode}" not found or not active`);
      console.log('\nAvailable providers:');
      const availableProviders = await ownerDb
        .select()
        .from(paymentProviders)
        .where(eq(paymentProviders.status, 'active'));
      availableProviders.forEach(p => console.log(`  - ${p.code} (${p.name})`));
      process.exit(1);
    }

    // Validate required keys for provider
    if (provider.requiresPublicKey && !publicKey) {
      console.error(`❌ Error: ${provider.name} requires a public key (use --pk=...)`);
      process.exit(1);
    }

    // Default configuration name
    const configName = args.name || `${provider.name} ${environment.charAt(0).toUpperCase() + environment.slice(1)}`;

    // Display configuration
    console.log('📋 Configuration:');
    console.log('─────────────────────────────────────');
    console.log(`Provider:          ${provider.name} (${provider.code})`);
    console.log(`Configuration:     ${configName}`);
    console.log(`Environment:       ${environment}`);
    console.log(`Default Currency:  ${defaultCurrency}`);
    console.log(`Public Key:        ${publicKey ? '****' + publicKey.slice(-4) : 'Not provided'}`);
    console.log(`Secret Key:        ****${secretKey.slice(-4)}`);
    console.log(`Webhook Secret:    ${webhookSecret ? '****' + webhookSecret.slice(-4) : 'Not provided'}`);
    console.log(`Is Default:        ${isDefault ? 'Yes' : 'No'}`);
    console.log(`Supported Currencies: ${supportedCurrencies ? supportedCurrencies.join(', ') : 'Provider defaults'}`);
    if (notes) console.log(`Notes:             ${notes}`);
    console.log('─────────────────────────────────────\n');

    // Encrypt keys
    console.log('🔐 Encrypting keys...');
    const encryptedPublicKey = publicKey ? encrypt(publicKey) : null;
    const encryptedSecretKey = encrypt(secretKey);
    const encryptedWebhookSecret = webhookSecret ? encrypt(webhookSecret) : null;

    // Check if configuration exists
    const existingConfig = await ownerDb
      .select()
      .from(ownerPaymentConfigurations)
      .where(
        and(
          eq(ownerPaymentConfigurations.providerId, provider.id),
          eq(ownerPaymentConfigurations.configName, configName)
        )
      )
      .limit(1);

    if (existingConfig.length > 0) {
      console.log('⚠️  Configuration exists. Updating...\n');
      
      // If setting as default, unset others first
      if (isDefault) {
        await ownerDb
          .update(ownerPaymentConfigurations)
          .set({ isDefault: false })
          .where(eq(ownerPaymentConfigurations.providerId, provider.id));
      }

      // Update existing
      const [updated] = await ownerDb
        .update(ownerPaymentConfigurations)
        .set({
          publicKey: encryptedPublicKey,
          secretKey: encryptedSecretKey,
          webhookSecret: encryptedWebhookSecret,
          environment,
          defaultCurrency,
          supportedCurrencies,
          isDefault,
          isActive: true,
          isVerified: false, // Reset verification
          lastVerifiedAt: null,
          notes,
          updatedAt: new Date(),
        })
        .where(eq(ownerPaymentConfigurations.id, existingConfig[0].id))
        .returning();

      console.log('✅ Configuration updated successfully!');
      console.log(`   ID: ${updated.id}`);
      console.log(`   Name: ${updated.configName}`);
      console.log(`   Provider: ${provider.name}`);
      console.log(`   Environment: ${updated.environment}`);
      console.log(`   Default: ${updated.isDefault ? 'Yes' : 'No'}`);
    } else {
      console.log('Creating new configuration...\n');
      
      // If setting as default, unset others first
      if (isDefault) {
        await ownerDb
          .update(ownerPaymentConfigurations)
          .set({ isDefault: false })
          .where(eq(ownerPaymentConfigurations.providerId, provider.id));
      }

      // Create new configuration
      const [newConfig] = await ownerDb
        .insert(ownerPaymentConfigurations)
        .values({
          providerId: provider.id,
          configName,
          publicKey: encryptedPublicKey,
          secretKey: encryptedSecretKey,
          webhookSecret: encryptedWebhookSecret,
          environment,
          defaultCurrency,
          supportedCurrencies,
          isActive: true,
          isDefault,
          isVerified: false,
          notes,
        })
        .returning();

      console.log('✅ Configuration created successfully!');
      console.log(`   ID: ${newConfig.id}`);
      console.log(`   Name: ${newConfig.configName}`);
      console.log(`   Provider: ${provider.name}`);
      console.log(`   Environment: ${newConfig.environment}`);
      console.log(`   Default: ${newConfig.isDefault ? 'Yes' : 'No'}`);
    }

    console.log('\n💡 Next steps:');
    console.log('   1. Verify configuration with: curl -X POST http://localhost:9002/api/owner/payment-configs/[id]/verify');
    console.log('   2. Test marketplace purchase');
    console.log('   3. Check tenant_billing_transactions for records\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the seed script
seedPaymentConfig();
