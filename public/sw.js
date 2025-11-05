/**
 * Service Worker for SmartDVM PWA
 * Handles caching, offline functionality, and background sync
 */

const CACHE_NAME = 'smartdmv-v1.0.0';
const STATIC_CACHE = 'smartdmv-static-v1.0.0';
const API_CACHE = 'smartdmv-api-v1.0.0';

// Files to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/favicon.ico',
  // Add critical CSS and JS files that are known
  // These will be dynamically added during build
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/auth/me',
  '/api/roles',
  '/api/tenant/resolve',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== API_CACHE && cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

// Fetch event - handle requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets
  if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  // Default fetch
  event.respondWith(fetch(request));
});

// Handle navigation requests (page loads)
async function handleNavigationRequest(request) {
  try {
    // Try network first for navigation
    const networkResponse = await fetch(request);

    // If successful, cache for offline use
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed for navigation, trying cache');

    // Try cache fallback
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page
    return caches.match('/offline').then((response) => {
      return response || new Response('Offline - Please check your connection', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain' }
      });
    });
  }
}

// Handle API requests
async function handleApiRequest(request) {
  const url = new URL(request.url);

  // For GET requests, try cache first, then network
  if (request.method === 'GET') {
    try {
      // Try cache first
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        // Return cached response immediately
        // Also try to update cache in background
        fetch(request).then((networkResponse) => {
          if (networkResponse.ok) {
            const cache = caches.open(API_CACHE);
            cache.then(cache => cache.put(request, networkResponse));
          }
        }).catch(() => {
          // Network failed, keep cached version
        });

        return cachedResponse;
      }

      // No cache, try network
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        // Cache successful responses
        const cache = await caches.open(API_CACHE);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;

    } catch (error) {
      console.log('[SW] API request failed:', url.pathname);

      // Return cached response if available
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }

      // Return offline error for critical API calls
      if (API_ENDPOINTS.includes(url.pathname)) {
        return new Response(JSON.stringify({
          error: 'Offline',
          message: 'This data is not available offline. Please check your connection.'
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // For non-critical APIs, return generic offline response
      return new Response(JSON.stringify({
        error: 'Network Error',
        message: 'Unable to connect to server'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // For non-GET requests (POST, PUT, DELETE), try network only
  // These will be handled by the sync queue system
  try {
    return await fetch(request);
  } catch (error) {
    console.log('[SW] Non-GET API request failed:', request.method, url.pathname);

    // Queue for later sync if it's a data-modifying request
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      // Notify the app about failed request
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'REQUEST_FAILED',
            payload: {
              url: request.url,
              method: request.method,
              timestamp: Date.now()
            }
          });
        });
      });
    }

    return new Response(JSON.stringify({
      error: 'Offline',
      message: 'Request queued for sync when connection is restored'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle static assets
async function handleStaticAsset(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline response
    return new Response('Asset not available offline', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Check if request is for a static asset
function isStaticAsset(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Static file extensions
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot'];

  return staticExtensions.some(ext => pathname.endsWith(ext)) ||
         pathname.startsWith('/_next/static/') ||
         pathname.startsWith('/assets/');
}

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);

  if (event.tag === 'background-sync') {
    event.waitUntil(syncFailedRequests());
  }
});

// Sync failed requests
async function syncFailedRequests() {
  console.log('[SW] Syncing failed requests');

  // This would integrate with the app's sync queue
  // For now, just notify clients that sync is happening
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({
      type: 'SYNC_STARTED'
    });
  });

  // TODO: Implement actual sync logic here
  // This would read from IndexedDB sync queue and retry requests

  // Notify sync complete
  setTimeout(() => {
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_COMPLETED'
      });
    });
  }, 2000);
}

// Message handling from main thread
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CACHE_URL':
      // Cache a specific URL
      if (payload && payload.url) {
        caches.open(STATIC_CACHE).then((cache) => {
          return cache.add(payload.url);
        });
      }
      break;

    case 'CLEAR_CACHE':
      // Clear all caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      });
      break;

    default:
      console.log('[SW] Unknown message type:', type);
  }
});

// Periodic cleanup (run every hour)
setInterval(() => {
  cleanupOldCaches();
}, 60 * 60 * 1000);

async function cleanupOldCaches() {
  const cacheNames = await caches.keys();
  const validCaches = [STATIC_CACHE, API_CACHE, CACHE_NAME];

  const cleanupPromises = cacheNames
    .filter(cacheName => !validCaches.includes(cacheName))
    .map(cacheName => caches.delete(cacheName));

  if (cleanupPromises.length > 0) {
    console.log('[SW] Cleaning up old caches');
    await Promise.all(cleanupPromises);
  }
}
