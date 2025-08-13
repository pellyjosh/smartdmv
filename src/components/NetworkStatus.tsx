'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { setupNetworkListeners, isOnline } from '@/lib/client-network-utils';

interface NetworkStatusProps {
  showOfflineAlert?: boolean;
  onRetry?: () => void;
  className?: string;
}

export function NetworkStatus({ 
  showOfflineAlert = true, 
  onRetry,
  className = '' 
}: NetworkStatusProps) {
  const [online, setOnline] = useState(true);
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    // Set initial state
    setOnline(isOnline());

    // Setup listeners for online/offline events
    const cleanup = setupNetworkListeners();

    const handleOnline = () => {
      setOnline(true);
      setShowRetry(false);
    };

    const handleOffline = () => {
      setOnline(false);
      setShowRetry(true);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      cleanup?.();
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, []);

  const handleRetry = () => {
    if (isOnline()) {
      setOnline(true);
      setShowRetry(false);
      onRetry?.();
    }
  };

  if (online && !showRetry) {
    return null;
  }

  if (!showOfflineAlert && !showRetry) {
    return null;
  }

  return (
    <div className={`fixed top-4 right-4 z-50 ${className}`}>
      <Alert variant="destructive" className="max-w-md">
        <WifiOff className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            {!online 
              ? "You're offline. Check your internet connection." 
              : "Connection lost. Some features may not work."
            }
          </span>
          {(showRetry || onRetry) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="ml-2"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
}

export function NetworkIndicator({ className = '' }: { className?: string }) {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(isOnline());

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, []);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {online ? (
        <Wifi className="h-4 w-4 text-green-500" />
      ) : (
        <WifiOff className="h-4 w-4 text-red-500" />
      )}
      <span className="text-sm text-muted-foreground">
        {online ? 'Online' : 'Offline'}
      </span>
    </div>
  );
}
