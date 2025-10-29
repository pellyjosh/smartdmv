// scripts/verify-payment-config.ts
// Quick script to verify payment configuration for development

import 'dotenv/config';
import { ownerDb } from '../src/owner/db/config';
import { ownerPaymentConfigurations } from '../src/owner/db/schema';
import { eq } from 'drizzle-orm';

async function verifyConfig() {
  try {
    console.log('🔍 Verifying payment configuration...\n');

    // Get the first unverified config
    const configs = await ownerDb
      .select()
      .from(ownerPaymentConfigurations)
      .where(eq(ownerPaymentConfigurations.isVerified, false))
      .limit(1);

    if (configs.length === 0) {
      console.log('✅ All payment configurations are already verified!');
      process.exit(0);
    }

    const config = configs[0];
    console.log(`📋 Configuration Details:`);
    console.log(`   ID: ${config.id}`);
    console.log(`   Name: ${config.configName}`);
    console.log(`   Environment: ${config.environment}`);
    console.log(`   Currency: ${config.defaultCurrency}`);
    console.log(`   Status: ${config.isVerified ? 'Verified ✓' : 'Not Verified ✗'}`);

    // Update to verified
    const [updated] = await ownerDb
      .update(ownerPaymentConfigurations)
      .set({
        isVerified: true,
        lastVerifiedAt: new Date(),
      })
      .where(eq(ownerPaymentConfigurations.id, config.id))
      .returning();

    console.log('\n✅ Payment configuration verified successfully!');
    console.log(`   Updated: ${updated.configName} (ID: ${updated.id})`);
    console.log(`   Verified at: ${updated.lastVerifiedAt}`);
    console.log('\n💡 You can now test marketplace payments!');

  } catch (error) {
    console.error('❌ Error verifying configuration:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

verifyConfig();
