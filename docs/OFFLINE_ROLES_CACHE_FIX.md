# Offline Roles API Cache Fix

## Problem

When offline, the `/api/roles` endpoint attempts to connect to the database, causing errors:

```
Error: getaddrinfo ENOTFOUND smartdvm.cnug2qlw9kof.eu-north-1.rds.amazonaws.com
Error: No tenant context set. Call setCurrentTenant() first or pass tenantId parameter.
Error: Failed to resolve tenant: Internal Server Error
```

This occurred in all permission management components that fetch roles data.

## Solution

Added localStorage caching with offline fallback to all components that fetch roles, following the same pattern used for marketplace and practices data.

### Cache Strategy

#### Online Mode

1. Fetch from `/api/roles?practiceId=${practiceId}`
2. Cache response to `localStorage` with metadata:
   ```typescript
   {
     data: [...roles],
     timestamp: Date.now(),
     cachedAt: new Date().toISOString()
   }
   ```
3. Return fresh data

#### Offline Mode

1. Try to fetch (will fail with network error)
2. Fallback to localStorage cache
3. Parse and return cached data
4. Return empty array if no cache exists

### Cache Key Format

- **Key**: `roles_cache_${practiceId}`
- **Reason**: Practice-specific to support multi-practice scenarios

### Implementation Pattern

```typescript
const { data: roles = [] } = useQuery<any[]>({
  queryKey: ["/api/roles", { practiceId }],
  queryFn: async () => {
    try {
      const response = await fetch(`/api/roles?practiceId=${practiceId}`);
      if (!response.ok) {
        // API failure → use cache
        const cached = localStorage.getItem(`roles_cache_${practiceId}`);
        if (cached) {
          const cacheData = JSON.parse(cached);
          return Array.isArray(cacheData) ? cacheData : cacheData.data;
        }
        throw new Error("Failed to fetch roles");
      }
      const data = await response.json();

      // Always cache on success
      if (data && typeof window !== "undefined") {
        const cacheData = {
          data: data,
          timestamp: Date.now(),
          cachedAt: new Date().toISOString(),
        };
        localStorage.setItem(
          `roles_cache_${practiceId}`,
          JSON.stringify(cacheData)
        );
        console.log("[Component] ✅ Updated roles cache with fresh data");
      }
      return data;
    } catch (error) {
      // Network error → use cache
      const cached = localStorage.getItem(`roles_cache_${practiceId}`);
      if (cached) {
        const cacheData = JSON.parse(cached);
        return Array.isArray(cacheData) ? cacheData : cacheData.data;
      }
      return [];
    }
  },
  enabled: true,
  retry: false, // Don't retry failed requests
});
```

## Files Modified

### 1. `/src/components/permissions/roles-tab.tsx`

- **Line**: ~106-112 (queryFn)
- **Change**: Added try/catch with localStorage caching
- **Impact**: Roles management page works offline

### 2. `/src/components/permissions/permission-categories-tab.tsx`

- **Line**: ~159-165 (queryFn)
- **Change**: Added try/catch with localStorage caching
- **Impact**: Permission categories page works offline

### 3. `/src/components/permissions/user-assignments-tab.tsx`

- **Line**: ~109-115 (queryFn)
- **Change**: Added try/catch with localStorage caching
- **Impact**: User role assignments page works offline

## Benefits

1. **No Database Errors Offline**: API failures are caught and handled gracefully
2. **Seamless Experience**: Users can view roles data offline
3. **Automatic Updates**: Cache refreshes every time user goes online
4. **Practice Isolation**: Each practice has its own cache (multi-tenant safe)
5. **Backward Compatible**: Handles both old (array) and new (metadata object) cache formats
6. **Graceful Degradation**: Returns empty array if no cache exists

## Cache Lifecycle

```
Online Login → API Call → Cache Saved
                          ↓
Go Offline → Page Load → Cache Used
                          ↓
Go Online → API Call → Cache Updated
                          ↓
                    Fresh Data Available
```

## Testing

1. **Online (Build Cache)**:

   - Login and navigate to Settings → Roles & Permissions
   - Check localStorage: `roles_cache_1` should exist
   - Console: "✅ Updated roles cache with fresh data"

2. **Go Offline**:

   - DevTools → Network → Offline
   - Refresh page

3. **Verify Offline**:

   - ✅ No database connection errors
   - ✅ Roles tab shows cached roles
   - ✅ Permission categories show cached data
   - ✅ User assignments show cached roles
   - ✅ Console: "Network error, using cached roles"

4. **Go Online**:
   - Network → Online
   - Navigate to roles page
   - Console: "✅ Updated roles cache with fresh data"
   - Verify timestamp updated in localStorage

## Related Caches

This follows the same pattern as:

- `marketplace_practice_cache` - Practice subscriptions/add-ons
- `practices_cache` - Available practices list
- `offline_session` - User session data

All use the same error handling and caching strategy for consistent offline behavior.

## Future Enhancements

1. **Cache Expiration**: Add TTL checking using timestamp
2. **Cache Versioning**: Add version field for schema changes
3. **Background Sync**: Auto-refresh cache when connection returns
4. **Cache Size Management**: Monitor and limit localStorage usage
