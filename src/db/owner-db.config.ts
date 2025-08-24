// src/db/owner-db.config.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as companySchema from './schemas/companySchema';

// Owner database connection - uses the same main database as tenant operations
const ownerConnectionString = process.env.DATABASE_URL;

if (!ownerConnectionString) {
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

const connectionString = normalizeConnectionString(ownerConnectionString);

// Configure SSL for production RDS
const poolConfig: any = { connectionString };
if (process.env.NODE_ENV === 'production' || connectionString.includes('sslmode=require')) {
  poolConfig.ssl = { rejectUnauthorized: false }; // For RDS with self-signed certs
}

const ownerPool = new Pool(poolConfig);
export const ownerDb = drizzle(ownerPool, { schema: companySchema });

// Export the company schema for use in owner operations
export * from './schemas/companySchema';
