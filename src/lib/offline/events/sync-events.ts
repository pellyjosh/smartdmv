/**
 * Sync Event Emitter
 * Allows components to trigger sync when operations are added
 */

type SyncEventListener = () => void;

class SyncEventEmitter {
  private listeners: SyncEventListener[] = [];
  private lastTriggerTime: number = 0;
  private minTriggerInterval: number = 1000; // Minimum 1 second between triggers

  /**
   * Subscribe to sync trigger events
   */
  subscribe(listener: SyncEventListener): () => void {
    this.listeners.push(listener);
    console.log(`[SyncEventEmitter] Subscriber added (total: ${this.listeners.length})`);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
        console.log(`[SyncEventEmitter] Subscriber removed (total: ${this.listeners.length})`);
      }
    };
  }

  /**
   * Trigger sync for all subscribers
   * Throttled to prevent rapid-fire triggers
   */
  trigger() {
    const now = Date.now();
    const timeSinceLastTrigger = now - this.lastTriggerTime;

    // Throttle triggers to prevent infinite loops
    if (timeSinceLastTrigger < this.minTriggerInterval) {
      console.log(`[SyncEventEmitter] Throttled - only ${timeSinceLastTrigger}ms since last trigger`);
      return;
    }

    console.log(`[SyncEventEmitter] Triggering sync for ${this.listeners.length} subscriber(s)`);
    this.lastTriggerTime = now;

    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('[SyncEventEmitter] Error in sync listener:', error);
      }
    });
  }

  /**
   * Get number of active subscribers
   */
  getSubscriberCount(): number {
    return this.listeners.length;
  }

  /**
   * Reset throttle timer (for testing)
   */
  resetThrottle() {
    this.lastTriggerTime = 0;
  }
}

// Export singleton instance
export const syncEventEmitter = new SyncEventEmitter();
