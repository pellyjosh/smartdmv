// src/lib/encrypted-db-cache.ts
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const OBFUSCATION_KEY = process.env.DB_OBFUSCATION_KEY || Buffer.from('default-obfuscation-key').toString('base64');

interface CachedConnection {
  data: string; // Base64 encoded JSON
  timestamp: number;
  tenantId: string;
  dbName: string;
}

interface ConnectionConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: boolean;
}

class DatabaseCache {
  private cache = new Map<string, CachedConnection>();
  private static instance: DatabaseCache;

  static getInstance(): DatabaseCache {
    if (!DatabaseCache.instance) {
      DatabaseCache.instance = new DatabaseCache();
    }
    return DatabaseCache.instance;
  }

  private obfuscate(data: string): string {
    // Simple XOR obfuscation - not true encryption but protects against casual inspection
    const key = OBFUSCATION_KEY;
    let result = '';

    for (let i = 0; i < data.length; i++) {
      const charCode = data.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }

    return Buffer.from(result, 'utf8').toString('base64');
  }

  private deobfuscate(data: string): string {
    try {
      const decoded = Buffer.from(data, 'base64').toString('utf8');
      const key = OBFUSCATION_KEY;
      let result = '';

      for (let i = 0; i < decoded.length; i++) {
        const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        result += String.fromCharCode(charCode);
      }

      return result;
    } catch (error) {
      console.error('Failed to deobfuscate data:', error);
      return '';
    }
  }

  set(tenantId: string, config: ConnectionConfig): void {
    const jsonData = JSON.stringify(config);
    const obfuscated = this.obfuscate(jsonData);

    const cached: CachedConnection = {
      data: obfuscated,
      timestamp: Date.now(),
      tenantId,
      dbName: config.database
    };

    this.cache.set(tenantId, cached);

    // Cleanup old entries (older than CACHE_TTL)
    for (const [key, value] of this.cache.entries()) {
      if (Date.now() - value.timestamp > CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }

  get(tenantId: string): ConnectionConfig | null {
    const cached = this.cache.get(tenantId);

    if (!cached) return null;

    // Check if expired
    if (Date.now() - cached.timestamp > CACHE_TTL) {
      this.cache.delete(tenantId);
      return null;
    }

    try {
      const deobfuscated = this.deobfuscate(cached.data);
      return JSON.parse(deobfuscated);
    } catch (error) {
      console.error('Failed to get cached connection:', error);
      this.cache.delete(tenantId); // Remove corrupted entry
      return null;
    }
  }

  clear(tenantId?: string): void {
    if (tenantId) {
      this.cache.delete(tenantId);
    } else {
      this.cache.clear();
    }
  }

  has(tenantId: string): boolean {
    const cached = this.cache.get(tenantId);
    if (!cached) return false;

    // Check if expired
    if (Date.now() - cached.timestamp > CACHE_TTL) {
      this.cache.delete(tenantId);
      return false;
    }

    return true;
  }

  // Get cache stats for monitoring
  getStats(): { size: number; oldest: number; newest: number } {
    let oldest = Date.now();
    let newest = 0;
    let size = this.cache.size;

    for (const [, value] of this.cache.entries()) {
      if (value.timestamp < oldest) oldest = value.timestamp;
      if (value.timestamp > newest) newest = value.timestamp;
    }

    return { size, oldest, newest };
  }
}

// Global instance
export const dbCache = DatabaseCache.getInstance();
