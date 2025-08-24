// src/owner/db/config.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { ownerSchema } from './schema';

// Owner database connection (uses the main database)
const ownerDbUrl = process.env.DATABASE_URL;

if (!ownerDbUrl) {
  throw new Error('DATABASE_URL environment variable is required');
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

const connectionString = normalizeConnectionString(ownerDbUrl);

// Configure SSL for production RDS
const poolConfig: any = { connectionString };
if (process.env.NODE_ENV === 'production' || connectionString.includes('sslmode=require')) {
  poolConfig.ssl = { rejectUnauthorized: false }; // For RDS with self-signed certs
}

const pool = new Pool(poolConfig);
export const ownerDb = drizzle(pool, { schema: ownerSchema });

// Export individual tables for easier access
export const {
  companies,
  companyDatabases,
  companyUsers,
  subscriptions,
  billingHistory,
} = ownerSchema;
