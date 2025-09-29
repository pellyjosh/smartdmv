import { config } from 'dotenv';
config();

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as ownerSchema from './owner-schema';

// For AWS RDS with self-signed certificates, disable TLS rejection
if (process.env.OWNER_DATABASE_URL?.includes('amazonaws.com')) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
if (process.env.DEBUG_OWNER_DB === 'true') {
  console.log('[OWNER_DB_INIT] Disabled TLS certificate verification for AWS RDS');
}
}

if (!process.env.OWNER_DATABASE_URL) {
  throw new Error('OWNER_DATABASE_URL environment variable is not set.');
}

if (process.env.DEBUG_OWNER_DB === 'true') {
  console.log('[OWNER_DB_INIT] Using PostgreSQL owner database (node-postgres + Drizzle)');
}

// Normalize connection string for RDS (handle special characters in password)
function normalizeConnectionString(conn: string): string {
  try { new URL(conn); return conn; } catch (e) {}
  const m = conn.match(/^([^:]+:\/\/)([^@]+)@(.*)$/);
  if (m) {
    const [, scheme, userinfo, rest] = m;
    const parts = userinfo.split(':');
    if (parts.length >= 2) {
      const user = parts.shift()!;
      const pass = parts.join(':');
      const encPass = encodeURIComponent(pass);
      return `${scheme}${user}:${encPass}@${rest}`;
    }
  }
  return conn;
}

const ownerConnectionString = normalizeConnectionString(process.env.OWNER_DATABASE_URL!);

// Configure SSL for production RDS
const poolConfig: any = { connectionString: ownerConnectionString };
// Always disable SSL certificate verification for AWS RDS self-signed certs
if (ownerConnectionString.includes('sslmode=require') || ownerConnectionString.includes('amazonaws.com')) {
  poolConfig.ssl = { rejectUnauthorized: false };
  if (process.env.DEBUG_OWNER_DB === 'true') {
    console.log('[OWNER_DB_INIT] SSL configured with rejectUnauthorized: false for AWS RDS');
  }
}

// Create a pg Pool from OWNER_DATABASE_URL
const ownerPool = new Pool(poolConfig);

// Create the Drizzle instance using the pg pool with owner schema
const ownerDbInstance = drizzle(ownerPool, { 
  schema: ownerSchema, 
  logger: process.env.NODE_ENV === 'development' 
});

console.log('✅ PostgreSQL Owner Drizzle instance created.');

export const ownerDb = ownerDbInstance;
export const ownerPgPool = ownerPool;
