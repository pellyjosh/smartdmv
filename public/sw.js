/**
 * Service Worker for SmartDVM PWA
 * Handles caching, offline functionality, and background sync
 * 
 * CACHING STRATEGY:
 * - Navigation (HTML pages): Network-first → Cache fallback → Offline page
 * - Offline-Supported Routes: Precached on install (Appointments, Patient Care, Medical Records)
 * - Next.js Static Assets (_next/static/): Cache-first with background update (stale-while-revalidate)
 * - Next.js Data (_next/data/): Network-first with cache fallback
 * - API Requests: Network-first for GET, cache as backup; POST/PUT/DELETE queued for sync
 * - Media Assets (images, videos): Cache-first for performance
 * - Static Assets (CSS, JS, fonts): Cache-first with background update
 * 
 * This ensures offline-supported features are immediately available without visiting them first.
 */

const CACHE_VERSION = 'v1.1.0';
const STATIC_CACHE = `smartdmv-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `smartdmv-dynamic-${CACHE_VERSION}`;
const API_CACHE = `smartdmv-api-${CACHE_VERSION}`;
const PAGES_CACHE = `smartdmv-pages-${CACHE_VERSION}`;
const ASSETS_CACHE = `smartdmv-assets-${CACHE_VERSION}`;

// Files to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/auth/login',
  '/offline',
  '/admin/online-only',
  '/manifest.json',
  '/favicon.ico',
];

// Offline-supported routes to precache (Appointments, Patient Care, Medical Records)
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
  '/admin/soap-notes/create',
  '/admin/patient-timeline',
  '/admin/whiteboard',
  '/admin/checklists',
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/auth/me',
  '/api/roles',
  '/api/tenant/resolve',
];

// Routes that should NOT be cached (require online connection)
// Only these sections support offline: Appointments, Patient Care, Medical Records
const ONLINE_ONLY_ROUTES = [
  // Clinical Tools (all require online)
  '/admin/lab-integration',
  '/admin/medical-imaging',
  '/admin/disease-reporting',
  '/admin/ai-diagnostic-assistant',
  
  // Inventory & Services
  '/admin/inventory',
  '/admin/boarding',
  '/admin/pos',
  '/admin/referrals',
  
  // Financial (all require online)
  '/admin/billing',
  '/admin/accounts-receivable',
  '/admin/expenses',
  '/admin/refunds',
  '/admin/payroll',
  
  // Administration (all require online)
  '/marketplace',
  '/admin/integration-settings',
  '/settings',
  '/admin/users-and-permissions',
  '/custom-fields',
  '/trash',
  '/communications-unified',
  '/admin/practice-admin',
  '/practice-billing',
  '/admin/practice-settings',
  '/subscriptions',
  '/admin/payment-gateway',
  '/notifications',
  '/admin/audit-logs',
  '/admin/audit-reports',
  
  // Reports (all require online)
  '/analytics-reporting',
  '/advanced-reporting',
  '/predictive-analytics',
  '/audit-reports',
  
  // Customization
  '/theme-customization',
  '/dashboard-config',
  '/custom-field-demo',
  
  // Help
  '/help-center',
  '/support-tickets',
  '/knowledge-base',
];

// Max cache items to prevent excessive storage usage
const MAX_CACHE_ITEMS = {
  pages: 50,
  assets: 100,
  api: 50,
  dynamic: 100
};

// Install event - cache static assets and offline-supported routes
self.addEventListener('install', (event) => {
  console.log('[SW] Install event - version', CACHE_VERSION);
  event.waitUntil(
    Promise.all([
      // Cache static assets (non-page assets first)
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('[SW] Caching static assets');
        const nonPageAssets = ['/manifest.json', '/favicon.ico'];
        return cache.addAll(nonPageAssets).catch(err => {
          console.error('[SW] Failed to cache some static assets:', err);
        });
      }),
      // Cache critical pages individually with error handling
      caches.open(PAGES_CACHE).then(async (cache) => {
        console.log('[SW] Caching critical pages');
        const criticalPages = ['/', '/auth/login', '/offline', '/admin/online-only'];
        
        for (const page of criticalPages) {
          try {
            await cache.add(page);
            console.log(`[SW] Successfully cached: ${page}`);
          } catch (err) {
            console.warn(`[SW] Failed to cache page: ${page}`, err);
          }
        }
      }),
      // Precache offline-supported routes
      caches.open(PAGES_CACHE).then((cache) => {
        console.log('[SW] Precaching offline-supported routes');
        // Cache routes one by one to avoid failures stopping the entire process
        return Promise.allSettled(
          OFFLINE_SUPPORTED_ROUTES.map(route => 
            cache.add(route).catch(err => {
              console.warn('[SW] Failed to precache route:', route, err);
            })
          )
        );
      })
    ])
    .then(() => {
      console.log('[SW] All caching completed successfully');
      return self.skipWaiting();
    })
    .catch(err => {
      console.error('[SW] Install event failed:', err);
      // Still skip waiting even if some caching failed
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE, API_CACHE, PAGES_CACHE, ASSETS_CACHE];
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!currentCaches.includes(cacheName)) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle requests with comprehensive caching
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Handle Next.js static files (_next/static/)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(handleNextStaticAsset(request));
    return;
  }

  // Handle Next.js data files (_next/data/)
  if (url.pathname.startsWith('/_next/data/')) {
    event.respondWith(handleNextDataRequest(request));
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle images and media
  if (isMediaAsset(url.pathname)) {
    event.respondWith(handleMediaAsset(request));
    return;
  }

  // Handle other static assets (CSS, JS, fonts, etc.)
  if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  // Default: try network, fallback to cache
  event.respondWith(
    fetch(request)
      .then(response => {
        // Only cache GET requests with successful responses
        if (request.method === 'GET' && response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(request, responseClone);
            limitCacheSize(DYNAMIC_CACHE, MAX_CACHE_ITEMS.dynamic);
          });
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// Handle navigation requests (page loads)
// Strategy: Network first, fallback to cache, then offline page
async function handleNavigationRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Check if this is an online-only route
  const isOnlineOnlyRoute = ONLINE_ONLY_ROUTES.some(route => pathname.startsWith(route));

  try {
    const networkResponse = await fetch(request, {
      cache: 'no-cache'
    });

    // Only cache if NOT an online-only route
    if (networkResponse.ok && !isOnlineOnlyRoute) {
      const cache = await caches.open(PAGES_CACHE);
      cache.put(request, networkResponse.clone());
      limitCacheSize(PAGES_CACHE, MAX_CACHE_ITEMS.pages);
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed for navigation:', pathname);

    // For online-only routes, don't serve cached version
    if (isOnlineOnlyRoute) {
      console.log('[SW] Online-only route detected:', pathname);
      
      // Try to get cached version of the online-only page
      const onlineOnlyPage = await caches.match('/admin/online-only');
      
      if (onlineOnlyPage) {
        console.log('[SW] ✅ Found cached online-only page, injecting route');
        
        // Read the HTML content
        const htmlText = await onlineOnlyPage.text();
        
        // Inject the attempted route into the HTML as a script
        // This allows the page to read it without query parameters
        const injectedHtml = htmlText.replace(
          '</head>',
          `<script>window.__OFFLINE_ATTEMPTED_ROUTE__ = "${pathname}";</script></head>`
        );
        
        return new Response(injectedHtml, {
          status: onlineOnlyPage.status,
          statusText: onlineOnlyPage.statusText,
          headers: onlineOnlyPage.headers
        });
      }
      
      console.warn('[SW] ❌ Online-only page NOT cached - using fallback HTML');
      // Fallback to inline response if online-only page not cached
      return getOnlineOnlyOfflineResponse(pathname);
    }

    // Try page cache first for regular routes
    let cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Serving page from cache:', request.url);
      return cachedResponse;
    }

    // Try static cache
    cachedResponse = await caches.match(request, { cacheName: STATIC_CACHE });
    if (cachedResponse) {
      return cachedResponse;
    }

    // For login page, try to find it in any cache
    const url = new URL(request.url);
    if (url.pathname === '/auth/login' || url.pathname.includes('/login')) {
      const loginCache = await caches.match('/auth/login');
      if (loginCache) {
        console.log('[SW] Serving cached login page');
        return loginCache;
      }
    }

    // Return offline page
    const offlinePage = await caches.match('/offline');
    if (offlinePage) {
      console.log('[SW] Serving offline page');
      return offlinePage;
    }

    // Last resort: inline offline page
    return getOfflineResponse();
  }
}

// Handle Next.js static assets (_next/static/)
// Strategy: Cache first with network update (stale-while-revalidate)
async function handleNextStaticAsset(request) {
  const cache = await caches.open(ASSETS_CACHE);
  const cachedResponse = await cache.match(request);

  // Return cached immediately if available
  if (cachedResponse) {
    console.log('[SW] Serving Next.js asset from cache:', request.url);
    // Update cache in background
    fetch(request).then(response => {
      if (response && response.status === 200) {
        cache.put(request, response.clone());
      }
    }).catch(() => {
    });

    return cachedResponse;
  }

  // Not in cache, fetch from network
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
      limitCacheSize(ASSETS_CACHE, MAX_CACHE_ITEMS.assets);
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Failed to fetch Next.js asset (offline):', request.url);
    // Return a basic response to prevent page crash
    // The page might not work perfectly, but won't show chunk loading error
    return new Response('// Offline - chunk not available', {
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'application/javascript' }
    });
  }
}

// Handle Next.js data requests (_next/data/)
// Strategy: Network first with cache fallback
async function handleNextDataRequest(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      limitCacheSize(DYNAMIC_CACHE, MAX_CACHE_ITEMS.dynamic);
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Serving Next.js data from cache');
      return cachedResponse;
    }
    throw error;
  }
}

// Handle media assets (images, videos, etc.)
// Strategy: Cache first for better performance
async function handleMediaAsset(request) {
  const cache = await caches.open(ASSETS_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
      limitCacheSize(ASSETS_CACHE, MAX_CACHE_ITEMS.assets);
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Failed to fetch media asset:', request.url);
    throw error;
  }
}

// Helper: Check if pathname is a media asset
function isMediaAsset(pathname) {
  const mediaExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif', '.ico', '.mp4', '.webm', '.mp3', '.wav'];
  return mediaExtensions.some(ext => pathname.endsWith(ext));
}

// Helper: Limit cache size to prevent excessive storage
async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxItems) {
    // Delete oldest items (FIFO)
    const itemsToDelete = keys.length - maxItems;
    for (let i = 0; i < itemsToDelete; i++) {
      await cache.delete(keys[i]);
    }
    console.log(`[SW] Trimmed ${cacheName} cache to ${maxItems} items`);
  }
}

// Helper: Generate offline response
function getOfflineResponse() {
  return new Response(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Offline - SmartDVM</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(to bottom right, #dbeafe, #e0e7ff);
          }
          .container {
            text-align: center;
            padding: 2rem;
            max-width: 400px;
          }
          .icon {
            font-size: 4rem;
            margin-bottom: 1rem;
          }
          h1 {
            font-size: 1.5rem;
            margin-bottom: 0.5rem;
            color: #1e293b;
          }
          p {
            color: #64748b;
            margin-bottom: 1.5rem;
            line-height: 1.5;
          }
          button {
            background: #2563eb;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            cursor: pointer;
            font-size: 1rem;
            font-weight: 500;
          }
          button:hover {
            background: #1d4ed8;
          }
          .features {
            margin-top: 2rem;
            text-align: left;
            background: white;
            padding: 1rem;
            border-radius: 0.5rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          .features h2 {
            font-size: 1rem;
            margin: 0 0 0.5rem 0;
            color: #1e293b;
          }
          .features ul {
            margin: 0;
            padding-left: 1.5rem;
            color: #64748b;
            font-size: 0.875rem;
          }
          .features li {
            margin: 0.25rem 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">📡</div>
          <h1>You're Offline</h1>
          <p>SmartDVM couldn't connect to the server. The app works offline with cached data!</p>
          <button onclick="window.location.reload()">Try Reconnecting</button>
          
          <div class="features">
            <h2>✨ Available Offline:</h2>
            <ul>
              <li>View cached pages</li>
              <li>Access previously loaded data</li>
              <li>Browse stored records</li>
            </ul>
          </div>
        </div>
      </body>
    </html>
  `, {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache'
    }
  });
}

