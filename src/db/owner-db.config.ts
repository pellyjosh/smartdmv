// src/db/owner-db.config.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as companySchema from './schemas/companySchema';

// Owner database connection - this is your central management database
const ownerConnectionString = process.env.OWNER_DATABASE_URL || process.env.DATABASE_URL;

if (!ownerConnectionString) {
  throw new Error('OWNER_DATABASE_URL is not defined');
}

const ownerSql = postgres(ownerConnectionString);
export const ownerDb = drizzle(ownerSql, { schema: companySchema });

// Export the company schema for use in owner operations
export * from './schemas/companySchema';
