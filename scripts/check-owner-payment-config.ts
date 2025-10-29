// scripts/check-owner-payment-config.ts
import 'dotenv/config';
import { ownerDb } from '../src/owner/db/config';
import { ownerPaymentConfigurations, paymentProviders } from '../src/owner/db/schema';
import { eq } from 'drizzle-orm';

async function checkConfig() {
  try {
    console.log('🔍 Checking owner payment configuration...\n');
    console.log('📊 Database URL:', process.env.OWNER_DATABASE_URL?.substring(0, 50) + '...\n');

    // Get all payment configurations
    const configs = await ownerDb
      .select({
        config: ownerPaymentConfigurations,
        provider: paymentProviders,
      })
      .from(ownerPaymentConfigurations)
      .leftJoin(paymentProviders, eq(ownerPaymentConfigurations.providerId, paymentProviders.id));

    console.log(`📋 Found ${configs.length} payment configuration(s):\n`);

    if (configs.length === 0) {
      console.log('❌ No payment configurations found!');
      console.log('💡 Run: npm run db:owner:payment\n');
      process.exit(1);
    }

    configs.forEach((item, index) => {
      const c = item.config;
      const p = item.provider;
      console.log(`${index + 1}. Configuration ID: ${c.id}`);
      console.log(`   Name: ${c.configName}`);
      console.log(`   Provider: ${p?.name} (${p?.code})`);
      console.log(`   Environment: ${c.environment}`);
      console.log(`   Currency: ${c.defaultCurrency}`);
      console.log(`   Supported Currencies: ${c.supportedCurrencies?.join(', ') || 'None'}`);
      console.log(`   Is Active: ${c.isActive ? '✓' : '✗'}`);
      console.log(`   Is Verified: ${c.isVerified ? '✓' : '✗'}`);
      console.log(`   Is Default: ${c.isDefault ? '✓' : '✗'}`);
      console.log(`   Created: ${c.createdAt}`);
      console.log('');
    });

    // Check what NODE_ENV is
    console.log('🔧 Current Environment:');
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Looking for: ${process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'}`);
    console.log('');

    // Find matching config for current environment
    const matchingConfig = configs.find(item => 
      item.config.isActive && 
      item.config.isVerified &&
      item.config.environment === (process.env.NODE_ENV === 'production' ? 'production' : 'sandbox')
    );

    if (!matchingConfig) {
      console.log('⚠️  No verified configuration found for current environment!');
      console.log('💡 Run the verify script to mark it as verified:');
      console.log('   NODE_TLS_REJECT_UNAUTHORIZED=0 tsx scripts/verify-payment-config.ts\n');
    } else {
      console.log('✅ Active verified configuration found for current environment!');
      console.log(`   Using: ${matchingConfig.config.configName}\n`);
    }

  } catch (error) {
    console.error('❌ Error checking configuration:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

checkConfig();
