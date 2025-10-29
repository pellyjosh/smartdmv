// scripts/seed-owner-payment-config.ts
// Seed owner payment configurations with encrypted API keys
// Usage: tsx scripts/seed-owner-payment-config.ts

import 'dotenv/config';
import { ownerDb } from '../src/owner/db/config';
import { ownerPaymentConfigurations, paymentProviders } from '../src/owner/db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import * as readline from 'readline';

// Use APP_KEY from environment for encryption (must be 32 bytes hex)
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
 * Prompt for user input
 */
function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Main seeding function
 */
async function seedOwnerPaymentConfig() {
  try {
    console.log('🔐 Owner Payment Configuration Seed Script\n');

    // Step 1: Select provider
    console.log('Available providers:');
    const providers = await ownerDb
      .select()
      .from(paymentProviders)
      .where(eq(paymentProviders.status, 'active'));

    if (providers.length === 0) {
      console.error('❌ No active payment providers found in the database.');
      console.log('Please seed payment providers first.');
      process.exit(1);
    }

    providers.forEach((provider, index) => {
      console.log(`  ${index + 1}. ${provider.name} (${provider.code})`);
    });

    const providerIndex = await prompt('\nSelect provider number: ');
    const selectedProvider = providers[parseInt(providerIndex) - 1];

    if (!selectedProvider) {
      console.error('❌ Invalid provider selection');
      process.exit(1);
    }

    console.log(`\n✓ Selected: ${selectedProvider.name}`);

    // Step 2: Get configuration details
    const configName = await prompt('\nConfiguration name (e.g., "Production Stripe", "Sandbox Paystack"): ');
    
    const environment = await prompt('Environment (production/sandbox) [sandbox]: ') || 'sandbox';
    if (environment !== 'production' && environment !== 'sandbox') {
      console.error('❌ Environment must be "production" or "sandbox"');
      process.exit(1);
    }

    const defaultCurrency = await prompt('Default currency (e.g., USD, NGN, GHS) [USD]: ') || 'USD';

    // Step 3: Get API keys
    console.log('\n🔑 Enter API Keys (will be encrypted):');
    
    let publicKey: string | null = null;
    if (selectedProvider.requiresPublicKey) {
      publicKey = await prompt('Public/Publishable Key: ');
      if (!publicKey) {
        console.error('❌ Public key is required for this provider');
        process.exit(1);
      }
    }

    const secretKey = await prompt('Secret Key: ');
    if (!secretKey) {
      console.error('❌ Secret key is required');
      process.exit(1);
    }

    let webhookSecret: string | null = null;
    if (selectedProvider.requiresWebhookSecret) {
      const webhookInput = await prompt('Webhook Secret (optional, press Enter to skip): ');
      webhookSecret = webhookInput || null;
    }

    // Step 4: Additional settings
    const isDefault = (await prompt('\nSet as default configuration? (y/n) [y]: ') || 'y').toLowerCase() === 'y';
    
    const supportedCurrenciesInput = await prompt('Supported currencies (comma-separated, press Enter for provider defaults): ');
    const supportedCurrencies = supportedCurrenciesInput 
      ? supportedCurrenciesInput.split(',').map(c => c.trim().toUpperCase())
      : null;

    const notes = await prompt('Notes (optional): ') || null;

    // Step 5: Confirm before saving
    console.log('\n📋 Configuration Summary:');
    console.log('─────────────────────────────────────');
    console.log(`Provider:          ${selectedProvider.name}`);
    console.log(`Configuration:     ${configName}`);
    console.log(`Environment:       ${environment}`);
    console.log(`Default Currency:  ${defaultCurrency}`);
    console.log(`Public Key:        ${publicKey ? '****' + publicKey.slice(-4) : 'Not provided'}`);
    console.log(`Secret Key:        ****${secretKey.slice(-4)}`);
    console.log(`Webhook Secret:    ${webhookSecret ? '****' + webhookSecret.slice(-4) : 'Not provided'}`);
    console.log(`Is Default:        ${isDefault ? 'Yes' : 'No'}`);
    console.log(`Supported Currencies: ${supportedCurrencies ? supportedCurrencies.join(', ') : 'Provider defaults'}`);
    if (notes) console.log(`Notes:             ${notes}`);
    console.log('─────────────────────────────────────');

    const confirm = (await prompt('\nSave this configuration? (y/n): ')).toLowerCase();
    if (confirm !== 'y' && confirm !== 'yes') {
      console.log('❌ Cancelled');
      process.exit(0);
    }

    // Step 6: Encrypt and save
    console.log('\n🔐 Encrypting keys...');
    const encryptedPublicKey = publicKey ? encrypt(publicKey) : null;
    const encryptedSecretKey = encrypt(secretKey);
    const encryptedWebhookSecret = webhookSecret ? encrypt(webhookSecret) : null;

    // Check if configuration with same name exists
    const existingConfig = await ownerDb
      .select()
      .from(ownerPaymentConfigurations)
      .where(
        and(
          eq(ownerPaymentConfigurations.providerId, selectedProvider.id),
          eq(ownerPaymentConfigurations.configName, configName)
        )
      )
      .limit(1);

    if (existingConfig.length > 0) {
      console.log('⚠️  Configuration with this name already exists. Updating...');
      
      // If setting as default, unset others first
      if (isDefault) {
        await ownerDb
          .update(ownerPaymentConfigurations)
          .set({ isDefault: false })
          .where(eq(ownerPaymentConfigurations.providerId, selectedProvider.id));
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
          isVerified: false, // Reset verification status when keys change
          lastVerifiedAt: null,
          notes,
          updatedAt: new Date(),
        })
        .where(eq(ownerPaymentConfigurations.id, existingConfig[0].id))
        .returning();

      console.log('✅ Configuration updated successfully!');
      console.log(`   ID: ${updated.id}`);
      console.log(`   Config: ${updated.configName}`);
      console.log(`   Provider: ${selectedProvider.name}`);
      console.log(`   Environment: ${updated.environment}`);
    } else {
      // If setting as default, unset others first
      if (isDefault) {
        await ownerDb
          .update(ownerPaymentConfigurations)
          .set({ isDefault: false })
          .where(eq(ownerPaymentConfigurations.providerId, selectedProvider.id));
      }

      // Create new configuration
      const [newConfig] = await ownerDb
        .insert(ownerPaymentConfigurations)
        .values({
          providerId: selectedProvider.id,
          configName,
          publicKey: encryptedPublicKey,
          secretKey: encryptedSecretKey,
          webhookSecret: encryptedWebhookSecret,
          environment,
          defaultCurrency,
          supportedCurrencies,
          isActive: true,
          isDefault,
          isVerified: false, // Needs verification
          notes,
        })
        .returning();

      console.log('✅ Configuration created successfully!');
      console.log(`   ID: ${newConfig.id}`);
      console.log(`   Config: ${newConfig.configName}`);
      console.log(`   Provider: ${selectedProvider.name}`);
      console.log(`   Environment: ${newConfig.environment}`);
    }

    console.log('\n💡 Next steps:');
    console.log('   1. Verify the configuration: POST /api/owner/payment-configs/[id]/verify');
    console.log('   2. Test a marketplace purchase to ensure it works');
    console.log('   3. Monitor tenant_billing_transactions table for payment records\n');

  } catch (error) {
    console.error('❌ Error seeding payment configuration:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the seed script
seedOwnerPaymentConfig();
