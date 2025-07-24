// src/tenant/db-manager.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { schema } from '@/db/schema'; // Your existing tenant schema
import { ownerDb, companies, companyDatabases } from '@/owner/db/config';
import { eq } from 'drizzle-orm';

// Cache for tenant database connections
const tenantDbCache = new Map<string, ReturnType<typeof drizzle>>();

/**
 * Get database connection for a specific company/tenant
 * @param companyId - The company ID
 * @returns Drizzle database instance for the tenant
 */
export async function getTenantDb(companyId: string) {
  // Check cache first
  if (tenantDbCache.has(companyId)) {
    return tenantDbCache.get(companyId)!;
  }

  try {
    // Get company database configuration from owner database
    const companyDatabase = await ownerDb
      .select()
      .from(companyDatabases)
      .where(eq(companyDatabases.companyId, parseInt(companyId)))
      .limit(1);

    if (!companyDatabase.length) {
      throw new Error(`No database configuration found for company: ${companyId}`);
    }

    const dbConfig = companyDatabase[0];
    
    if (!dbConfig.isActive) {
      throw new Error(`Database is inactive for company: ${companyId}`);
    }

    // Create database connection
    const sql = postgres(dbConfig.connectionString);
    const tenantDb = drizzle(sql, { schema });

    // Cache the connection
    tenantDbCache.set(companyId, tenantDb);

    return tenantDb;
  } catch (error) {
    console.error(`Failed to get tenant database for company ${companyId}:`, error);
    throw error;
  }
}

/**
 * Get company information by subdomain
 * @param subdomain - The subdomain (e.g., "abc-vet")
 * @returns Company information
 */
export async function getCompanyBySubdomain(subdomain: string) {
  try {
    const company = await ownerDb
      .select()
      .from(companies)
      .where(eq(companies.subdomain, subdomain))
      .limit(1);

    return company.length > 0 ? company[0] : null;
  } catch (error) {
    console.error(`Failed to get company by subdomain ${subdomain}:`, error);
    throw error;
  }
}

/**
 * Get company information by ID
 * @param companyId - The company ID
 * @returns Company information
 */
export async function getCompanyById(companyId: string) {
  try {
    const company = await ownerDb
      .select()
      .from(companies)
      .where(eq(companies.id, parseInt(companyId)))
      .limit(1);

    return company.length > 0 ? company[0] : null;
  } catch (error) {
    console.error(`Failed to get company by ID ${companyId}:`, error);
    throw error;
  }
}

/**
 * Create a new database for a company
 * @param companyId - The company ID
 * @param databaseName - The database name
 * @param connectionString - The database connection string
 */
export async function createCompanyDatabase(
  companyId: number, 
  databaseName: string, 
  connectionString: string
) {
  try {
    // Insert database configuration
    await ownerDb.insert(companyDatabases).values({
      companyId,
      databaseName,
      connectionString,
      isActive: true,
    });

    // Clear cache to ensure fresh connections
    tenantDbCache.delete(companyId.toString());
    
    return true;
  } catch (error) {
    console.error(`Failed to create company database for ${companyId}:`, error);
    throw error;
  }
}

/**
 * Get the default tenant database (for backwards compatibility)
 * Uses the current DATABASE_URL as the default tenant
 */
export function getDefaultTenantDb() {
  const defaultDbUrl = process.env.DATABASE_URL;
  if (!defaultDbUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  
  const sql = postgres(defaultDbUrl);
  return drizzle(sql, { schema });
}
