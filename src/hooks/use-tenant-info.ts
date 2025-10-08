import { useEffect, useState } from 'react';
import { getTenantFileUrlClient } from '@/lib/tenant-file-utils';

export interface TenantInfo {
  tenantId: string;
  subdomain: string;
}

export function useTenantInfo(): TenantInfo | null {
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);

  useEffect(() => {
    // Get tenant info from current hostname
    const hostname = window.location.hostname;
    
    // Extract subdomain
    let subdomain = 'default';
    const parts = hostname.split('.');
    
    if (parts.length > 2) {
      subdomain = parts[0];
    }
    
    // Handle localhost and www
    if (subdomain === 'www' || hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      subdomain = 'default';
    }
    
    // Normalize smartvett variations
    if (subdomain === 'smartvett' || subdomain === 'smartvet') {
      subdomain = 'smartvett';
    }
    
    setTenantInfo({
      tenantId: subdomain,
      subdomain: subdomain
    });
  }, []);

  return tenantInfo;
}

/**
 * Client-side function to construct tenant-specific file URLs
 * @param filePath The stored file path from the database
 * @param pathSegments Additional path segments for the tenant-specific structure
 * @param tenantInfo The tenant information from useTenantInfo hook
 * @returns The correct URL to access the file
 */
export function constructTenantFileUrl(
  filePath: string | null | undefined,
  tenantInfo: TenantInfo | null,
  ...pathSegments: string[]
): string | null {
  if (!tenantInfo) return null;
  return getTenantFileUrlClient(filePath, tenantInfo.tenantId, ...pathSegments);
}