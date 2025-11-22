"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useMemo,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { getCachedTenantData } from "@/lib/offline/storage/tenant-storage";
import { getTenantIdForCache } from "@/lib/auth-cache";
import { indexedDBManager } from "@/lib/offline/db";

// --- Types ---
interface TenantInfo {
  id: string;
  slug: string;
  name: string;
  domain?: string;
  subdomain?: string;
  status: "active" | "inactive" | "suspended";
  databaseName: string;
  storagePath: string;
  settings?: {
    timezone?: string;
    theme?: string;
    features?: string[];
  };
}

interface TenantContextType {
  tenant: TenantInfo | null;
  isLoading: boolean;
  error: string | null;
  refreshTenant: () => Promise<void>;
  initialTenantChecked: boolean;
}

// --- Context ---
const TenantContext = createContext<TenantContextType | undefined>(undefined);

// --- Hook ---
export const useTenant = (): TenantContextType => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
};

// --- Provider Props ---
interface TenantProviderProps {
  children: ReactNode;
}

// --- Helper Functions ---
const extractTenantFromDomain = (hostname: string): string | null => {
  // Remove port if present
  const cleanHostname = hostname.split(":")[0];

  // Handle different domain patterns:
  // 1. subdomain.yourdomain.com -> subdomain
  // 2. tenant-slug.yourdomain.com -> tenant-slug
  // 3. custom-domain.com -> handle via API lookup

  const parts = cleanHostname.split(".");

  // For localhost or IP addresses, return null (will need to be handled differently)
  if (
    cleanHostname === "localhost" ||
    /^\d+\.\d+\.\d+\.\d+$/.test(cleanHostname)
  ) {
    return null;
  }

  // Handle localhost subdomains like "smartvet.localhost"
  if (parts.length >= 2 && parts[parts.length - 1] === "localhost") {
    return parts[0]; // Return "smartvet" from "smartvet.localhost"
  }

  // If it's a subdomain of your main domain
  if (parts.length >= 3) {
    // Assuming your main domain is the last two parts (e.g., yourdomain.com)
    // The first part would be the tenant identifier
    return parts[0];
  }

  // If it's a custom domain, we'll need to look it up via API
  // For now, return the full hostname as the identifier
  return cleanHostname;
};

// Session storage cache for faster repeat loads
const getTenantFromSessionCache = (identifier: string | null) => {
  if (!identifier || typeof window === "undefined") return null;

  try {
    const cached = sessionStorage.getItem(`tenant_${identifier}`);
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid (5 minutes)
    if (now - parsed.timestamp > 5 * 60 * 1000) {
      sessionStorage.removeItem(`tenant_${identifier}`);
      return null;
    }

    console.log(`[TENANT] Using session storage cache for: ${identifier}`);
    return parsed.data;
  } catch {
    return null;
  }
};

const setTenantInSessionCache = (identifier: string | null, data: any) => {
  if (!identifier || typeof window === "undefined") return;

  try {
    const cacheData = {
      data,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(`tenant_${identifier}`, JSON.stringify(cacheData));
  } catch (error) {
    console.warn("Failed to cache tenant data:", error);
  }
};

const fetchTenantInfo = async (
  identifier: string | null
): Promise<TenantInfo | null> => {
  if (!identifier) {
    return null;
  }

  // Check session storage first for instant response
  const cached = getTenantFromSessionCache(identifier);
  if (cached) {
    return cached;
  }

  // Check if we're offline - if so, skip API call and load from IndexedDB immediately
  const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

  if (isOffline) {
    console.log(
      "[TENANT] 🔌 Offline mode detected, loading from IndexedDB cache"
    );
    try {
      const cachedTenant = await getCachedTenantData(identifier);
      if (cachedTenant) {
        console.log(
          "[TENANT] ✅ Using cached tenant from IndexedDB:",
          cachedTenant.name
        );
        // Also cache in sessionStorage for faster subsequent access
        setTenantInSessionCache(identifier, cachedTenant as TenantInfo);
        return cachedTenant as TenantInfo;
      }
      console.warn(
        "[TENANT] No cached tenant found in IndexedDB for offline mode"
      );
      return null;
    } catch (cacheError) {
      console.error(
        "[TENANT] Failed to load from IndexedDB cache:",
        cacheError
      );
      return null;
    }
  }

  // Online mode - try API with cache fallback
  try {
    const response = await fetch(`/api/tenant/resolve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        identifier,
        type: "domain", // or 'subdomain' or 'slug'
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to resolve tenant: ${response.statusText}`);
    }

    const data = await response.json();
    const tenantInfo = data.tenant || null;

    // Cache the result in session storage
    if (tenantInfo) {
      setTenantInSessionCache(identifier, tenantInfo);

      // Also cache to IndexedDB immediately for offline use
      try {
        const { cacheTenantData } = await import(
          "@/lib/offline/storage/tenant-storage"
        );
        const cachedTenant: any = {
          id: tenantInfo.id,
          slug: tenantInfo.slug,
          name: tenantInfo.name,
          domain: tenantInfo.domain || null,
          subdomain: identifier.includes(".")
            ? identifier.split(".")[0]
            : identifier,
          status: tenantInfo.status,
          databaseName: tenantInfo.databaseName,
          storagePath: tenantInfo.storagePath,
          settings: tenantInfo.settings || {
            timezone: "UTC",
            theme: "default",
            features: [],
          },
        };
        await cacheTenantData(cachedTenant);
        console.log(
          "[TENANT] ✅ Tenant data cached to IndexedDB:",
          tenantInfo.name
        );
      } catch (cacheError) {
        console.warn(
          "[TENANT] ⚠️ Failed to cache tenant data to IndexedDB:",
          cacheError
        );
      }
    }

    return tenantInfo;
  } catch (error) {
    console.error("Error fetching tenant info:", error);

    // Try IndexedDB cache as offline fallback
    // Only works if offline system was previously initialized
    try {
      console.log(
        "[TENANT] 🔄 Attempting to load from IndexedDB cache (offline mode)"
      );
      const cachedTenant = await getCachedTenantData(identifier);
      if (cachedTenant) {
        console.log(
          "[TENANT] ✅ Using cached tenant from IndexedDB:",
          cachedTenant.name
        );
        return cachedTenant as TenantInfo;
      }
    } catch (cacheError) {
      console.warn("[TENANT] Failed to load from IndexedDB cache:", cacheError);
    }

    throw error;
  }
};

