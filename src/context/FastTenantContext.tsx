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
import { TenantCache } from "@/lib/tenant-cache";

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
interface FastTenantProviderProps {
  children: ReactNode;
}

// --- Helper Functions ---
const extractTenantFromDomain = (hostname: string): string | null => {
  const cleanHostname = hostname.split(":")[0];

  if (
    cleanHostname === "localhost" ||
    /^\d+\.\d+\.\d+\.\d+$/.test(cleanHostname)
  ) {
    return null;
  }

  const parts = cleanHostname.split(".");

  // Handle localhost subdomains like "smartvet.localhost"
  if (parts.length >= 2 && parts[parts.length - 1] === "localhost") {
    return parts[0];
  }

  if (parts.length >= 3) {
    return parts[0];
  }

  return cleanHostname;
};

// Optimized fetch with multiple fallbacks
const fetchTenantInfo = async (
  identifier: string | null
): Promise<TenantInfo | null> => {
  if (!identifier) return null;

  // Check session storage first
  const cached = TenantCache.get();
  if (cached && TenantCache.isValidForCurrentHostname(cached.data)) {
    console.log("[TENANT] Using session storage cache");
    return cached.data.tenant;
  }

  try {
    // Use the existing optimized API endpoint
    const response = await fetch(`/api/tenant/resolve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        identifier,
        type: "domain",
      }),
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Tenant not found");
      }
      if (response.status === 403) {
        throw new Error("Tenant is not active");
      }
      throw new Error(`Failed to resolve tenant: ${response.statusText}`);
    }

    const data = await response.json();
    const tenantInfo = data.tenant || null;

    // Cache in session storage with hostname
    if (tenantInfo) {
      TenantCache.set({
        tenant: tenantInfo,
        hostname: window.location.hostname,
      });
    }

    return tenantInfo;
  } catch (error) {
    console.error("Error fetching tenant info:", error);
    throw error;
  }
};

// --- Fast Provider Component ---
export const FastTenantProvider: React.FC<FastTenantProviderProps> = ({
  children,
}) => {
  const [initialTenantChecked, setInitialTenantChecked] = useState(false);

  // Memoize hostname and tenant identifier to prevent unnecessary re-calculations
  const hostname = useMemo(() => {
    return typeof window !== "undefined" ? window.location.hostname : "";
  }, []);

  const tenantIdentifier = useMemo(() => {
    return extractTenantFromDomain(hostname);
  }, [hostname]);

  // Use React Query with aggressive caching
  const {
    data: tenant,
    isLoading,
    error,
    refetch,
    isError,
  } = useQuery({
    queryKey: ["tenant-fast", tenantIdentifier, hostname],
    queryFn: () => fetchTenantInfo(tenantIdentifier),
    enabled: !!tenantIdentifier,
    staleTime: 10 * 60 * 1000, // 10 minutes - very aggressive caching
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    retry: (failureCount, error: any) => {
      if (
        error?.message?.includes("not found") ||
        error?.message?.includes("not active")
      ) {
        return false;
      }
      return failureCount < 1; // Only retry once to be fast
    },
    retryDelay: 500, // Fast retry
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchInterval: 15 * 60 * 1000, // Background refresh every 15 minutes
  });

  const refreshTenant = useCallback(async () => {
    TenantCache.clear(); // Clear session cache
    await refetch();
  }, [refetch]);

  // Set initial tenant checked once data is loaded
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
        TenantCache.clear();
        refreshTenant();
      }
    };

    // Use a more efficient event listener
    const handlePopState = () => {
      // Debounce to avoid multiple calls
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

export default FastTenantProvider;
