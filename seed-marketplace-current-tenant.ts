#!/usr/bin/env tsx

import { seedMarketplaceData } from './src/db/seedMarketplaceData';

async function main() {
  try {
    console.log('🌱 Seeding marketplace data for current tenant...');
    await seedMarketplaceData();
    console.log('✅ Marketplace seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding marketplace data:', error);
    process.exit(1);
  }
}

main();
