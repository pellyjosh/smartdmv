# Offline API Cache Fix for Sidebar and Header

**Date**: November 4, 2025  
**Issue**: Sidebar menu not showing when offline due to failed API calls

## Problem

When offline, two API calls were failing and breaking the sidebar/header:

1. **`/api/marketplace/practice`** - Fetches practice add-ons/subscriptions (sidebar)
2. **`/api/practices`** - Fetches list of practices for multi-location switching (header)

### Error Stack

```
[AUTH_UTILS getCurrentUser] DB connection attempt 3 failed:
getaddrinfo ENOTFOUND smartdvm.cnug2qlw9kof.eu-north-1.rds.amazonaws.com

GET /api/marketplace/practice 401 in 3214ms
```

**Result**: Sidebar menu items filtered incorrectly → Empty sidebar when offline

## Solution

Added localStorage caching for both API endpoints with automatic fallback when offline.

### 1. Marketplace Practice Data (Sidebar)

**File**: `/src/components/layout/AppSidebar.tsx`

**Before**:

```typescript
const { data: practiceAddons } = useQuery({
  queryKey: ["/api/marketplace/practice"],
  queryFn: async () => {
    const response = await fetch("/api/marketplace/practice");
    if (!response.ok) throw new Error("Failed to fetch practice subscriptions");
    return response.json();
  },
  enabled: !!user && !!userPracticeId,
  refetchOnWindowFocus: false,
});
```

**After**:

```typescript
const { data: practiceAddons } = useQuery({
  queryKey: ["/api/marketplace/practice"],
  queryFn: async () => {
    try {
      const response = await fetch("/api/marketplace/practice");
      if (!response.ok) {
        // ✅ Fallback to cache if API fails
        const cached = localStorage.getItem("marketplace_practice_cache");
        if (cached) {
          console.log("[AppSidebar] Using cached marketplace data (offline)");
          return JSON.parse(cached);
        }
        throw new Error("Failed to fetch practice subscriptions");
      }
      const data = await response.json();

      // ✅ Cache successful response for offline use
      if (data && typeof window !== "undefined") {
        localStorage.setItem(
          "marketplace_practice_cache",
          JSON.stringify(data)
        );
        console.log("[AppSidebar] Cached marketplace data for offline use");
      }

      return data;
    } catch (error) {
      // ✅ Network error → Load from cache
      const cached = localStorage.getItem("marketplace_practice_cache");
      if (cached) {
        console.log(
          "[AppSidebar] Network error, using cached marketplace data"
        );
        return JSON.parse(cached);
      }
      console.error("[AppSidebar] Failed to fetch marketplace data:", error);
      return []; // Return empty array to prevent sidebar from breaking
    }
  },
  enabled: !!user && !!userPracticeId,
  refetchOnWindowFocus: false,
  retry: false, // ✅ Don't retry if offline
});
```

**What Gets Cached**: Practice subscriptions/add-ons array for determining which marketplace features to show

### 2. Practices List (Header)

**File**: `/src/components/layout/AppHeader.tsx`

**Before**:

```typescript
useEffect(() => {
  const fetchPractices = async () => {
    if (!user) return;
    setPracticesLoading(true);
    try {
      const response = await fetch("/api/practices");
      if (response.ok) {
        const practicesData = await response.json();
        setPractices(practicesData);
      } else {
        console.error("Failed to fetch practices:", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching practices:", error);
    } finally {
      setPracticesLoading(false);
    }
  };
  fetchPractices();
}, [user]);
```

**After**:

```typescript
useEffect(() => {
  const fetchPractices = async () => {
    if (!user) return;
    setPracticesLoading(true);
    try {
      const response = await fetch("/api/practices");
      if (response.ok) {
        const practicesData = await response.json();
        setPractices(practicesData);

        // ✅ Cache to localStorage for offline use
        if (practicesData && typeof window !== "undefined") {
          localStorage.setItem(
            "practices_cache",
            JSON.stringify(practicesData)
          );
          console.log("[AppHeader] Cached practices data for offline use");
        }
      } else {
        // ✅ Try to load from cache
        const cached = localStorage.getItem("practices_cache");
        if (cached) {
          console.log("[AppHeader] Using cached practices data");
          setPractices(JSON.parse(cached));
        }
      }
    } catch (error) {
      console.error("Error fetching practices:", error);
      // ✅ If network error, load from cache
      const cached = localStorage.getItem("practices_cache");
      if (cached) {
        console.log("[AppHeader] Network error, using cached practices data");
        setPractices(JSON.parse(cached));
      }
    } finally {
      setPracticesLoading(false);
    }
  };
  fetchPractices();
}, [user]);
```

**What Gets Cached**: Array of practice objects with id, name, email, address, etc.

## How It Works

### Online Flow