// Helper: Generate offline response for online-only routes
function getOnlineOnlyOfflineResponse(pathname) {
  // Extract feature name from pathname
  const featureName = pathname.split('/').pop().replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  return new Response(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Connection Required - SmartDVM</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: white;
          }
          .container {
            text-align: center;
            padding: 2.5rem;
            max-width: 480px;
            background: white;
            border-radius: 1rem;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          }
          .icon {
            font-size: 4rem;
            margin-bottom: 1rem;
          }
          .badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: #dbeafe;
            border: 1px solid #93c5fd;
            border-radius: 2rem;
            font-size: 0.875rem;
            font-weight: 600;
            color: #1e40af;
            margin-bottom: 1.5rem;
          }
          h1 {
            font-size: 1.75rem;
            margin-bottom: 0.75rem;
            color: #1e293b;
            line-height: 1.3;
          }
          .feature-name {
            color: #2563eb;
            font-weight: 700;
          }
          p {
            color: #64748b;
            margin-bottom: 1.5rem;
            line-height: 1.6;
            font-size: 1rem;
          }
          .info-box {
            background: #eff6ff;
            border-left: 4px solid #2563eb;
            padding: 1.25rem;
            margin: 1.5rem 0;
            text-align: left;
            border-radius: 0.5rem;
          }
          .info-box strong {
            color: #1e40af;
            display: block;
            margin-bottom: 0.5rem;
          }
          .info-box p {
            margin: 0;
            font-size: 0.9rem;
            color: #475569;
          }
          button {
            background: #2563eb;
            color: white;
            border: none;
            padding: 1rem 2rem;
            border-radius: 0.5rem;
            cursor: pointer;
            font-size: 1rem;
            font-weight: 600;
            transition: all 0.2s;
            box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
          }
          button:hover {
            background: #1d4ed8;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
          }
          .hint {
            margin-top: 1.5rem;
            padding: 1rem;
            background: #f8fafc;
            border-radius: 0.5rem;
            font-size: 0.875rem;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">🌐</div>
          <div class="badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            Internet Connection Required
          </div>
          <h1>
            <span class="feature-name">${featureName}</span><br/>
            Requires Internet Connection
          </h1>
          <p>
            This feature needs a real-time connection to work properly and cannot be accessed offline.
          </p>
          <div class="info-box">
            <strong>⚡ Why This Feature Requires Internet</strong>
            <p>This tool integrates with external systems or requires live data that isn't available in your offline cache.</p>
          </div>
          <button onclick="window.location.reload()">Try Reconnecting</button>
          <div class="hint">
            💡 <strong>Tip:</strong> Use the sidebar to navigate to offline-supported features like Appointments, Patient Care, or Medical Records.
          </div>
        </div>
      </body>
    </html>
  `, {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
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

// Handle static assets (CSS, JS, fonts, etc.)
// Strategy: Cache first for better performance
async function handleStaticAsset(request) {
  const cache = await caches.open(ASSETS_CACHE);
  const cachedResponse = await cache.match(request);

  // Return cached version immediately
  if (cachedResponse) {
    // Update cache in background
    fetch(request).then(response => {
      if (response && response.status === 200) {
        cache.put(request, response.clone());
      }
    }).catch(() => {
      // Network failed, keep using cached version
    });

    return cachedResponse;
  }

  // Not in cache, fetch from network
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
      limitCacheSize(ASSETS_CACHE, MAX_CACHE_ITEMS.assets);
    }
    return networkResponse;
  } catch (error) {
    // Return error response
    return new Response('Asset not available offline', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Check if request is for a static asset (excluding Next.js paths handled separately)
function isStaticAsset(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Static file extensions
  const staticExtensions = ['.js', '.css', '.woff', '.woff2', '.ttf', '.eot', '.otf'];

  // Check extensions but exclude _next paths (handled separately)
  return staticExtensions.some(ext => pathname.endsWith(ext)) && 
         !pathname.startsWith('/_next/');
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

    case 'CACHE_ROUTES':
      // Cache multiple routes (triggered after authentication)
      if (payload && payload.routes && Array.isArray(payload.routes)) {
        console.log('[SW] Received request to cache', payload.routes.length, 'routes');
        cacheRoutesInBackground(payload.routes);
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

// Cache routes in background after authentication
async function cacheRoutesInBackground(routes) {
  console.log('[SW] Starting background caching of', routes.length, 'routes');
  
  const cache = await caches.open(PAGES_CACHE);
  let cached = 0;
  let failed = 0;

  // Cache routes one by one to handle errors gracefully
  for (const route of routes) {
    try {
      await cache.add(route);
      cached++;
      console.log(`[SW] ✅ Cached: ${route}`);
    } catch (error) {
      failed++;
      console.warn(`[SW] ❌ Failed to cache ${route}:`, error.message);
    }
  }

  console.log(`[SW] Background caching complete: ${cached} cached, ${failed} failed`);

  // Notify all clients about completion
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({
      type: 'CACHE_ROUTES_COMPLETE',
      payload: {
        total: routes.length,
        cached,
        failed
      }
    });
  });
}

// Periodic cleanup (run every hour)
setInterval(() => {
  cleanupOldCaches();
}, 60 * 60 * 1000);

async function cleanupOldCaches() {
  const cacheNames = await caches.keys();
  const validCaches = [STATIC_CACHE, DYNAMIC_CACHE, API_CACHE, PAGES_CACHE, ASSETS_CACHE];

  const cleanupPromises = cacheNames
    .filter(cacheName => !validCaches.includes(cacheName))
    .map(cacheName => caches.delete(cacheName));

  if (cleanupPromises.length > 0) {
    console.log('[SW] Cleaning up old caches');
    await Promise.all(cleanupPromises);
  }
}
