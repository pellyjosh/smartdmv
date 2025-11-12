/**
 * Cache Manager - Handles post-authentication caching of offline-supported routes
 * This ensures all offline features are available without requiring users to visit each page
 */

// List of routes to cache after authentication (matches sw.js OFFLINE_SUPPORTED_ROUTES)
const OFFLINE_SUPPORTED_ROUTES = [
  // Admin Dashboard
  '/administrator',
  
  // Appointments
  '/admin/appointments',
  '/admin/appointment-requests',
  
  // Patient Care
  '/admin/clients',
  '/admin/contact-requests',
  '/admin/pet-admissions',
  '/admin/health-plans',
  '/admin/health-resources',
  '/admin/vaccinations',
  
  // Medical Records
  '/admin/soap-notes',
  '/admin/patient-timeline',
  '/admin/whiteboard',
  '/admin/checklists',
];

// Critical pages that must be cached
const CRITICAL_PAGES = [
  '/admin/online-only',
  '/offline',
];

/**
 * Triggers background caching of all offline-supported routes
 * Call this after successful authentication
 */
export async function cacheOfflineSupportedRoutes(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[Cache Manager] Service worker not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    if (!registration.active) {
      console.warn('[Cache Manager] No active service worker');
      return;
    }

    console.log('[Cache Manager] Starting post-authentication caching...');

    // Combine all routes to cache
    const allRoutes = [...CRITICAL_PAGES, ...OFFLINE_SUPPORTED_ROUTES];

    // Send message to service worker to cache these routes
    registration.active.postMessage({
      type: 'CACHE_ROUTES',
      payload: {
        routes: allRoutes,
        timestamp: Date.now()
      }
    });

    console.log(`[Cache Manager] Requested caching of ${allRoutes.length} routes`);

    // Optional: Cache routes client-side as well for redundancy
    await cacheRoutesClientSide(allRoutes);

  } catch (error) {
    console.error('[Cache Manager] Failed to trigger route caching:', error);
  }
}

/**
 * Cache routes from the client side using fetch
 * This ensures routes are cached even if SW message handling fails
 */
async function cacheRoutesClientSide(routes: string[]): Promise<void> {
  console.log('[Cache Manager] Client-side caching started');
  
  // Cache routes in batches to avoid overwhelming the browser
  const batchSize = 3;
  let cached = 0;
  let failed = 0;

  for (let i = 0; i < routes.length; i += batchSize) {
    const batch = routes.slice(i, i + batchSize);
    
    await Promise.allSettled(
      batch.map(async (route) => {
        try {
          // Fetch the route to trigger service worker caching
          const response = await fetch(route, {
            method: 'GET',
            credentials: 'include',
            cache: 'no-cache'
          });

          if (response.ok) {
            cached++;
            console.log(`[Cache Manager] ✅ Cached: ${route}`);
          } else {
            failed++;
            console.warn(`[Cache Manager] ⚠️ Failed to cache (${response.status}): ${route}`);
          }
        } catch (error) {
          failed++;
          console.warn(`[Cache Manager] ❌ Error caching ${route}:`, error);
        }
      })
    );

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < routes.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`[Cache Manager] Client-side caching complete: ${cached} cached, ${failed} failed`);
}

/**
 * Check if offline caching has been completed
 */
export async function isOfflineCachingComplete(): Promise<boolean> {
  if (!('caches' in window)) {
    return false;
  }

  try {
    const cacheNames = await caches.keys();
    const pagesCache = cacheNames.find(name => name.includes('smartdmv-pages'));
    
    if (!pagesCache) {
      return false;
    }

    const cache = await caches.open(pagesCache);
    const cachedRequests = await cache.keys();
    const cachedUrls = cachedRequests.map(req => new URL(req.url).pathname);

    // Check if critical pages are cached
    const criticalCached = CRITICAL_PAGES.every(route => 
      cachedUrls.some(url => url === route)
    );

    return criticalCached;
  } catch (error) {
    console.error('[Cache Manager] Error checking cache status:', error);
    return false;
  }
}

/**
 * Get caching progress
 */
export async function getCachingProgress(): Promise<{
  total: number;
  cached: number;
  percentage: number;
}> {
  const allRoutes = [...CRITICAL_PAGES, ...OFFLINE_SUPPORTED_ROUTES];
  
  if (!('caches' in window)) {
    return { total: allRoutes.length, cached: 0, percentage: 0 };
  }

  try {
    const cacheNames = await caches.keys();
    const pagesCache = cacheNames.find(name => name.includes('smartdmv-pages'));
    
    if (!pagesCache) {
      return { total: allRoutes.length, cached: 0, percentage: 0 };
    }

    const cache = await caches.open(pagesCache);
    const cachedRequests = await cache.keys();
    const cachedUrls = cachedRequests.map(req => new URL(req.url).pathname);

    const cached = allRoutes.filter(route => 
      cachedUrls.some(url => url === route)
    ).length;

    return {
      total: allRoutes.length,
      cached,
      percentage: Math.round((cached / allRoutes.length) * 100)
    };
  } catch (error) {
    console.error('[Cache Manager] Error getting cache progress:', error);
    return { total: allRoutes.length, cached: 0, percentage: 0 };
  }
}
