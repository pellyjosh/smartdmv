// src/lib/database-context.ts
import { getTenantDb, getDefaultTenantDb } from '@/tenant/db-manager';
import { headers } from 'next/headers';

/**
 * Get the appropriate database connection based on context
 * For API routes, this will use the company ID from the request headers
 * For backwards compatibility, falls back to the default database
 */
export async function getContextualDb() {
  try {
    const headersList = await headers();
    const companyId = headersList.get('x-company-id');
    
    if (companyId) {
      // Multi-tenant mode: get company-specific database
      return await getTenantDb(companyId);
    } else {
      // Single-tenant mode: use default database for backwards compatibility
      return getDefaultTenantDb();
    }
  } catch (error) {
    console.warn('Failed to get contextual database, falling back to default:', error);
    return getDefaultTenantDb();
  }
}

/**
 * Get company ID from request headers
 */
export async function getCompanyIdFromHeaders(): Promise<string | null> {
  try {
    const headersList = await headers();
    return headersList.get('x-company-id');
  } catch {
    return null;
  }
}