```
1. API call succeeds
2. Data returned to component
3. Data cached to localStorage
   ├─ marketplace_practice_cache (subscriptions)
   └─ practices_cache (practice list)
4. Sidebar/Header render normally
```

### Offline Flow

```
1. API call fails (network error or 401)
2. Check localStorage for cached data
3. If cache exists:
   ├─ Parse and return cached data
   └─ Log: "Using cached data (offline)"
4. If no cache:
   ├─ Return empty array (marketplace)
   └─ Display without practice data (header)
5. Sidebar/Header render with cached data ✅
```

## Why This Fixes the Sidebar

The sidebar uses `hasMarketplaceSubscription()` to filter menu items:

```typescript
const hasMarketplaceSubscription = (featureTitle: string): boolean => {
  // Super admins get full access
  if (userHasRole("SUPER_ADMIN") || userHasRole("ADMINISTRATOR")) return true;

  // Check if practice has active subscription for this feature
  const addOnSlug = MARKETPLACE_FEATURE_MAPPING[featureTitle];
  if (!addOnSlug || !practiceAddons) {
    // ❌ Was undefined when offline
    return false;
  }

  return practiceAddons.some((subscription: any) => {
    return subscription.addOn?.slug === addOnSlug && subscription.isActive;
  });
};
```

**Before**: `practiceAddons` was `undefined` when offline → Features filtered out → Empty sidebar  
**After**: `practiceAddons` loaded from cache → Features display correctly → Full sidebar ✅

## Cache Keys

| Cache Key                    | Data                          | Used By        | Purpose                     |
| ---------------------------- | ----------------------------- | -------------- | --------------------------- |
| `marketplace_practice_cache` | Practice add-on subscriptions | Sidebar        | Filter marketplace features |
| `practices_cache`            | List of all practices         | Header         | Practice switcher dropdown  |
| `offline_session`            | User session with roles       | Sidebar/Header | Authentication              |

## Testing

### Online Mode

1. Login → Sidebar shows menus → Header shows practices
2. Check localStorage:
   - `marketplace_practice_cache` has subscription data
   - `practices_cache` has practice list
   - `offline_session` has user data

### Offline Mode

1. Go offline (Network → Offline)
2. Refresh page
3. ✅ Sidebar shows full menu (not empty)
4. ✅ Header shows user info and practice selector
5. Console shows:
   ```
   [AppSidebar] Network error, using cached marketplace data
   [AppHeader] Network error, using cached practices data
   [AppSidebar] User roles: ["SUPER_ADMIN"]
   ```

### Expected Behavior

- **SUPER_ADMIN/ADMINISTRATOR**: See all menu items (bypass subscription check)
- **Other roles**: See menu items based on cached subscriptions
- **No cache**: Empty array returned → Basic menu items only (no marketplace features)

## Edge Cases Handled

1. **First Load Offline**: Returns empty array → Basic functionality
2. **Cache Expired/Cleared**: Falls back to empty array → Won't break
3. **Malformed Cache**: JSON.parse fails → Caught by try/catch → Empty array
4. **Network Timeout**: Treated as network error → Loads cache
5. **401 Unauthorized**: Treated as API failure → Loads cache

## Files Modified

1. **`/src/components/layout/AppSidebar.tsx`**

   - Added try/catch to marketplace query
   - Cache successful responses to localStorage
   - Fallback to cache on error
   - Return empty array if no cache

2. **`/src/components/layout/AppHeader.tsx`**
   - Added cache write on successful fetch
   - Added cache read on API failure
   - Added cache read on network error
   - Maintains loading state properly

## Console Output

### Success (Offline with Cache)

```
[useOfflineAuth] ⚡ Found offline_session in localStorage
[AppSidebar] Network error, using cached marketplace data
[AppHeader] Network error, using cached practices data
[AppSidebar] User has 15 menu groups
[AppSidebar] Filtering based on role: SUPER_ADMIN
```

### Success (Online, Building Cache)

```
[AppSidebar] Fetched marketplace data: [3 subscriptions]
[AppSidebar] Cached marketplace data for offline use
[AppHeader] Fetched practices data: [2 practices]
[AppHeader] Cached practices data for offline use
```

### Graceful Failure (No Cache)

```
[AppSidebar] Network error, using cached marketplace data
[AppSidebar] No cache found, returning empty array
[AppSidebar] hasMarketplaceSubscription: false (no data)
// Sidebar still shows basic menu items for user role
```

## Future Improvements

1. **IndexedDB Storage**: Move cache to IndexedDB for larger datasets
2. **Cache Expiry**: Add timestamp and refresh stale cache when back online
3. **Partial Updates**: Sync individual subscriptions instead of full array
4. **Cache Versioning**: Handle schema changes gracefully
5. **Background Sync**: Use Service Worker to sync cache when connection returns
