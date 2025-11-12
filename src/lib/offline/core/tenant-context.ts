/**
 * Tenant context utilities for offline storage
 * Extracts tenant information from current session
 */

import { getTenantStoreName } from '../db/schema';

/**
 * Tenant context information
 */
export interface TenantContext {
  tenantId: string;
  practiceId: number;
  userId: number;
  subdomain?: string;
}

/**
 * Get tenant context from current session
 * This integrates with your existing tenant-context.ts
 */
export async function getOfflineTenantContext(): Promise<TenantContext | null> {
  try {
    // Try to get from existing tenant context
    if (typeof window !== 'undefined') {
      // Check for stored session
      const sessionStr = localStorage.getItem('offline_session');
      console.log('[TenantContext] 🔍 Checking offline_session:', sessionStr ? 'Found' : 'Not found');
      
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        const context = {
          tenantId: String(session.tenantId),
          practiceId: typeof session.practiceId === 'string' ? parseInt(session.practiceId, 10) : session.practiceId,
          userId: typeof session.userId === 'string' ? parseInt(session.userId, 10) : session.userId,
          subdomain: session.subdomain,
        };
        console.log('[TenantContext] ✅ Retrieved context:', {
          userId: context.userId,
          userIdType: typeof context.userId,
          tenantId: context.tenantId,
          practiceId: context.practiceId,
          practiceIdType: typeof context.practiceId,
        });
        return context;
      }

      console.warn('[TenantContext] ⚠️ No offline_session found in localStorage');

      // Fallback: Extract from hostname
      const hostname = window.location.hostname;
      const subdomain = hostname.split('.')[0];
      
      // This would need to be validated against your actual tenant context
      // For now, return null if no session
      return null;
    }
    
    return null;
  } catch (error) {
    console.error('[TenantContext] ❌ Failed to get tenant context:', error);
    return null;
  }
}

/**
 * Set tenant context (typically called after login)
 */
export function setOfflineTenantContext(context: TenantContext): void {
  if (typeof window !== 'undefined') {
    try {
      console.log('[TenantContext] 🔍 setOfflineTenantContext called with:', {
        tenantId: context.tenantId,
        tenantIdType: typeof context.tenantId,
        practiceId: context.practiceId,
        userId: context.userId,
        subdomain: context.subdomain,
        callStack: new Error().stack?.split('\n').slice(1, 4).join('\n'),
      });

      // Merge with any existing offline_session to avoid overwriting user role/roles
      const existing = localStorage.getItem('offline_session');
      let parsed: any = {};
      if (existing) {
        try {
          parsed = JSON.parse(existing) || {};
          console.log('[TenantContext] 📖 Existing offline_session:', {
            tenantId: parsed.tenantId,
            subdomain: parsed.subdomain,
          });
        } catch (e) {
          // If parse fails, start fresh but keep going
          parsed = {};
        }
      }

      const merged = {
        ...parsed,
        // Ensure tenant context fields are set/updated
        tenantId: context.tenantId,  // MUST be database ID!
        practiceId: context.practiceId,
        userId: context.userId,
        subdomain: context.subdomain || parsed.subdomain || window.location.hostname.split('.')[0],
        // preserve role/roles if present in parsed
        role: parsed.role,
        roles: parsed.roles,
        savedAt: Date.now(),
      };

      console.log('[TenantContext] 💾 Setting offline_session (merged):', {
        userId: merged.userId,
        tenantId: merged.tenantId,
        tenantIdType: typeof merged.tenantId,
        practiceId: merged.practiceId,
        subdomain: merged.subdomain,
        hasRole: !!merged.role,
        hasRoles: Array.isArray(merged.roles) && merged.roles.length > 0,
      });

      localStorage.setItem('offline_session', JSON.stringify(merged));
      console.log('[TenantContext] ✅ Offline session saved to localStorage');
    } catch (err) {
      console.error('[TenantContext] ❌ Failed to set offline_session:', err);
    }
  }
}

/**
 * Clear tenant context (typically called on logout)
 */
export function clearOfflineTenantContext(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('offline_session');
  }
}

/**
 * Validate tenant context
 */
export function validateTenantContext(context: TenantContext | null): boolean {
  if (!context) return false;
  
  return Boolean(
    context.tenantId &&
    context.practiceId &&
    context.userId
  );
}

/**
 * Get store name for current tenant
 */
export async function getCurrentTenantStoreName(baseStoreName: string): Promise<string | null> {
  const context = await getOfflineTenantContext();
  if (!context) return null;
  
  return getTenantStoreName(context.tenantId, baseStoreName);
}

/**
 * Check if operation is allowed for tenant
 */
export function isTenantOperation(
  operationTenantId: string,
  contextTenantId: string
): boolean {
  return operationTenantId === contextTenantId;
}

/**
 * Ensure tenant isolation for data access
 */
export async function ensureTenantIsolation(
  requestedTenantId: string
): Promise<boolean> {
  const context = await getOfflineTenantContext();
  if (!context) {
    throw new Error('No tenant context available');
  }
  
  if (context.tenantId !== requestedTenantId) {
    throw new Error('Tenant mismatch: Access denied');
  }
  
  return true;
}
