// src/db/tenant-db.config.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as tenantSchema from './schema'; // Your existing schema

// Tenant database connections cache
const tenantDbCache = new Map<string, any>();

export interface TenantDbConfig {
  host: string;
  dbName: string;
  port: number;
  user?: string;
  password?: string;
}

// Get tenant database connection
export function getTenantDb(config: TenantDbConfig) {
  const cacheKey = `${config.host}:${config.port}/${config.dbName}`;
  
  if (tenantDbCache.has(cacheKey)) {
    return tenantDbCache.get(cacheKey);
  }

  // Build connection string
  const baseUrl = process.env.DATABASE_URL!;
  const url = new URL(baseUrl);
  
  // Use tenant-specific database name
  url.pathname = `/${config.dbName}`;
  
  // Use tenant-specific credentials if provided
  if (config.user) {
    url.username = config.user;
  }
  if (config.password) {
    url.password = config.password;
  }
  
  // Use tenant-specific host and port if different
  if (config.host !== 'localhost') {
    url.hostname = config.host;
  }
  if (config.port !== 5432) {
    url.port = config.port.toString();
  }

  const connectionString = url.toString();

  // Configure SSL for production
  const poolConfig: any = { connectionString };
  if (process.env.NODE_ENV === 'production' || connectionString.includes('sslmode=require')) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }

  const pool = new Pool(poolConfig);
  const db = drizzle(pool, { schema: tenantSchema });
  
  tenantDbCache.set(cacheKey, db);
  return db;
}

// Clear tenant database cache (useful for cleanup)
export function clearTenantDbCache() {
  tenantDbCache.clear();
}

// Get default tenant database (for development/fallback)
export function getDefaultTenantDb() {
  return getTenantDb({
    host: 'localhost',
    dbName: process.env.DATABASE_URL!.split('/').pop()!,
    port: 5432,
  });
}
