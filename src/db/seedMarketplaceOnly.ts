import { config } from 'dotenv';
config(); // Load environment variables from .env file

import { seedMarketplaceData } from './seedMarketplaceData';

async function seedMarketplaceOnly() {
  console.log('🛍️ Starting marketplace-only seeding...');
  
  try {
    await seedMarketplaceData();
    console.log('🎉 Marketplace seeding completed successfully!');
  } catch (error) {
    console.error('❌ Marketplace seeding failed:', error);
    process.exit(1);
  }
}

seedMarketplaceOnly();
