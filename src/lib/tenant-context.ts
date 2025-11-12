// src/lib/tenant-context.ts
import { headers } from 'next/headers';
import { ownerDb } from '@/db/owner-db.config';
import { tenants } from '@/owner/db/schemas/ownerSchema';
import { getTenantDb } from '@/db/tenant-db.config';
import { eq } from 'drizzle-orm';
import path from 'path';
import fs from 'fs';

export interface TenantContext {
  tenantId: string;
  subdomain: string;
  dbHost: string;
  dbName: string;
  dbPort: number;
  dbUser?: string;
  dbPassword?: string;
  storagePath: string;
  tenant?: typeof tenants.$inferSelect;
}

export async function getTenantContext(): Promise<TenantContext> {
  const headersList = await headers();
  const hostname = headersList.get('host') || '';
  const tenantHeader = headersList.get('x-tenant-id');
  
  console.log('[getTenantContext] Resolving tenant from hostname:', hostname);

  // Priority 1: Use x-tenant-id header if set (useful for custom domains)
  if (tenantHeader) {
    console.log('[getTenantContext] Using tenant from header:', tenantHeader);
  }

  // Try to find tenant by:
  // 1. x-tenant-id header (for custom domains mapped via middleware/proxy)
  // 2. Full hostname (for custom domains like clientdomain.com)
  // 3. Subdomain (for subdomain.yourdomain.com)
  
  let tenant: typeof tenants.$inferSelect | undefined;

  // Step 1: Check x-tenant-id header
  if (tenantHeader) {
    tenant = await ownerDb
      .select()
      .from(tenants)
      .where(eq(tenants.subdomain, tenantHeader))
      .limit(1)
      .then(results => results[0]);
    
    if (tenant) {
      console.log('[getTenantContext] Found tenant via header:', tenant.subdomain);
    }
  }

  // Step 2: Try to find by custom domain (full hostname without port)
  if (!tenant) {
    const hostnameWithoutPort = hostname.split(':')[0];
    tenant = await ownerDb
      .select()
      .from(tenants)
      .where(eq(tenants.customDomain, hostnameWithoutPort))
      .limit(1)
      .then(results => results[0]);
    
    if (tenant) {
      console.log('[getTenantContext] Found tenant via custom domain:', hostnameWithoutPort);
    }
  }

  // Step 3: Extract subdomain and search
  if (!tenant) {
    const parts = hostname.split(':')[0].split('.');
    const subdomain = parts.length > 1 ? parts[0] : 'innova';
    
    tenant = await ownerDb
      .select()
      .from(tenants)
      .where(eq(tenants.subdomain, subdomain))
      .limit(1)
      .then(results => results[0]);
    
    if (tenant) {
      console.log('[getTenantContext] Found tenant via subdomain:', subdomain);
    }
  }

  if (!tenant) {
    console.error('[getTenantContext] No tenant found for hostname:', hostname);
    throw new Error(`Tenant not found for hostname: ${hostname}`);
  }

  return {
    tenantId: tenant.id.toString(),
    subdomain: tenant.subdomain,
    dbHost: tenant.dbHost,
    dbName: tenant.dbName,
    dbPort: tenant.dbPort,
    dbUser: tenant.dbUser || undefined,
    dbPassword: tenant.dbPassword || undefined,
    storagePath: tenant.storagePath,
    tenant
  };
}

export async function getTenantDatabase(tenantContext?: TenantContext) {
  const context = tenantContext || await getTenantContext();
  
  return getTenantDb({
    host: context.dbHost,
    dbName: context.dbName,
    port: context.dbPort,
    user: context.dbUser,
    password: context.dbPassword,
  });
}

export function getTenantStoragePath(tenantContext?: TenantContext, ...paths: string[]): string {
  const context = tenantContext || { storagePath: 'tenants/default' };
  const basePath = path.join(process.cwd(), 'storage', context.storagePath);
  
  // Ensure directory exists
  if (!fs.existsSync(basePath)) {
    fs.mkdirSync(basePath, { recursive: true });
  }
  
  return path.join(basePath, ...paths);
}

export function createTenantStorageDirectory(tenantId: string, subdomain: string) {
  const storagePath = path.join(process.cwd(), 'storage', 'tenants', subdomain);
  
  // Create main tenant directory
  if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true });
  }
  
  // Create practice subdirectories structure
  const practiceDir = path.join(storagePath, 'practices');
  if (!fs.existsSync(practiceDir)) {
    fs.mkdirSync(practiceDir, { recursive: true });
  }
  
  // Create other necessary subdirectories
  const subdirs = ['uploads', 'medical-imaging', 'documents', 'exports'];
  subdirs.forEach(subdir => {
    const dirPath = path.join(storagePath, subdir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
  
  return storagePath;
}
