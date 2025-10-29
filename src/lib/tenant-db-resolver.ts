import { headers } from 'next/headers';
import { ownerDb } from '@/db/owner-db';
import { tenants } from '@/owner/db/schemas/ownerSchema';
import { eq, or } from 'drizzle-orm';
import { getTenantDb, TenantConnectionConfig } from '@/db/tenant-db';
import { dbCache } from '@/lib/encrypted-db-cache';

// Use encrypted database cache instead of simple Map

/**
 * Get tenant database instance for the current request
 * This function should be used in API routes and server actions
 */
export async function getCurrentTenantDb() {
  try {
    const headersList = await headers();
    const tenantIdentifier = headersList.get('X-Tenant-Identifier');

    if (!tenantIdentifier) {
      throw new Error('No tenant identifier found in request headers');
    }

    // Check encrypted cache first
    const cachedConnection = dbCache.get(tenantIdentifier);
    if (cachedConnection) {
      console.log(`[TENANT_DB_RESOLVER] ✅ CACHE HIT: Using cached connection config for tenant: ${tenantIdentifier}`);

      try {
        // Convert cached config to TenantConnectionConfig format
        const tenantConfig: TenantConnectionConfig = {
          tenantId: tenantIdentifier,
          databaseName: cachedConnection.database,
          host: cachedConnection.host,
          port: cachedConnection.port,
          username: cachedConnection.user,
          password: cachedConnection.password,
        };

        const tenantConnection = await getTenantDb(tenantConfig);
        return tenantConnection.db;
      } catch (error: any) {
        console.error(`[TENANT_DB_RESOLVER] Error with cached connection for ${tenantIdentifier}:`, error.message);
        // Clear cache and retry
        dbCache.clear(tenantIdentifier);
      }
    }

    // Query owner database for tenant configuration
    console.log(`[TENANT_DB_RESOLVER] Resolving tenant database for: ${tenantIdentifier}`);

    const [tenant] = await ownerDb
      .select()
      .from(tenants)
      .where(
        or(
          eq(tenants.subdomain, tenantIdentifier),
          eq(tenants.customDomain, tenantIdentifier)
        )
      )
      .limit(1);

    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantIdentifier}`);
    }

    if (tenant.status !== 'ACTIVE') {
      throw new Error(`Tenant is not active: ${tenantIdentifier} (status: ${tenant.status})`);
    }

    // Validate tenant has database configuration
    if (!tenant.dbName) {
      throw new Error(`Tenant database name not configured: ${tenantIdentifier}`);
    }

    // Create connection config for cache
    const connectionConfig = {
      host: tenant.dbHost || 'localhost',
      port: tenant.dbPort || 5432,
      user: tenant.dbUser || 'postgres',
      password: tenant.dbPassword || '',
      database: tenant.dbName,
      ssl: true
    };

    // Create tenant connection config - strict validation, no fallbacks
    const tenantConfig: TenantConnectionConfig = {
      tenantId: tenant.id.toString(),
      databaseName: tenant.dbName,
      host: tenant.dbHost || undefined,
      port: tenant.dbPort || undefined,
      username: tenant.dbUser || undefined,
      password: tenant.dbPassword || undefined,
    };

    // Cache the connection config using encrypted cache
    dbCache.set(tenantIdentifier, connectionConfig);

    // Get or create tenant database connection
    const tenantConnection = await getTenantDb(tenantConfig);

    console.log(`[TENANT_DB_RESOLVER] Successfully resolved tenant database: ${tenant.name} -> ${tenant.dbName}`);

    return tenantConnection.db;

  } catch (error) {
    console.error('[TENANT_DB_RESOLVER] Error resolving tenant database:', error);
    throw error;
  }
}

/**
 * Get tenant information for the current request
 */
export async function getCurrentTenant() {
  try {
    const headersList = await headers();
    const tenantIdentifier = headersList.get('X-Tenant-Identifier');
    
    if (!tenantIdentifier) {
      return null;
    }

    // Query owner database for tenant info
    const [tenant] = await ownerDb
      .select()
      .from(tenants)
      .where(
        or(
          eq(tenants.subdomain, tenantIdentifier),
          eq(tenants.customDomain, tenantIdentifier)
        )
      )
      .limit(1);

    return tenant || null;
  } catch (error) {
    console.error('[TENANT_RESOLVER] Error resolving tenant info:', error);
    return null;
  }
}

/**
 * Check if current request is for a tenant (not owner)
 */
export async function isCurrentRequestTenant(): Promise<boolean> {
  try {
    const headersList = await headers();
    const tenantIdentifier = headersList.get('X-Tenant-Identifier');
    return !!tenantIdentifier;
  } catch (error) {
    return false;
  }
}

/**
 * Clear tenant config cache (useful for testing or when tenant config changes)
 */
export function clearTenantCache(tenantIdentifier?: string) {
  dbCache.clear(tenantIdentifier);
  console.log(`[TENANT_DB_RESOLVER] Cleared ${tenantIdentifier ? `cache for tenant: ${tenantIdentifier}` : 'all tenant cache'}`);
}

/**
 * Get current tenant information including name
 */
export async function getCurrentTenantInfo() {
  try {
    const headersList = await headers();
    const tenantIdentifier = headersList.get('X-Tenant-Identifier');

    if (!tenantIdentifier) {
      throw new Error('No tenant identifier found in request headers');
    }

    // Query owner database for tenant configuration
    const [tenant] = await ownerDb
      .select()
      .from(tenants)
      .where(
        or(
          eq(tenants.subdomain, tenantIdentifier),
          eq(tenants.customDomain, tenantIdentifier)
        )
      )
      .limit(1);

    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantIdentifier}`);
    }

    return {
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      customDomain: tenant.customDomain,
      status: tenant.status,
    };
  } catch (error) {
    console.error('Error getting tenant info:', error);
    return null;
  }
}
