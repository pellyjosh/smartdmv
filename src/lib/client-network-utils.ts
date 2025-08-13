// Client-side network error handling utilities
'use client';

import { toast } from '@/hooks/use-toast';

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  isNetworkError?: boolean;
  isDatabaseError?: boolean;
  retryable?: boolean;
}

export interface FetchOptions extends RequestInit {
  maxRetries?: number;
  retryDelay?: number;
  showToast?: boolean;
}

/**
 * Enhanced fetch wrapper with automatic retry logic and user-friendly error handling
 */
export async function fetchWithRetry<T = any>(
  url: string, 
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const {
    maxRetries = 2,
    retryDelay = 1000,
    showToast = true,
    ...fetchOptions
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          'Content-Type': 'application/json',
          ...fetchOptions.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error occurred' }));
        
        // Check if it's a network/database error that should be retried
        if (response.status === 503 && errorData.retryable && attempt < maxRetries) {
          console.log(`[Client Retry] Attempt ${attempt + 1} failed, retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
          continue;
        }

        // Handle specific error cases
        if (response.status === 503 && (errorData.isNetworkError || errorData.isDatabaseError)) {
          const message = errorData.error || 'Unable to connect to the server. Please check your internet connection and try again.';
          
          if (showToast) {
            toast({
              title: 'Connection Error',
              description: message,
              variant: 'destructive',
            });
          }

          return {
            error: message,
            isNetworkError: errorData.isNetworkError,
            isDatabaseError: errorData.isDatabaseError,
            retryable: errorData.retryable,
          };
        }

        // Handle other HTTP errors
        const errorMessage = errorData.error || `Request failed with status ${response.status}`;
        
        if (showToast && response.status >= 500) {
          toast({
            title: 'Server Error',
            description: errorMessage,
            variant: 'destructive',
          });
        }

        return {
          error: errorMessage,
          isNetworkError: false,
          isDatabaseError: false,
          retryable: false,
        };
      }

      const data = await response.json();
      return { data };

    } catch (error: any) {
      lastError = error;
      
      // Check if it's a network error that should be retried
      const isNetworkError = error.name === 'TypeError' || 
                            error.message?.includes('fetch') ||
                            error.message?.includes('network') ||
                            !navigator.onLine;

      if (isNetworkError && attempt < maxRetries) {
        console.log(`[Client Retry] Network error on attempt ${attempt + 1}, retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
        continue;
      }

      // Final attempt failed or non-retryable error
      const errorMessage = !navigator.onLine 
        ? 'You appear to be offline. Please check your internet connection and try again.'
        : 'Unable to connect to the server. Please check your internet connection and try again.';

      if (showToast) {
        toast({
          title: 'Connection Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }

      return {
        error: errorMessage,
        isNetworkError: true,
        isDatabaseError: false,
        retryable: true,
      };
    }
  }

  // This should never be reached, but just in case
  return {
    error: 'Maximum retry attempts exceeded',
    isNetworkError: true,
    isDatabaseError: false,
    retryable: false,
  };
}

/**
 * Check if the user is online
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Listen for online/offline events
 */
export function setupNetworkListeners() {
  if (typeof window === 'undefined') return;

  const handleOnline = () => {
    toast({
      title: 'Connection Restored',
      description: 'Your internet connection has been restored.',
      variant: 'default',
    });
  };

  const handleOffline = () => {
    toast({
      title: 'Connection Lost',
      description: 'You are currently offline. Some features may not work properly.',
      variant: 'destructive',
    });
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

/**
 * Hook for components to easily make API calls with error handling
 */
export function useApi() {
  const apiCall = async <T = any>(
    url: string, 
    options: FetchOptions = {}
  ): Promise<ApiResponse<T>> => {
    return fetchWithRetry<T>(url, options);
  };

  return { apiCall, isOnline: isOnline() };
}
