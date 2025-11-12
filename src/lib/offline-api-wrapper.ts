/**
 * Offline API Wrapper
 * 
 * This utility provides a wrapper around API calls to support offline functionality.
 * It intercepts API calls, checks if the device is online, and handles accordingly:
 * - If online: makes the actual API call
 * - If offline: saves the operation to IndexedDB and queues it for later sync
 */

import { apiRequest, queryClient } from "./queryClient";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { useOfflineData } from "@/hooks/offline/use-offline-data";
import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

type Method = "GET" | "POST" | "PATCH" | "DELETE";

interface ApiOptions {
  /**
   * If true, operations performed while offline will be queued for sync 
   * when back online (default: true)
   */
  syncWhenOnline?: boolean;
  
  /**
   * If true, get requests will fallback to IndexedDB when offline (default: true)
   */
  offlineReadSupport?: boolean;
  
  /**
   * Entity type to use when storing in IndexedDB (e.g., "appointment", "soapNote")
   * Required for offline support
   */
  entityType: string;
}

/**
 * Hook to provide API functions with offline support
 */
export function useOfflineApi() {
  const { isOnline } = useNetworkStatus();
  const { saveOfflineData, getOfflineData, deleteOfflineData, getAllOfflineData } = useOfflineData();
  const { toast } = useToast();

  /**
   * Make an API request with offline support
   */
  const request = useCallback(
    async <T extends { id: number }>(
      method: Method,
      endpoint: string,
      data?: T,
      options?: ApiOptions
    ): Promise<T | T[] | null> => {
      const entityType = options?.entityType;
      const syncWhenOnline = options?.syncWhenOnline !== false;
      const offlineReadSupport = options?.offlineReadSupport !== false;
      
      // Require entity type for offline operations
      if (!isOnline && !entityType) {
        throw new Error("entityType is required for offline operations");
      }

      try {
        // Online: make the actual API request
        if (isOnline) {
          if (method === "GET") {
            // Extract ID from the endpoint for single-entity requests
            const idMatch = endpoint.match(/\/(\d+)$/);
            const id = idMatch ? parseInt(idMatch[1], 10) : null;
            
            // For GET requests, we don't need to do anything special
            const response = await apiRequest(method, endpoint);
            const result = await response.json();
            return result;
          } else {
            // For write operations
            const response = await apiRequest(method, endpoint, data);
            const result = await response.json();
            
            // Invalidate queries to refresh the UI
            const basePath = endpoint.split('/').slice(0, -1).join('/');
            queryClient.invalidateQueries({ queryKey: [basePath] });
            
            return result;
          }
        }
        
        // Offline handling
        if (method === "GET") {
          // ID-based single-entity request
          const idMatch = endpoint.match(/\/(\d+)$/);
          if (idMatch) {
            const id = parseInt(idMatch[1], 10);
            if (offlineReadSupport) {
              const offlineData = await getOfflineData<T>(entityType, id);
              
              if (!offlineData) {
                toast({
                  title: "Offline Mode",
                  description: "This data is not available offline.",
                  variant: "destructive",
                });
              }
              
              return offlineData;
            }
          } else {
            // Collection request
            if (offlineReadSupport) {
              const offlineData = await getAllOfflineData<T>(entityType);
              
              if (offlineData.length === 0) {
                toast({
                  title: "Offline Mode",
                  description: "No offline data available for this collection.",
                  variant: "default",
                });
              }
              
              return offlineData;
            }
          }
        } else if (method === "POST" || method === "PATCH") {
          // Create or update
          if (data && syncWhenOnline) {
            await saveOfflineData(entityType, data);
            
            toast({
              title: "Saved Offline",
              description: "Changes will sync when you're back online.",
            });
            
            return data;
          }
        } else if (method === "DELETE") {
          // Delete
          const idMatch = endpoint.match(/\/(\d+)$/);
          if (idMatch && syncWhenOnline) {
            const id = parseInt(idMatch[1], 10);
            await deleteOfflineData(entityType, id, true);
            
            toast({
              title: "Deleted Offline",
              description: "Changes will sync when you're back online.",
            });
            
            return null;
          }
        }
        
        // Fallback for offline without appropriate handling
        toast({
          title: "No Offline Support",
          description: "This operation requires an internet connection.",
          variant: "destructive",
        });
        
        return null;
      } catch (error) {
        console.error(`API error (${method} ${endpoint}):`, error);
        
        toast({
          title: "Operation Failed",
          description: error instanceof Error ? error.message : "An unknown error occurred",
          variant: "destructive",
        });
        
        throw error;
      }
    },
    [isOnline, saveOfflineData, getOfflineData, deleteOfflineData, getAllOfflineData, toast]
  );

  /**
   * GET request with offline support
   */
  const get = useCallback(
    <T extends { id: number }>(endpoint: string, options?: ApiOptions): Promise<T | T[] | null> => {
      return request<T>("GET", endpoint, undefined, options);
    },
    [request]
  );

  /**
   * POST request with offline support
   */
  const post = useCallback(
    <T extends { id: number }>(endpoint: string, data: T, options?: ApiOptions): Promise<T | null> => {
      return request<T>("POST", endpoint, data, options) as Promise<T | null>;
    },
    [request]
  );

  /**
   * PATCH request with offline support
   */
  const patch = useCallback(
    <T extends { id: number }>(endpoint: string, data: T, options?: ApiOptions): Promise<T | null> => {
      return request<T>("PATCH", endpoint, data, options) as Promise<T | null>;
    },
    [request]
  );

  /**
   * DELETE request with offline support
   */
  const del = useCallback(
    (endpoint: string, options?: ApiOptions): Promise<null> => {
      return request("DELETE", endpoint, undefined, options) as Promise<null>;
    },
    [request]
  );

  return {
    get,
    post,
    patch,
    delete: del,
  };
}