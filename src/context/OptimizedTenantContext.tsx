"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";

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

  // For localhost or IP addresses, return null
  if (
    cleanHostname === "localhost" ||
    /^\d+\.\d+\.\d+\.\d+$/.test(cleanHostname)
  ) {
    return null;
  }

  const parts = cleanHostname.split(".");

  // Handle localhost subdomains like "smartvet.localhost"
  if (parts.length >= 2 && parts[parts.length - 1] === "localhost") {
    return parts[0]; // Return "smartvet" from "smartvet.localhost"
  }

  // If it's a subdomain of your main domain
  if (parts.length >= 3) {
    return parts[0];
  }

  // If it's a custom domain, return full hostname for API lookup
  return cleanHostname;
};

const fetchTenantInfo = async (
  identifier: string | null
): Promise<TenantInfo | null> => {
  if (!identifier) {
    return null;
  }

  try {
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
    return data.tenant || null;
  } catch (error) {
    console.error("Error fetching tenant info:", error);
    throw error;
  }
};

// --- Provider Component ---
export const OptimizedTenantProvider: React.FC<TenantProviderProps> = ({
  children,
}) => {
  const [initialTenantChecked, setInitialTenantChecked] = useState(false);

  // Get the current hostname
  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "";
  const tenantIdentifier = extractTenantFromDomain(hostname);

  // Use React Query for caching and optimized data fetching
  const {
    data: tenant,
    isLoading,
    error,
    refetch,
    isError,
  } = useQuery({
    queryKey: ["tenant", tenantIdentifier],
    queryFn: () => fetchTenantInfo(tenantIdentifier),
    enabled: !!tenantIdentifier, // Only run if we have a tenant identifier
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: (failureCount, error: any) => {
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
  });

  const refreshTenant = async () => {
    await refetch();
  };

  // Set initial tenant checked once data is loaded or error occurs
  useEffect(() => {
    if (!isLoading && !initialTenantChecked) {
      setInitialTenantChecked(true);
    }
  }, [isLoading, initialTenantChecked]);

  // Handle hostname changes (for client-side navigation)
  useEffect(() => {
    const handleLocationChange = () => {
      const newHostname = window.location.hostname;
      const newTenantIdentifier = extractTenantFromDomain(newHostname);

      // Only refetch if the tenant identifier actually changed
      if (newTenantIdentifier !== tenantIdentifier) {
        refreshTenant();
      }
    };

    window.addEventListener("popstate", handleLocationChange);
    return () => {
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, [tenantIdentifier, refreshTenant]);

  const contextValue: TenantContextType = {
    tenant: tenant || null,
    isLoading,
    error: isError ? (error as Error)?.message || "Unknown error" : null,
    refreshTenant,
    initialTenantChecked,
  };

  return (
    <TenantContext.Provider value={contextValue}>
      {children}
    </TenantContext.Provider>
  );
};

export default OptimizedTenantProvider;
