/**
 * PWA (Progressive Web App) utilities for SmartDVM
 * Handles service worker registration, manifest management, and offline functionality
 */

import { useEffect, useState } from 'react';

export interface PWARegistrationResult {
  success: boolean;
  error?: string;
  registration?: ServiceWorkerRegistration;
}

export interface PWAStatus {
  isSupported: boolean;
  isInstalled: boolean;
  canInstall: boolean;
  registration?: ServiceWorkerRegistration;
  updateAvailable: boolean;
}

/**
 * Register the service worker
 */
export async function registerServiceWorker(): Promise<PWARegistrationResult> {
  console.log('[PWA] Checking service worker support...');

  if (!('serviceWorker' in navigator)) {
    console.warn('[PWA] Service workers not supported');
    return {
      success: false,
      error: 'Service workers not supported'
    };
  }

  // Check if we're in a secure context for service worker registration
  const isSecureContext = location.protocol === 'https:' ||
                         location.hostname === 'localhost' ||
                         location.hostname.endsWith('.localhost');

  if (!isSecureContext) {
    console.warn('[PWA] Service workers require HTTPS. Skipping registration in insecure context.');
    console.warn('[PWA] Your offline functionality still works via IndexedDB and sync queues.');
    return {
      success: false,
      error: 'Service workers require a secure context (HTTPS)'
    };
  }

  try {
    console.log('[PWA] Registering service worker at /sw.js with scope /');
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    console.log('[PWA] Service worker registration successful:', registration);

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available
            console.log('[PWA] New version available');
            // Notify the app about the update
            window.dispatchEvent(new CustomEvent('sw-update-available', {
              detail: { registration }
            }));
          }
        });
      }
    });

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, payload } = event.data;

      switch (type) {
        case 'SYNC_STARTED':
          window.dispatchEvent(new CustomEvent('sync-started'));
          break;
        case 'SYNC_COMPLETED':
          window.dispatchEvent(new CustomEvent('sync-completed'));
          break;
        case 'REQUEST_FAILED':
          window.dispatchEvent(new CustomEvent('request-failed', { detail: payload }));
          break;
        default:
          console.log('[PWA] Unknown message from SW:', type);
      }
    });

    console.log('[PWA] Service worker registered successfully');
    return {
      success: true,
      registration
    };
  } catch (error) {
    console.error('[PWA] Service worker registration failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Unregister the service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const unregisterPromises = registrations.map(registration => registration.unregister());

    await Promise.all(unregisterPromises);
    console.log('[PWA] Service worker unregistered');
    return true;
  } catch (error) {
    console.error('[PWA] Failed to unregister service worker:', error);
    return false;
  }
}

/**
 * Check if the app is installed as PWA
 */
export function isInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
}

/**
 * Check if the app can be installed
 */
export function canInstall(): boolean {
  return 'beforeinstallprompt' in window;
}

/**
 * Listen for install prompt
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setCanInstall(false);
      console.log('[PWA] App installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    setDeferredPrompt(null);
    setCanInstall(false);

    return outcome === 'accepted';
  };

  return { canInstall, install };
}

/**
 * Get PWA status
 */
export async function getPWAStatus(): Promise<PWAStatus> {
  const isSupported = 'serviceWorker' in navigator && 'caches' in window;
  const isInstalledStatus = isInstalled();
  const canInstallStatus = canInstall();

  let registration: ServiceWorkerRegistration | undefined;
  let updateAvailable = false;

  if (isSupported) {
    try {
      registration = await navigator.serviceWorker.getRegistration();

      if (registration) {
        // Check if there's a waiting worker (update available)
        updateAvailable = !!registration.waiting;
      }
    } catch (error) {
      console.warn('[PWA] Failed to get registration:', error);
    }
  }

  return {
    isSupported,
    isInstalled: isInstalledStatus,
    canInstall: canInstallStatus,
    registration,
    updateAvailable
  };
}

/**
 * Update service worker
 */
export async function updateServiceWorker(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return false;

    // Skip waiting for the waiting worker
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      return true;
    }

    return false;
  } catch (error) {
    console.error('[PWA] Failed to update service worker:', error);
    return false;
  }
}

/**
 * Clear all caches
 */
export async function clearCaches(): Promise<boolean> {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));

    // Notify service worker to clear its caches too
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration?.active) {
      registration.active.postMessage({ type: 'CLEAR_CACHE' });
    }

    console.log('[PWA] All caches cleared');
    return true;
  } catch (error) {
    console.error('[PWA] Failed to clear caches:', error);
    return false;
  }
}

/**
 * Hook to manage PWA status
 */
export function usePWAStatus() {
  const [status, setStatus] = useState<PWAStatus>({
    isSupported: false,
    isInstalled: false,
    canInstall: false,
    updateAvailable: false
  });

  const refreshStatus = async () => {
    const newStatus = await getPWAStatus();
    setStatus(newStatus);
  };

  useEffect(() => {
    refreshStatus();

    // Listen for update events
    const handleUpdateAvailable = () => {
      setStatus(prev => ({ ...prev, updateAvailable: true }));
    };

    window.addEventListener('sw-update-available', handleUpdateAvailable);

    return () => {
      window.removeEventListener('sw-update-available', handleUpdateAvailable);
    };
  }, []);

  return { ...status, refreshStatus };
}

/**
 * Initialize PWA on app startup
 */
export async function initializePWA(): Promise<PWARegistrationResult> {
  console.log('[PWA] Initializing PWA...');

  // Register service worker
  const result = await registerServiceWorker();

  if (result.success) {
    console.log('[PWA] PWA initialized successfully');
  } else {
    console.warn('[PWA] PWA initialization failed:', result.error);
  }

  return result;
}
