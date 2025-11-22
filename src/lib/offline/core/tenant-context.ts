/**
 * Tenant context utilities for offline storage
 * Extracts tenant information from current session
 */

import { getTenantStoreName } from '../db/schema';
import { encryptStringDS, decryptStringDS } from '../utils/encryption';

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
      const sessionStr = localStorage.getItem('offline_session_enc');
      console.log('[TenantContext] 🔍 Checking offline_session:', sessionStr ? 'Found' : 'Not found');
      
      if (sessionStr) {
        const decrypted = await decryptStringDS(sessionStr);
        const session = JSON.parse(decrypted);
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
export async function setOfflineTenantContext(context: TenantContext): Promise<void> {
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
      const existingEnc = localStorage.getItem('offline_session_enc');
      let parsed: any = {};
      if (existingEnc) {
        try {
          const dec = await decryptStringDS(existingEnc);
          parsed = JSON.parse(dec) || {};
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

      const payload = await encryptStringDS(JSON.stringify(merged));
      localStorage.setItem('offline_session_enc', payload);
      console.log('[TenantContext] ✅ Offline session saved to localStorage');

      // Trigger automatic initial data sync if IndexedDB is empty
      triggerInitialSyncIfNeeded(context);
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
    localStorage.removeItem('offline_session_enc');
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

/**
 * Trigger automatic initial sync if IndexedDB is empty (for new logins)
 * This provides a seamless offline data population experience
 */
function triggerInitialSyncIfNeeded(context: TenantContext): void {
  if (typeof window === 'undefined') return;

  // Use setTimeout to avoid blocking the login flow
  setTimeout(async () => {
    try {
      // Check if we already have an initial sync flag
      const hasInitialSync = localStorage.getItem('offline_initial_sync_completed');
      if (hasInitialSync === 'true') {
        console.log('[InitialSync] ✅ Initial sync already completed');
        return;
      }

      // Check if IndexedDB has any data by trying to get stats
      const hasData = await checkIfHasExistingData(context);

      if (hasData) {
        console.log('[InitialSync] 📊 Existing data detected, skipping initial sync');
        localStorage.setItem('offline_initial_sync_completed', 'true');
        return;
      }

      console.log('[InitialSync] 🚀 No existing data found, starting initial sync...');

      // Show a modal or toast to inform user about initial data sync
      showInitialSyncNotification();

      // Set a fail-safe timeout to hide notification after 30 seconds max
      const failSafeTimeout = setTimeout(() => {
        console.log('[InitialSync] ⏲️ Fail-safe timeout activated - hiding notification');
        hideInitialSyncNotification();
        localStorage.setItem('offline_initial_sync_completed', 'true');
      }, 30000);

      // Import the sync service dynamically to avoid circular deps
      const { pullFreshDataIfNeeded } = await import('../../sync-service');

      try {
        console.log('[InitialSync] ⏳ Starting sync operation...');
        await pullFreshDataIfNeeded();

        console.log('[InitialSync] ✅ Initial sync completed successfully');

        // Clear fail-safe timeout
        clearTimeout(failSafeTimeout);

        // Mark as completed
        localStorage.setItem('offline_initial_sync_completed', 'true');

        // Hide notification and show success
        hideInitialSyncNotification();
        showInitialSyncSuccess();

      } catch (error) {
        console.error('[InitialSync] ❌ Initial sync failed:', error);

        // Clear fail-safe timeout
        clearTimeout(failSafeTimeout);

        // Mark as completed anyway to avoid repeated failures
        localStorage.setItem('offline_initial_sync_completed', 'true');

        hideInitialSyncNotification();
        showInitialSyncError(error instanceof Error ? error.message : 'Unknown error');
      }

    } catch (error) {
      console.error('[InitialSync] Error checking initial sync:', error);
    }
  }, 2000); // Delay by 2 seconds to let login complete
}

/**
 * Check if IndexedDB already has data for this tenant
 */
async function checkIfHasExistingData(context: TenantContext): Promise<boolean> {
  try {
    const { storageManager } = await import('../managers/storage-manager');
    const stats = await storageManager.getStats();

    // Check if any entity types have records
    const totalRecords = Object.values(stats.entityCounts).reduce((sum: number, count: any) => sum + count, 0);
    return totalRecords > 0;
  } catch (error) {
    // If stats fail, assume no data exists
    console.log('[InitialSync] Could not check existing data, assuming empty:', error);
    return false;
  }
}

/**
 * Show notification for initial sync in progress
 */
function showInitialSyncNotification(): void {
  // Create a non-intrusive notification
  const notification = document.createElement('div');
  notification.id = 'initial-sync-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #3b82f6;
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 9999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    max-width: 300px;
  `;

  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <div class="animate-spin" style="width: 16px; height: 16px; border: 2px solid transparent; border-top: 2px solid white; border-radius: 50%;"></div>
      <div>
        <div style="font-weight: 600;">Preparing Offline Mode</div>
        <div style="opacity: 0.9; font-size: 12px;">Downloading data for offline use...</div>
      </div>
    </div>
  `;

  document.body.appendChild(notification);
}

/**
 * Hide the initial sync notification
 */
function hideInitialSyncNotification(): void {
  const notification = document.getElementById('initial-sync-notification');
  if (notification) {
    notification.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }
}

/**
 * Show success notification after initial sync
 */
function showInitialSyncSuccess(): void {
  // Use a toast library or simple notification
  // For now, use a simple alert-like notification
  const notification = document.createElement('div');
  notification.id = 'initial-sync-success';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #10b981;
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 9999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
  `;

  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zm3.28 5.28a.75.75 0 0 0-1.06 0L7 8.22 5.78 7a.75.75 0 0 0-1.06 1.06L6.72 9.5l3.56-3.56a.75.75 0 0 0 0-1.06z"/>
      </svg>
      <span>Offline mode ready! Data downloaded successfully.</span>
    </div>
  `;

  document.body.appendChild(notification);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 5000);
}

/**
 * Show error notification if initial sync fails
 */
function showInitialSyncError(message: string): void {
  const notification = document.createElement('div');
  notification.id = 'initial-sync-error';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #f59e0b;
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 9999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    max-width: 300px;
    cursor: pointer;
  `;

  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM7 4a1 1 0 1 2 0v4a1 1 0 1 2 0V4zm0 6a1 1 0 1 2 0v2a1 1 0 0 1 0-2z"/>
      </svg>
      <div>
        <div style="font-weight: 600;">Offline setup incomplete</div>
        <div style="opacity: 0.9; font-size: 12px;">Some features may be limited offline. Try refreshing later.</div>
      </div>
    </div>
  `;

  notification.onclick = () => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  };

  document.body.appendChild(notification);

  // Auto-remove after 8 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 8000);
}
