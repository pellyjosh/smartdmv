/**
 * Tenant data storage for offline support
 * Caches tenant information for offline access
 */

import { indexedDBManager } from '../db/manager';

const CACHE_STORE = 'cache';

export interface CachedTenantInfo {
  id: string;
  slug: string;
  name: string;
  domain: string | null;
  subdomain: string;
  status: "active" | "inactive" | "suspended";
  databaseName: string;
  storagePath: string;
  settings: {
    timezone: string;
    theme: string;
    features: string[];
  };
}

/**
 * Get cached tenant data from IndexedDB by subdomain or identifier
 */
export async function getCachedTenantData(identifier: string): Promise<CachedTenantInfo | null> {
  try {
    // Extract subdomain if full domain provided
    let subdomain = identifier;
    if (identifier.includes('.')) {
      subdomain = identifier.split('.')[0];
    }

    console.log('[TenantStorage] Looking for cached tenant:', subdomain);

    // Try to get from cache store
    const allCached = await indexedDBManager.getAll(CACHE_STORE);
    
    // Look for tenant data in cache
    const tenantCacheKey = `tenant_${subdomain}`;
    const tenantCache = allCached.find((item: any) => 
      item.key === tenantCacheKey || 
      item.id === tenantCacheKey ||
      (item.data && item.data.subdomain === subdomain)
    ) as any;

    if (tenantCache && tenantCache.data) {
      console.log('[TenantStorage] Found tenant in cache:', tenantCache.data.name);
      return tenantCache.data as CachedTenantInfo;
    }

    console.log('[TenantStorage] No cached tenant found for:', subdomain);
    return null;
  } catch (error) {
    console.error('[TenantStorage] Error retrieving cached tenant:', error);
    return null;
  }
}

/**
 * Save tenant data to IndexedDB cache
 */
export async function cacheTenantData(tenant: CachedTenantInfo): Promise<void> {
  try {
    // Set tenant context first before trying to cache
    const { tenantId } = indexedDBManager.getCurrentTenant();
    if (!tenantId) {
      console.log('[TenantStorage] Setting tenant context before caching:', tenant.id);
      indexedDBManager.setCurrentTenant(tenant.id);
    }

    const cacheKey = `tenant_${tenant.subdomain}`;
    
    await indexedDBManager.put(CACHE_STORE, {
      id: cacheKey,
      key: cacheKey,
      data: tenant,
      timestamp: Date.now(),
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
    });

    console.log('[TenantStorage] Tenant cached successfully:', tenant.name);
  } catch (error) {
    console.error('[TenantStorage] Error caching tenant:', error);
    // Don't throw - caching is non-critical
  }
}

/**
 * Clear tenant cache
 */
export async function clearTenantCache(subdomain?: string): Promise<void> {
  try {
    if (subdomain) {
      const cacheKey = `tenant_${subdomain}`;
      await indexedDBManager.delete(CACHE_STORE, cacheKey);
      console.log('[TenantStorage] Cleared cache for tenant:', subdomain);
    } else {
      // Clear all tenant caches
      const allCached = await indexedDBManager.getAll(CACHE_STORE);
      const tenantCaches = allCached.filter((item: any) => 
        item.key?.startsWith('tenant_')
      );
      
      for (const cache of tenantCaches) {
        await indexedDBManager.delete(CACHE_STORE, (cache as any).id);
      }
      
      console.log('[TenantStorage] Cleared all tenant caches');
    }
  } catch (error) {
    console.error('[TenantStorage] Error clearing tenant cache:', error);
    throw error;
  }
}

/**
 * SessionStorage-based tenant cache (legacy support)
 */
export class TenantCache {
  private static readonly STORAGE_KEY = 'tenant_info';
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static get(): { data: any; timestamp: number } | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = sessionStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;
      
      const parsed = JSON.parse(stored);
      const now = Date.now();
      
      if (now - parsed.timestamp > this.CACHE_DURATION) {
        this.clear();
        return null;
      }
      
      return parsed;
    } catch {
      this.clear();
      return null;
    }
  }

  static set(data: any): void {
    if (typeof window === 'undefined') return;
    
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
      };
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to cache tenant data:', error);
    }
  }

  static clear(): void {
    if (typeof window === 'undefined') return;
    
    try {
      sessionStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear tenant cache:', error);
    }
  }

  static getHostnameHash(): string {
    if (typeof window === 'undefined') return '';
    return window.location.hostname;
  }

  static isValidForCurrentHostname(cachedData: any): boolean {
    if (typeof window === 'undefined') return false;
    
    const currentHostname = this.getHostnameHash();
    return cachedData?.hostname === currentHostname;
  }
}
