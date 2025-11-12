/**
 * Network Status Monitor
 * Monitors online/offline status and triggers sync when connection is restored
 */

import { getSyncEngine } from '../sync/sync-engine';

export type NetworkStatus = 'online' | 'offline' | 'slow';
export type NetworkStatusListener = (status: NetworkStatus) => void;

class NetworkStatusMonitor {
  private status: NetworkStatus = 'online';
  private listeners: Set<NetworkStatusListener> = new Set();
  private lastOnlineTime: number = Date.now();
  private syncOnReconnect: boolean = true;
  private autoSyncEnabled: boolean = true;
  private syncInProgress: boolean = false;
  private periodicSyncInterval: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeListeners();
      this.checkInitialStatus();
      this.startPeriodicSync();
    }
  }

  /**
   * Start periodic sync check (every 30 seconds when online)
   */
  private startPeriodicSync() {
    // Check for pending operations every 30 seconds and retry if online
    this.periodicSyncInterval = setInterval(async () => {
      if (this.isOnline() && this.autoSyncEnabled && !this.syncInProgress) {
        console.log('[NetworkMonitor] 🔄 Periodic sync check...');
        await this.triggerAutoSync();
      }
    }, 30000); // 30 seconds
  }

  /**
   * Stop periodic sync
   */
  private stopPeriodicSync() {
    if (this.periodicSyncInterval) {
      clearInterval(this.periodicSyncInterval);
      this.periodicSyncInterval = null;
    }
  }

  /**
   * Initialize browser event listeners
   */
  private initializeListeners() {
    window.addEventListener('online', () => {
      this.handleOnline();
    });

    window.addEventListener('offline', () => {
      this.handleOffline();
    });

    // Monitor connection quality
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection?.addEventListener('change', () => {
        this.checkConnectionQuality();
      });
    }
  }

  /**
   * Check initial network status
   */
  private checkInitialStatus() {
    this.status = navigator.onLine ? 'online' : 'offline';
    this.checkConnectionQuality();
  }

  /**
   * Handle online event
   */
  private async handleOnline() {
    console.log('📶 [NetworkMonitor] Network connection restored');
    const wasOffline = this.status === 'offline';
    this.status = 'online';
    this.lastOnlineTime = Date.now();

    // Notify listeners
    this.notifyListeners(this.status);

    console.log(`[NetworkMonitor] wasOffline: ${wasOffline}, syncOnReconnect: ${this.syncOnReconnect}, autoSyncEnabled: ${this.autoSyncEnabled}`);

    // Trigger auto-sync if enabled and was offline
    if (this.syncOnReconnect && this.autoSyncEnabled && wasOffline) {
      console.log('[NetworkMonitor] ✅ Conditions met, triggering auto-sync');
      await this.triggerAutoSync();
    } else {
      console.log('[NetworkMonitor] ⏭️ Auto-sync skipped - conditions not met');
    }
  }

  /**
   * Handle offline event
   */
  private handleOffline() {
    console.log('📡 Network connection lost');
    this.status = 'offline';
    this.notifyListeners(this.status);
  }

  /**
   * Check connection quality
   */
  private checkConnectionQuality() {
    if (!navigator.onLine) {
      this.status = 'offline';
      return;
    }

    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      const effectiveType = connection?.effectiveType;

      // Mark as slow if on 2G or slow-2g
      if (effectiveType === '2g' || effectiveType === 'slow-2g') {
        if (this.status !== 'slow') {
          console.log('🐌 Slow network detected');
          this.status = 'slow';
          this.notifyListeners(this.status);
        }
      } else if (this.status !== 'online') {
        this.status = 'online';
        this.notifyListeners(this.status);
      }
    }
  }

  /**
   * Trigger automatic sync
   */
  private async triggerAutoSync() {
    if (this.syncInProgress) {
      console.log('[NetworkMonitor] Sync already in progress, skipping auto-sync');
      return;
    }

    try {
      this.syncInProgress = true;

      const syncEngine = getSyncEngine({
        syncOnReconnect: true,
        autoResolveSimple: true,
      });

      // Check if there are any pending operations
      const pendingCount = await syncEngine.getPendingOperationsCount();
      if (pendingCount === 0) {
        console.log('[NetworkMonitor] No pending operations, skipping sync');
        return;
      }

      console.log(`[NetworkMonitor] 🔄 Auto-sync starting: ${pendingCount} pending operations`);

      const result = await syncEngine.bidirectionalSync();

      if (result.success) {
        console.log(`[NetworkMonitor] ✅ Auto-sync completed: ${result.synced} synced`);
      } else {
        console.warn(`[NetworkMonitor] ⚠️ Auto-sync completed: ${result.synced} synced, ${result.failed} failed (will retry)`);
      }

      if (result.conflicts > 0) {
        console.warn(`[NetworkMonitor] ⚠️ ${result.conflicts} conflicts detected`);
      }
    } catch (error) {
      console.error('[NetworkMonitor] Auto-sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Notify all listeners of status change
   */
  private notifyListeners(status: NetworkStatus) {
    this.listeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('Network status listener error:', error);
      }
    });
  }

  /**
   * Add status listener
   */
  addListener(listener: NetworkStatusListener): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Remove status listener
   */
  removeListener(listener: NetworkStatusListener) {
    this.listeners.delete(listener);
  }

  /**
   * Get current network status
   */
  getStatus(): NetworkStatus {
    return this.status;
  }

  /**
   * Is currently online
   */
  isOnline(): boolean {
    return this.status === 'online';
  }

  /**
   * Is currently offline
   */
  isOffline(): boolean {
    return this.status === 'offline';
  }

  /**
   * Is connection slow
   */
  isSlow(): boolean {
    return this.status === 'slow';
  }

  /**
   * Get time since last online
   */
  getTimeSinceOnline(): number {
    return Date.now() - this.lastOnlineTime;
  }

  /**
   * Enable/disable auto-sync on reconnect
   */
  setSyncOnReconnect(enabled: boolean) {
    this.syncOnReconnect = enabled;
  }

  /**
   * Enable/disable all auto-sync functionality
   */
  setAutoSyncEnabled(enabled: boolean) {
    this.autoSyncEnabled = enabled;
  }

  /**
   * Manually trigger sync (respects autoSyncEnabled)
   */
  async manualSync(): Promise<boolean> {
    if (!this.autoSyncEnabled) {
      console.warn('[NetworkMonitor] Auto-sync is disabled');
      return false;
    }

    if (!this.isOnline()) {
      console.warn('[NetworkMonitor] Cannot sync while offline');
      return false;
    }

    await this.triggerAutoSync();
    return true;
  }
}

/**
 * Singleton instance
 */
let networkMonitor: NetworkStatusMonitor | null = null;

/**
 * Get network monitor instance
 */
export function getNetworkMonitor(): NetworkStatusMonitor {
  if (!networkMonitor) {
    networkMonitor = new NetworkStatusMonitor();
  }
  return networkMonitor;
}

/**
 * Initialize network monitoring (call in app initialization)
 */
export function initializeNetworkMonitoring(options?: {
  syncOnReconnect?: boolean;
  autoSyncEnabled?: boolean;
}): NetworkStatusMonitor {
  const monitor = getNetworkMonitor();
  
  if (options?.syncOnReconnect !== undefined) {
    monitor.setSyncOnReconnect(options.syncOnReconnect);
  }
  
  if (options?.autoSyncEnabled !== undefined) {
    monitor.setAutoSyncEnabled(options.autoSyncEnabled);
  }

  return monitor;
}
