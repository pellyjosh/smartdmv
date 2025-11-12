/**
 * useNetworkStatus Hook
 * React hook for monitoring network status and auto-sync
 */

import { useState, useEffect } from 'react';
import { getNetworkMonitor, type NetworkStatus } from '@/lib/offline/core/network-monitor';

export interface UseNetworkStatusReturn {
  status: NetworkStatus;
  isOnline: boolean;
  isOffline: boolean;
  isSlow: boolean;
  timeSinceOnline: number;
  triggerSync: () => Promise<boolean>;
}

export function useNetworkStatus(): UseNetworkStatusReturn {
  const [status, setStatus] = useState<NetworkStatus>('online');
  const [timeSinceOnline, setTimeSinceOnline] = useState(0);

  useEffect(() => {
    const monitor = getNetworkMonitor();
    
    // Set initial status
    setStatus(monitor.getStatus());
    setTimeSinceOnline(monitor.getTimeSinceOnline());

    // Subscribe to status changes
    const unsubscribe = monitor.addListener((newStatus) => {
      setStatus(newStatus);
      setTimeSinceOnline(monitor.getTimeSinceOnline());
    });

    // Update time since online every second when offline
    const interval = setInterval(() => {
      if (!monitor.isOnline()) {
        setTimeSinceOnline(monitor.getTimeSinceOnline());
      }
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const triggerSync = async () => {
    const monitor = getNetworkMonitor();
    return await monitor.manualSync();
  };

  return {
    status,
    isOnline: status === 'online',
    isOffline: status === 'offline',
    isSlow: status === 'slow',
    timeSinceOnline,
    triggerSync,
  };
}
