import { config } from 'dotenv';
config();

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

// Cache for tenant database connections
const tenantDbConnections = new Map<string, any>();

export interface TenantConnectionConfig {
  tenantId: string;
  databaseName: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
}

// For AWS RDS with self-signed certificates, disable TLS rejection
function setupSSL(connectionString: string) {
  if (connectionString.includes('amazonaws.com')) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.log(`[TENANT_DB_INIT] Disabled TLS certificate verification for AWS RDS`);
  }
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

export function getTenantDb(config: TenantConnectionConfig) {
  // Check if we already have a connection for this tenant
  const existingConnection = tenantDbConnections.get(config.tenantId);
  if (existingConnection) {
    // Check if the connection is still healthy
    const pool = existingConnection.pool;
    if (pool && !pool.ending && !pool.ended) {
      // Only log reuse for debugging
      if (process.env.DEBUG_TENANT_DB === 'true') {
        console.log(`[TENANT_DB_REUSE] Reusing existing connection for tenant ${config.tenantId}`);
      }
      return existingConnection;
    } else {
      // Connection is unhealthy, remove it
      if (process.env.DEBUG_TENANT_DB === 'true') {
        console.log(`[TENANT_DB_CLEANUP] Removing unhealthy connection for tenant ${config.tenantId}`);
      }
      tenantDbConnections.delete(config.tenantId);
    }
  }

  // Validate tenant configuration
  if (!config.databaseName) {
    throw new Error(`Tenant database name is required for tenant ${config.tenantId}`);
  }

  // Build connection string using environment configuration components
  const dbHost = process.env.DB_HOST;
  const dbPort = process.env.DB_PORT || '5432';
  const dbUser = process.env.DB_USER;
  const dbPassword = process.env.DB_PASSWORD;
  const dbSslMode = process.env.DB_SSL_MODE || 'require';

  if (!dbHost || !dbUser || !dbPassword) {
    throw new Error('Database connection components (DB_HOST, DB_USER, DB_PASSWORD) must be set in environment variables');
  }

  // Build connection string with tenant-specific database name
  const tenantConnectionString = `postgresql://${dbUser}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${config.databaseName}?sslmode=${dbSslMode}`;

  const finalConnectionString = normalizeConnectionString(tenantConnectionString);
  setupSSL(finalConnectionString);

  if (process.env.DEBUG_TENANT_DB === 'true') {
    console.log(`[TENANT_DB_INIT] Creating connection for tenant ${config.tenantId} to database ${config.databaseName}`);
  }

  // Configure SSL for production RDS with optimized connection pool settings
  const poolConfig: any = { 
    connectionString: finalConnectionString,
    max: 3, // Reduce max connections to avoid overwhelming DB
    min: 0, // Don't keep minimum connections to reduce overhead
    idleTimeoutMillis: 5000, // Close idle connections after 5 seconds
    connectionTimeoutMillis: 30000, // Increase connection timeout to 30s
    query_timeout: 30000, // Increase query timeout to 30s
    statement_timeout: 30000, // Increase statement timeout to 30s
    acquireTimeoutMillis: 25000, // Time to wait for connection from pool
    createTimeoutMillis: 25000, // Time to wait when creating new connection
    destroyTimeoutMillis: 5000, // Time to wait when destroying connection
    reapIntervalMillis: 5000, // How often to check for idle connections
    createRetryIntervalMillis: 1000, // Delay between connection retry attempts
  };
  
  if (finalConnectionString.includes('sslmode=require') || finalConnectionString.includes('amazonaws.com')) {
    poolConfig.ssl = { rejectUnauthorized: false };
    console.log(`[TENANT_DB_INIT] SSL configured for tenant ${config.tenantId}`);
  }

  // Create a pg Pool for this tenant
  const pool = new Pool(poolConfig);
  
  // Handle pool errors
  pool.on('error', (err) => {
    console.error(`[TENANT_DB_ERROR] Pool error for tenant ${config.tenantId}:`, err);
    // Remove from cache to force reconnection
    tenantDbConnections.delete(config.tenantId);
  });

  pool.on('connect', (client) => {
    if (process.env.DEBUG_TENANT_DB === 'true') {
      console.log(`[TENANT_DB_CONNECT] New client connected for tenant ${config.tenantId}`);
    }
    // Set connection-level timeouts with more generous values
    client.query('SET statement_timeout = 30000'); // 30 second statement timeout
    client.query('SET lock_timeout = 25000'); // 25 second lock timeout
    client.query('SET idle_in_transaction_session_timeout = 60000'); // 60 second idle timeout
  });

  pool.on('remove', () => {
    if (process.env.DEBUG_TENANT_DB === 'true') {
      console.log(`[TENANT_DB_REMOVE] Client removed for tenant ${config.tenantId}`);
    }
  });

  pool.on('acquire', () => {
    if (process.env.DEBUG_TENANT_DB === 'true') {
      console.log(`[TENANT_DB_ACQUIRE] Client acquired for tenant ${config.tenantId}`);
    }
  });

  // Create the Drizzle instance using the pg pool with tenant schema
  const dbInstance = drizzle(pool, { 
    schema, 
    logger: process.env.NODE_ENV === 'development' 
  });

  // Cache the connection
  const tenantDb = {
    db: dbInstance,
    pool: pool,
    config: config,
  };

  tenantDbConnections.set(config.tenantId, tenantDb);
  
  console.log(`✅ PostgreSQL Tenant DB instance created for ${config.tenantId}`);

  return tenantDb;
}

// Close a specific tenant database connection
export async function closeTenantDb(tenantId: string) {
  const connection = tenantDbConnections.get(tenantId);
  if (connection) {
    await connection.pool.end();
    tenantDbConnections.delete(tenantId);
    console.log(`[TENANT_DB_CLEANUP] Closed connection for tenant ${tenantId}`);
  }
}

// Close all tenant database connections (useful for graceful shutdown)
export async function closeAllTenantDbs() {
  const closePromises = Array.from(tenantDbConnections.entries()).map(
    async ([tenantId, connection]) => {
      await connection.pool.end();
      console.log(`[TENANT_DB_CLEANUP] Closed connection for tenant ${tenantId}`);
    }
  );
  
  await Promise.all(closePromises);
  tenantDbConnections.clear();
  console.log(`[TENANT_DB_CLEANUP] All tenant connections closed`);
}

// Get list of active tenant connections
export function getActiveTenantConnections(): string[] {
  return Array.from(tenantDbConnections.keys());
}

// Health check for a specific tenant connection
export async function checkTenantDbHealth(tenantId: string): Promise<boolean> {
  const connection = tenantDbConnections.get(tenantId);
  if (!connection) {
    return false;
  }
  
  try {
    const result = await connection.db.execute('SELECT 1 as health_check');
    return result.length > 0;
  } catch (error) {
    console.error(`[TENANT_DB_HEALTH] Health check failed for tenant ${tenantId}:`, error);
    return false;
  }
}

// Clean up unhealthy connections
export async function cleanupUnhealthyConnections() {
  const tenantIds = Array.from(tenantDbConnections.keys());
  for (const tenantId of tenantIds) {
    const isHealthy = await checkTenantDbHealth(tenantId);
    if (!isHealthy) {
      console.log(`[TENANT_DB_CLEANUP] Removing unhealthy connection for tenant ${tenantId}`);
      await closeTenantDb(tenantId);
    }
  }
}
