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
  const headersList = headers();
  const hostname = headersList.get('host') || '';
  const tenantHeader = headersList.get('x-tenant-id');
  
  // Extract subdomain from hostname or header
  let subdomain = tenantHeader;
  if (!subdomain) {
    const parts = hostname.split('.');
    subdomain = parts.length > 2 ? parts[0] : 'default';
  }
  
  if (subdomain === 'www' || subdomain === 'localhost') {
    subdomain = 'default';
  }

  // For development/localhost, use a default tenant
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    subdomain = 'default';
  }

  // Get tenant info from owner database
  const tenant = await ownerDb
    .select()
    .from(tenants)
    .where(eq(tenants.subdomain, subdomain))
    .limit(1)
    .then(results => results[0]);

  if (!tenant) {
    // Create default tenant if it doesn't exist
    if (subdomain === 'default') {
      const defaultTenant = await ownerDb
        .insert(tenants)
        .values({
          name: 'Default Tenant',
          subdomain: 'default',
          dbHost: 'localhost',
          dbName: process.env.DATABASE_URL!.split('/').pop()!, // Use current database as default
          dbPort: 5432,
          storagePath: 'tenants/default',
          status: 'ACTIVE',
          plan: 'ENTERPRISE'
        })
        .returning()
        .then(results => results[0]);
        
      return {
        tenantId: defaultTenant.id.toString(),
        subdomain: defaultTenant.subdomain,
        dbHost: defaultTenant.dbHost,
        dbName: defaultTenant.dbName,
        dbPort: defaultTenant.dbPort,
        dbUser: defaultTenant.dbUser || undefined,
        dbPassword: defaultTenant.dbPassword || undefined,
        storagePath: defaultTenant.storagePath,
        tenant: defaultTenant
      };
    }
    
    throw new Error(`Tenant not found for subdomain: ${subdomain}`);
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
