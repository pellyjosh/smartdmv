# Offline Caching Strategy - SmartDVM PWA

## Overview

SmartDVM now implements comprehensive offline caching that makes the **entire app available offline** after the user has visited pages while online.

## Implementation Summary

### Service Worker Location

- **File**: `public/sw.js`
- **Registration**: Initialized in root layout via `PWAInitializer` component
- **Scope**: All pages including login (`/auth/login`)

### Cache Strategy by Resource Type

#### 1. Navigation (HTML Pages)

- **Strategy**: Network-first → Cache fallback → Offline page
- **Cache**: `PAGES_CACHE`
- **Max Items**: 50 pages
- **Behavior**:
  - Always tries network first for fresh content
  - Falls back to cached version if offline
  - Shows custom offline page if no cache exists

#### 2. Next.js Static Assets (`/_next/static/`)

- **Strategy**: Cache-first with background update (stale-while-revalidate)
- **Cache**: `ASSETS_CACHE`
- **Max Items**: 100 assets
- **Behavior**:
  - Serves cached version immediately for speed
  - Updates cache in background when online
  - All JavaScript chunks and CSS are cached automatically

#### 3. Next.js Data Files (`/_next/data/`)

- **Strategy**: Network-first with cache fallback
- **Cache**: `DYNAMIC_CACHE`
- **Max Items**: 100 items
- **Behavior**:
  - Fetches fresh data when online
  - Serves stale data when offline

#### 4. API Requests (`/api/*`)

- **Strategy**:
  - GET: Network-first with cache backup
  - POST/PUT/PATCH/DELETE: Network-only, queued for sync when offline
- **Cache**: `API_CACHE`
- **Max Items**: 50 endpoints
- **Behavior**:
  - Critical endpoints like `/api/auth/me`, `/api/roles` are cached
  - Failed mutations are queued for background sync

#### 5. Media Assets (Images, Videos)

- **Strategy**: Cache-first
- **Cache**: `ASSETS_CACHE`
- **Behavior**:
  - Images and media are cached on first view
  - Instant loading on subsequent visits

#### 6. Static Assets (CSS, JS, Fonts)

- **Strategy**: Cache-first with background update
- **Cache**: `ASSETS_CACHE`
- **Behavior**:
  - Fonts, stylesheets, and scripts cached aggressively
  - Background updates ensure fresh content

## Cache Management

### Cache Names

```javascript
STATIC_CACHE = "smartdmv-static-v1.0.1"; // Pre-cached critical assets
PAGES_CACHE = "smartdmv-pages-v1.0.1"; // HTML pages (max 50)
ASSETS_CACHE = "smartdmv-assets-v1.0.1"; // JS, CSS, fonts, images (max 100)
DYNAMIC_CACHE = "smartdmv-dynamic-v1.0.1"; // Next.js data (max 100)
API_CACHE = "smartdmv-api-v1.0.1"; // API responses (max 50)
```

### Cache Limits

To prevent excessive storage usage, each cache has a maximum size:

- **Pages**: 50 pages (oldest deleted first)
- **Assets**: 100 items
- **API**: 50 endpoints
- **Dynamic**: 100 items

### Cache Cleanup

- Old cache versions are automatically deleted on service worker activation
- Periodic cleanup runs every hour to remove stale entries
- FIFO (First In, First Out) deletion when cache limits are reached

## What Gets Cached

### On First Visit (Pre-cached)

- `/` - Home page
- `/auth/login` - Login page
- `/offline` - Offline fallback page
- `/manifest.json` - PWA manifest
- `/favicon.ico` - Site icon

### On Subsequent Visits (Runtime Caching)

✅ **Every page you visit** - Full HTML with layout  
✅ **All Next.js chunks** - JavaScript bundles and code splits  
✅ **All stylesheets** - CSS files including Tailwind  
✅ **All fonts** - Web fonts (WOFF, WOFF2, etc.)  
✅ **All images** - Photos, icons, illustrations  
✅ **API responses** - GET requests to frequently used endpoints  
✅ **Next.js data** - Server-side props and data fetching results

## Offline Experience

### First-Time Offline Users

If a user goes offline without having visited the site:

- Shows inline HTML offline page with retry button
- Explains that the app works offline with cached data
- Provides reconnection instructions

### Returning Offline Users

If a user has visited pages before going offline:

- All visited pages load instantly from cache
- Previously loaded data remains accessible
- Assets like images and fonts display correctly
- Smooth navigation between cached pages

## Testing Offline Mode

### Chrome DevTools Method

1. Open DevTools (F12)
2. Go to **Application** → **Service Workers**
3. Verify service worker is registered and active
4. Go to **Network** tab
5. Check **"Offline"** in the throttling dropdown
6. Navigate through the app - all visited pages should work

### Browser Offline Mode

1. Visit several pages in your app while online
2. Disconnect from the internet (turn off WiFi)
3. Refresh the page or navigate to previously visited routes
4. All cached pages should load successfully

### Clear Cache Test

To test first-time offline experience:

1. DevTools → Application → Clear Storage
2. Click "Clear site data"
3. Turn on offline mode
4. Visit the site - should see fallback offline page

## Developer Notes

### Cache Versioning

When you update the service worker:

- Increment `CACHE_VERSION` in `public/sw.js`
- Old caches are automatically cleaned up
- Users get fresh content on next visit

### Adding New Pre-cached Assets

Edit the `STATIC_ASSETS` array in `public/sw.js`:

```javascript
const STATIC_ASSETS = [
  "/",
  "/auth/login",
  "/offline",
  "/your-critical-page", // Add here
];
```

### Debugging

Service worker logs all cache operations:

```javascript
console.log("[SW] Serving from cache:", request.url);
console.log("[SW] Trimmed cache to N items");
```

Enable verbose logging in DevTools → Console to see all cache hits/misses.

## Performance Benefits

✅ **Instant page loads** - Pages load from cache in milliseconds  
✅ **Reduced bandwidth** - Assets downloaded once, cached forever  
✅ **Offline functionality** - Full app works without internet  
✅ **Resilient to network issues** - Graceful degradation  
✅ **Better UX** - No blank screens or error pages

## Browser Support

Service workers are supported in:

- ✅ Chrome/Edge 40+
- ✅ Firefox 44+
- ✅ Safari 11.1+
- ✅ Opera 27+
- ❌ Internet Explorer (not supported)

The app gracefully degrades in unsupported browsers - functionality works but without offline caching.

## Security Notes

- Service workers only work on HTTPS or localhost
- Cache is origin-specific (isolated per domain)
- Service worker script itself is always fetched fresh (max-age: 86400)
- Cache storage is subject to browser storage limits

## Future Enhancements

Potential improvements:

- [ ] Implement background sync for failed POST/PUT/DELETE requests
- [ ] Add cache warming for predictive loading
- [ ] Implement cache expiration based on timestamps
- [ ] Add selective cache clearing per feature
- [ ] Implement push notifications for data updates
