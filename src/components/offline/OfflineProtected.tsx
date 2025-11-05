"use client";

import React, { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { OfflineUnavailablePage } from "./OfflineUnavailablePage";

// Menu data structure (should match AppSidebar)
export interface OfflineFeatureConfig {
  title: string;
  href: string;
  offlineSupported?: boolean;
  offlineMessage?: string;
}

interface OfflineProtectedProps {
  children: React.ReactNode;
  menuData: OfflineFeatureConfig[];
  fallback?: React.ReactNode;
}

/**
 * OfflineProtected Component
 *
 * Protects routes from being accessed offline based on menu configuration.
 * Checks if current route is marked as offline-incompatible in menu data.
 *
 * @param children - Content to render when feature is accessible
 * @param menuData - Array of menu items with offline configuration
 * @param fallback - Optional custom fallback instead of default unavailable page
 */
export function OfflineProtected({
  children,
  menuData,
  fallback,
}: OfflineProtectedProps) {
  const pathname = usePathname();
  const { isOnline } = useNetworkStatus();

  // Find the current route in menu data
  const currentFeature = useMemo(() => {
    return menuData.find((item) => {
      // Exact match
      if (item.href === pathname) return true;

      // Starts with match (for nested routes)
      if (pathname.startsWith(item.href) && item.href !== "/") return true;

      return false;
    });
  }, [pathname, menuData]);

  // Check if feature is offline-incompatible
  const isBlocked = useMemo(() => {
    if (isOnline) return false; // Always allow when online
    if (!currentFeature) return false; // Allow if not in menu (custom/dynamic routes)

    // Block if explicitly marked as offline-unsupported
    return currentFeature.offlineSupported === false;
  }, [isOnline, currentFeature]);

  // Show unavailable page if blocked
  if (isBlocked && currentFeature) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <OfflineUnavailablePage
        featureName={currentFeature.title}
        message={
          currentFeature.offlineMessage ||
          "This feature requires an internet connection and cannot be accessed offline."
        }
      />
    );
  }

  // Render normal content
  return <>{children}</>;
}

/**
 * Helper hook to check if current route is offline-compatible
 *
 * @param menuData - Array of menu items with offline configuration
 * @returns Object with offline protection status
 */
export function useOfflineProtection(menuData: OfflineFeatureConfig[]) {
  const pathname = usePathname();
  const { isOnline } = useNetworkStatus();

  const currentFeature = useMemo(() => {
    return menuData.find((item) => {
      if (item.href === pathname) return true;
      if (pathname.startsWith(item.href) && item.href !== "/") return true;
      return false;
    });
  }, [pathname, menuData]);

  const isOfflineCompatible = useMemo(() => {
    if (!currentFeature) return true; // Default to compatible if not in menu
    return currentFeature.offlineSupported !== false;
  }, [currentFeature]);

  const isBlocked = !isOnline && !isOfflineCompatible;

  return {
    isBlocked,
    isOfflineCompatible,
    currentFeature,
    isOnline,
    canAccess: !isBlocked,
  };
}
