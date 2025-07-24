// src/owner/db/config.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { ownerSchema } from './schema';

// Owner database connection (separate from tenant databases)
const ownerDbUrl = process.env.OWNER_DATABASE_URL || process.env.DATABASE_URL;

if (!ownerDbUrl) {
  throw new Error('OWNER_DATABASE_URL or DATABASE_URL environment variable is required');
}

const sql = postgres(ownerDbUrl);
export const ownerDb = drizzle(sql, { schema: ownerSchema });

// Export individual tables for easier access
export const {
  companies,
  companyDatabases,
  companyUsers,
  subscriptions,
  billingHistory,
} = ownerSchema;
