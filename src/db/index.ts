
import { config } from 'dotenv';
config(); // Load environment variables at the very top

// For AWS RDS with self-signed certificates, disable TLS rejection
if (process.env.DATABASE_URL?.includes('amazonaws.com')) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  console.log('[DB_INIT] Disabled TLS certificate verification for AWS RDS');
}

// Use node-postgres and Drizzle Postgres adapter for AWS RDS
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

// ✅ Ensure this file is treated as a module
export {};

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set.');
}

console.log('[DB_INIT] Using PostgreSQL database (node-postgres + Drizzle)');

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

const connectionString = normalizeConnectionString(process.env.DATABASE_URL!);

// Configure SSL for production RDS
const poolConfig: any = { connectionString };
// Always disable SSL certificate verification for AWS RDS self-signed certs
if (connectionString.includes('sslmode=require') || connectionString.includes('amazonaws.com')) {
  poolConfig.ssl = { rejectUnauthorized: false };
  console.log('[DB_INIT] SSL configured with rejectUnauthorized: false for AWS RDS');
}

// Create a pg Pool from DATABASE_URL. Drizzle will use this pool for queries.
const pool = new Pool(poolConfig);

// Create the Drizzle instance using the pg pool
const dbInstance = drizzle(pool, { schema, logger: process.env.NODE_ENV === 'development' });

console.log('✅ PostgreSQL Drizzle instance created.');

export const db = dbInstance;
// Also export the raw pg Pool for low-level queries when needed
export const pgPool = pool;
