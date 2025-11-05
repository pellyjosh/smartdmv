import { useState, useEffect } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  wasOnline: boolean;
  isTransitioning: boolean;
  downlink?: number;
  effectiveType?: string;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
    wasOnline: typeof window !== 'undefined' ? navigator.onLine : true,
    isTransitioning: false,
  });
  
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let transitionTimeout: NodeJS.Timeout;

    const handleOnline = () => {
      setStatus((prev) => ({
        ...prev,
        isOnline: true,
        wasOnline: prev.isOnline,
        isTransitioning: true,
      }));

      transitionTimeout = setTimeout(() => {
        setStatus((prev) => ({ ...prev, isTransitioning: false }));
      }, 2000);

      window.dispatchEvent(new CustomEvent('app-online'));
    };

    const handleOffline = () => {
      setStatus((prev) => ({
        ...prev,
        isOnline: false,
        wasOnline: prev.isOnline,
        isTransitioning: true,
      }));

      transitionTimeout = setTimeout(() => {
        setStatus((prev) => ({ ...prev, isTransitioning: false }));
      }, 2000);

      window.dispatchEvent(new CustomEvent('app-offline'));
    };

    const updateNetworkInfo = () => {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        setStatus((prev) => ({
          ...prev,
          downlink: connection.downlink,
          effectiveType: connection.effectiveType,
        }));
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.addEventListener('change', updateNetworkInfo);
    }

    // Initial network info
    updateNetworkInfo();

    return () => {
      clearTimeout(transitionTimeout);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        connection.removeEventListener('change', updateNetworkInfo);
      }
    };
  }, []);
  
  return status;
}