// --- Provider Component ---
export const TenantProvider: React.FC<TenantProviderProps> = ({ children }) => {
  const [initialTenantChecked, setInitialTenantChecked] = useState(false);

  // Memoize hostname and tenant identifier to prevent unnecessary re-calculations
  const hostname = useMemo(() => {
    return typeof window !== "undefined" ? window.location.hostname : "";
  }, []);

  const tenantIdentifier = useMemo(() => {
    const extracted = extractTenantFromDomain(hostname);
    if (extracted) return extracted;
    try {
      const fallback = getTenantIdForCache();
      return fallback || null;
    } catch {
      return null;
    }
  }, [hostname]);

  useEffect(() => {
    const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
    if (!tenantIdentifier || !isOffline) return;
    const { tenantId } = indexedDBManager.getCurrentTenant();
    if (tenantId) return;
    try {
      indexedDBManager.setCurrentTenant(tenantIdentifier);
      indexedDBManager.initialize(tenantIdentifier);
    } catch {}
  }, [tenantIdentifier]);

  // Use React Query with caching for optimal performance
  const {
    data: tenant,
    isLoading,
    error,
    refetch,
    isError,
  } = useQuery({
    queryKey: ["tenant", tenantIdentifier, hostname],
    queryFn: () => fetchTenantInfo(tenantIdentifier),
    enabled: !!tenantIdentifier, // Only run if we have a tenant identifier
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: (failureCount, error: any) => {
      // Check if we're offline - don't retry if offline, just use cache
      const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
      if (isOffline) {
        console.log("[TENANT] 🔌 Offline mode detected, skipping retry for tenant resolution");
        return false;
      }

      // Don't retry for 404 (tenant not found) or 403 (tenant inactive)
      if (
        error?.message?.includes("not found") ||
        error?.message?.includes("not active")
      ) {
        return false;
      }
      return failureCount < 2; // Retry up to 2 times for other errors
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    refetchOnWindowFocus: false, // Disable refetch on window focus to reduce API calls
    refetchOnReconnect: true, // Refetch when reconnecting to internet
    refetchInterval: 15 * 60 * 1000, // Background refresh every 15 minutes
  });

  const refreshTenant = useCallback(async () => {
    // Clear session cache when manually refreshing
    if (tenantIdentifier) {
      try {
        sessionStorage.removeItem(`tenant_${tenantIdentifier}`);
      } catch {}
    }
    await refetch();
  }, [refetch, tenantIdentifier]);

  // Set initial tenant checked once data is loaded or error occurs
  useEffect(() => {
    if (!isLoading && !initialTenantChecked) {
      setInitialTenantChecked(true);
    }
  }, [isLoading, initialTenantChecked]);

  // Optimized hostname change detection
  useEffect(() => {
    let currentHostname = hostname;

    const handleLocationChange = () => {
      const newHostname = window.location.hostname;
      if (newHostname !== currentHostname) {
        currentHostname = newHostname;
        // Clear session cache for old hostname
        try {
          const oldIdentifier = extractTenantFromDomain(currentHostname);
          if (oldIdentifier) {
            sessionStorage.removeItem(`tenant_${oldIdentifier}`);
          }
        } catch {}
        refreshTenant();
      }
    };

    // Use a debounced event listener
    const handlePopState = () => {
      setTimeout(handleLocationChange, 50);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [hostname, refreshTenant]);

  const contextValue: TenantContextType = useMemo(
    () => ({
      tenant: tenant || null,
      isLoading,
      error: isError ? (error as Error)?.message || "Unknown error" : null,
      refreshTenant,
      initialTenantChecked,
    }),
    [tenant, isLoading, isError, error, refreshTenant, initialTenantChecked]
  );

  return (
    <TenantContext.Provider value={contextValue}>
      {children}
    </TenantContext.Provider>
  );
};

export default TenantProvider;
