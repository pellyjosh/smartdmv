/**
 * Menu data utilities for offline protection
 * 
 * Provides helpers to extract and flatten menu configuration for use
 * with the OfflineProtected component.
 */

import type { OfflineFeatureConfig } from "@/components/offline";

/**
 * Flattens nested menu structure into a simple array
 * suitable for offline protection checks.
 * 
 * Use this to transform your AppSidebar menuGroups into
 * the format needed by OfflineProtected.
 * 
 * @example
 * ```tsx
 * const menuData = flattenMenuForOfflineCheck(menuGroups);
 * return <OfflineProtected menuData={menuData}>...</OfflineProtected>
 * ```
 */
export function flattenMenuForOfflineCheck(
  menuGroups: Array<{
    id?: string;
    title?: string;
    href?: string;
    offlineSupported?: boolean;
    offlineMessage?: string;
    items?: Array<{
      title: string;
      href?: string;
      offlineSupported?: boolean;
      offlineMessage?: string;
      submenu?: Array<{
        title: string;
        href: string;
        offlineSupported?: boolean;
        offlineMessage?: string;
      }>;
    }>;
  }>
): OfflineFeatureConfig[] {
  const flattened: OfflineFeatureConfig[] = [];

  for (const menuGroup of menuGroups) {
    // Add the menu group itself if it has an href
    if (menuGroup.href) {
      flattened.push({
        title: menuGroup.title || menuGroup.id || 'Unnamed',
        href: menuGroup.href,
        offlineSupported: menuGroup.offlineSupported,
        offlineMessage: menuGroup.offlineMessage,
      });
    }

    // Add items if they exist
    if (menuGroup.items) {
      for (const item of menuGroup.items) {
        // Add main item if it has an href
        if (item.href) {
          flattened.push({
            title: item.title,
            href: item.href,
            offlineSupported: item.offlineSupported,
            offlineMessage: item.offlineMessage,
          });
        }

        // Add submenu items
        if (item.submenu && item.submenu.length > 0) {
          for (const subitem of item.submenu) {
            flattened.push({
              title: subitem.title,
              href: subitem.href,
              offlineSupported: subitem.offlineSupported,
              offlineMessage: subitem.offlineMessage,
            });
          }
        }
      }
    }
  }

  return flattened;
}

/**
 * Checks if a specific route is offline-compatible
 * based on the menu configuration.
 * 
 * @param pathname - Current route pathname
 * @param menuData - Flattened menu data
 * @returns true if route supports offline, false otherwise
 */
export function isRouteOfflineCompatible(
  pathname: string,
  menuData: OfflineFeatureConfig[]
): boolean {
  const feature = menuData.find((item) => {
    if (item.href === pathname) return true;
    if (pathname.startsWith(item.href) && item.href !== "/") return true;
    return false;
  });

  if (!feature) return true; // Not in menu = allow by default
  return feature.offlineSupported !== false;
}

/**
 * Gets the offline message for a specific route
 * 
 * @param pathname - Current route pathname
 * @param menuData - Flattened menu data
 * @returns Offline message or undefined if none configured
 */
export function getOfflineMessage(
  pathname: string,
  menuData: OfflineFeatureConfig[]
): string | undefined {
  const feature = menuData.find((item) => {
    if (item.href === pathname) return true;
    if (pathname.startsWith(item.href) && item.href !== "/") return true;
    return false;
  });

  return feature?.offlineMessage;
}
