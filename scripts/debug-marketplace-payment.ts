// scripts/debug-marketplace-payment.ts
import 'dotenv/config';
import { ownerDb } from '../src/owner/db/config';
import { ownerPaymentConfigurations, paymentProviders } from '../src/owner/db/schema';
import { eq, and } from 'drizzle-orm';

async function debugPayment() {
  try {
    console.log('🐛 Debugging marketplace payment configuration lookup...\n');
    
    const nodeEnv = process.env.NODE_ENV;
    const environment = nodeEnv === 'production' ? 'production' : 'sandbox';
    
    console.log('Environment Variables:');
    console.log(`  NODE_ENV: ${nodeEnv || 'undefined'}`);
    console.log(`  Expected environment: ${environment}`);
    console.log('');

    // Simulate the exact query from payment-handler.ts
    console.log('🔍 Running payment configuration query...');
    console.log(`  Looking for: isActive=true, isVerified=true, environment='${environment}'`);
    console.log('');

    const [configResult] = await ownerDb
      .select({
        config: ownerPaymentConfigurations,
        provider: paymentProviders,
      })
      .from(ownerPaymentConfigurations)
      .leftJoin(paymentProviders, eq(ownerPaymentConfigurations.providerId, paymentProviders.id))
      .where(
        and(
          eq(ownerPaymentConfigurations.isActive, true),
          eq(ownerPaymentConfigurations.isVerified, true),
          eq(ownerPaymentConfigurations.environment, environment)
        )
      )
      .limit(1);

    if (!configResult || !configResult.config || !configResult.provider) {
      console.log('❌ No configuration found!');
      console.log('\nLet\'s check what configurations exist:\n');
      
      const allConfigs = await ownerDb
        .select()
        .from(ownerPaymentConfigurations);
      
      console.log(`Total configurations: ${allConfigs.length}`);
      allConfigs.forEach((c, i) => {
        console.log(`\n${i + 1}. ID: ${c.id}`);
        console.log(`   Name: ${c.configName}`);
        console.log(`   Environment: '${c.environment}' (match: ${c.environment === environment})`);
        console.log(`   Is Active: ${c.isActive}`);
        console.log(`   Is Verified: ${c.isVerified}`);
        console.log(`   Provider ID: ${c.providerId}`);
      });
    } else {
      console.log('✅ Configuration found!');
      console.log(`  Config: ${configResult.config.configName}`);
      console.log(`  Provider: ${configResult.provider.name} (${configResult.provider.code})`);
      console.log(`  Environment: ${configResult.config.environment}`);
      console.log(`  Currency: ${configResult.config.defaultCurrency}`);
      console.log(`  Supported: ${configResult.config.supportedCurrencies?.join(', ')}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

debugPayment();
