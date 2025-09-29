"use client";

// Tenant utilities for client-side caching
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
