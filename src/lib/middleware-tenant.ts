import { NextRequest } from 'next/server';
import { ownerDb } from '@/db/owner-db';
import { tenants } from '@/db/owner-schema';
import { eq, or } from 'drizzle-orm';

export interface MiddlewareTenant {
  id: string;
  slug: string;
  name: string;
  domain?: string;
  subdomain?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
  databaseName: string;
  storagePath: string;
}

// Extract tenant identifier from hostname
export function extractTenantFromHostname(hostname: string): string | null {
  // Remove port if present
  const cleanHostname = hostname.split(':')[0];
  
  // Handle different domain patterns:
  // 1. subdomain.yourdomain.com -> subdomain
  // 2. tenant-slug.yourdomain.com -> tenant-slug
  // 3. custom-domain.com -> handle via database lookup
  
  const parts = cleanHostname.split('.');
  
  // For localhost or IP addresses, return null (development mode)
  if (cleanHostname === 'localhost' || 
      cleanHostname.startsWith('127.0.0.1') || 
      cleanHostname.startsWith('192.168.') ||
      /^\d+\.\d+\.\d+\.\d+$/.test(cleanHostname)) {
    return null;
  }
  
  // If it's a subdomain of your main domain (e.g., tenant.yourdomain.com)
  if (parts.length >= 3) {
    // Assuming your main domain is the last two parts
    // The first part would be the tenant identifier
    return parts[0];
  }
  
  // If it's a custom domain, we'll need to look it up via database
  // For now, return the full hostname as the identifier
  return cleanHostname;
}

// Resolve tenant information from database
export async function resolveTenant(identifier: string | null): Promise<MiddlewareTenant | null> {
  if (!identifier) {
    return null;
  }

  try {
    // Query the owner database to find the tenant
    const tenant = await ownerDb
      .select()
      .from(tenants)
      .where(
        or(
          eq(tenants.customDomain, identifier),
          eq(tenants.subdomain, identifier)
        )
      )
      .limit(1);

    if (!tenant || tenant.length === 0) {
      console.warn(`[Middleware] Tenant not found for identifier: ${identifier}`);
      return null;
    }

    const tenantRecord = tenant[0];

    // Check if tenant is active
    if (tenantRecord.status !== 'ACTIVE') {
      console.warn(`[Middleware] Tenant ${tenantRecord.subdomain} is not active: ${tenantRecord.status}`);
      return null;
    }

    return {
      id: tenantRecord.id.toString(),
      slug: tenantRecord.subdomain,
      name: tenantRecord.name,
      domain: tenantRecord.customDomain || undefined,
      subdomain: tenantRecord.subdomain,
      status: tenantRecord.status,
      databaseName: tenantRecord.dbName,
      storagePath: tenantRecord.storagePath,
    };
  } catch (error) {
    console.error('[Middleware] Error resolving tenant:', error);
    return null;
  }
}

// Add tenant headers to the request
export function addTenantHeaders(request: NextRequest, tenant: MiddlewareTenant | null) {
  // Clone the request headers
  const requestHeaders = new Headers(request.headers);
  
  if (tenant) {
    requestHeaders.set('X-Tenant-ID', tenant.id);
    requestHeaders.set('X-Tenant-Slug', tenant.slug);
    requestHeaders.set('X-Tenant-Database', tenant.databaseName);
    requestHeaders.set('X-Tenant-Storage', tenant.storagePath);
  } else {
    // Clear any existing tenant headers for non-tenant requests
    requestHeaders.delete('X-Tenant-ID');
    requestHeaders.delete('X-Tenant-Slug');
    requestHeaders.delete('X-Tenant-Database');
    requestHeaders.delete('X-Tenant-Storage');
  }

  return requestHeaders;
}
