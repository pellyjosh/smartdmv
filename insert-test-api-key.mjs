import { db } from './src/db/index.js';
import { integrationApiKeys } from './src/db/schema.js';

async function insertTestApiKey() {
  try {
    const result = await db.insert(integrationApiKeys).values({
      practiceId: 1,
      keyName: 'Test API Key',
      keyHash: '625faa3fbbc3d2bd9d6ee7678d04cc5339cb33dc68d9b58451853d60046e226a',
      keyPrefix: 'test',
      permissions: '["widget:read"]',
      scopes: '["widget"]',
      isActive: true,
      rateLimitPerHour: 1000,
      rateLimitPerDay: 10000
    }).returning();
    
    console.log('Inserted API key:', result);
    process.exit(0);
  } catch (error) {
    console.error('Error inserting API key:', error);
    process.exit(1);
  }
}

insertTestApiKey();
