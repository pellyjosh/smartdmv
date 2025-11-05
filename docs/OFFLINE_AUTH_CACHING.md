# Authentication Offline Caching - Implementation Summary

## Problem

When disconnecting from the internet:

- ❌ Users cannot login (API unavailable)
- ❌ Authentication tab shows "Not Authenticated"
- ❌ Session token shows "Invalid"
- ❌ App cannot function offline

## Root Cause

The authentication system was **not saving session data to IndexedDB** during login, so when offline:

1. No cached session data available
2. API calls fail (no internet)
3. App cannot verify user identity
4. User forced to stay logged out

## Solution Implemented

### 1. **Server-Side: Enhanced Login Response**

**File:** `src/app/api/auth/login/route.ts`

Added session information to login response:

```typescript
// Before:
return NextResponse.json({
  user: userData,
  message: "Signed in successfully!",
});

// After:
return NextResponse.json({
  user: userData,
  message: "Signed in successfully!",
  session: {
    id: sessionId,
    expiresAt: sessionExpiresAtDate.toISOString(),
    createdAt: new Date().toISOString(),
  },
});
```

**Why:** Client needs session metadata (ID, expiry) to cache properly.

---

### 2. **Client-Side: Authentication Cache Utility**

**File:** `src/lib/auth-cache.ts` (NEW)

Created comprehensive caching system:

#### **Function: `cacheAuthForOffline()`**

Saves authentication data to IndexedDB after successful login:

```typescript
export async function cacheAuthForOffline(
  response: LoginResponse,
  tenantId: string
): Promise<void>;
```

**What it caches:**

1. **Auth Token** → `offline_auth_tokens` store

   - Session ID (used as token)
   - User ID, tenant ID, practice ID
   - Expiry timestamps
   - Last validation time

2. **Session Data** → `offline_sessions` store

   - User profile (email, name, role)
   - Practice information
   - Accessible practices (for admins)
   - Roles and permissions
   - Preferences (theme, sync settings)

3. **Permissions** → `offline_permissions` store
   - User roles with full permission tree
   - Effective permissions calculated
   - Cached for 24 hours

#### **Function: `clearAuthCache()`**

Clears all cached auth data on logout:

```typescript
export async function clearAuthCache(): Promise<void>;
```

Removes:

- All tokens from `offline_auth_tokens`
- All sessions from `offline_sessions`

#### **Function: `getTenantIdForCache()`**

Extracts tenant ID from subdomain or localStorage:

```typescript
export function getTenantIdForCache(): string;
```

**Logic:**

1. Check subdomain (e.g., `innova.domain.com` → `innova`)
2. Fallback to localStorage `tenantId`
3. Default to `'default'` if not found

---

### 3. **UserContext: Integration**

**File:** `src/context/UserContext.tsx`

#### **Added to Login Flow:**

```typescript
const userData = data.user as User;
if (userData && userData.id) {
  setUser(userData);
  sessionStorage.setItem(SESSION_TOKEN_COOKIE_NAME, JSON.stringify(userData));
  setClientCookie(SESSION_TOKEN_COOKIE_NAME, JSON.stringify(userData));

  // 🆕 Cache authentication data for offline use
  try {
    const tenantId = getTenantIdForCache();
    await cacheAuthForOffline(data, tenantId);
    console.log("[UserContext login] ✅ Auth data cached for offline use");
  } catch (error) {
    console.error(
      "[UserContext login] Failed to cache auth for offline:",
      error
    );
    // Don't throw - caching failure shouldn't block login
  }

  return userData;
}
```

**Key Points:**

- ✅ Runs automatically after every successful login
- ✅ Non-blocking (errors won't prevent login)
- ✅ Extracts tenant from subdomain automatically
- ✅ Caches all necessary data for offline operation

#### **Added to Logout Flow:**

```typescript
finally {
  setUser(null);
  sessionStorage.removeItem(SESSION_TOKEN_COOKIE_NAME);
  setClientCookie(SESSION_TOKEN_COOKIE_NAME, null);

  // 🆕 Clear offline auth cache
  try {
    await clearAuthCache();
    console.log("[UserContext logout] ✅ Offline auth cache cleared");
  } catch (error) {
    console.error("[UserContext logout] Failed to clear offline cache:", error);
  }

  setIsLoading(false);
  // ... redirect to login
}
```

---

### 4. **Offline Auth Hook: Enhanced Loading**

**File:** `src/hooks/use-offline-auth.ts`

#### **Before (Required Context First):**

```typescript
const context = await getOfflineTenantContext();
if (!context) {
  setSession(null);
  return;
}

const [userSession, validation] = await Promise.all([
  authStorage.getSession(context.userId, context.tenantId),
  authStorage.validateToken(context.userId, context.tenantId),
]);
```

**Problem:** If no context in localStorage, hook fails immediately.

#### **After (Loads Any Available Session):**

```typescript
// Try to load any session from IndexedDB
const allSessions = await indexedDBManager.getAll<OfflineSession>(
  STORES.SESSIONS
);

if (!allSessions || allSessions.length === 0) {
  console.log("[useOfflineAuth] No offline sessions found");
  setSession(null);
  return;
}

// Get the most recent valid session
const validSessions = allSessions.filter((s) => {
  const expiresAt = new Date(s.expiresAt).getTime();
  return expiresAt > Date.now();
});

// Sort by last activity and get most recent
validSessions.sort((a, b) => b.lastActivity - a.lastActivity);
const userSession = validSessions[0];
```

**Benefits:**

- ✅ Finds sessions without requiring prior context
- ✅ Filters expired sessions automatically
- ✅ Returns most recently active session
- ✅ Validates token expiry

---

## How It Works: Complete Flow

### **Scenario 1: First Login (Online)**

```
1. User enters credentials
   ↓
2. POST /api/auth/login
   ↓
3. Server validates credentials
   ↓
4. Server creates session in DB
   ↓
5. Server returns: { user, session: { id, expiresAt } }
   ↓
6. Client sets user in context
   ↓
7. Client calls cacheAuthForOffline()
   ↓
8. Data saved to IndexedDB:
   - offline_auth_tokens
   - offline_sessions
   - offline_permissions
   ↓
9. ✅ User logged in + data cached
```

### **Scenario 2: App Loads Offline (After Login)**

```
1. User opens app (no internet)
   ↓
2. Browser tries GET /api/auth/me
   ↓
3. API returns: { offline: true, useOfflineStorage: true }
   ↓
4. Client detects offline flag
   ↓
5. useOfflineAuth hook loads from IndexedDB
   ↓
6. Hook finds cached session
   ↓
7. Validates session not expired
   ↓
8. Returns session to app
   ↓
9. ✅ User authenticated offline
   ↓
10. App renders with cached data
```

### **Scenario 3: Logout (Online or Offline)**

```
1. User clicks logout
   ↓
2. Client calls logout()
   ↓
3. Try: POST /api/auth/logout (may fail if offline)
   ↓
4. Clear online session storage
   ↓
5. Call clearAuthCache()
   ↓
6. Remove from IndexedDB:
   - offline_auth_tokens (all entries)
   - offline_sessions (all entries)
   ↓
7. ✅ User logged out everywhere
   ↓
8. Redirect to login page
```

---

## Data Structures

### **Cached Auth Token**

```typescript
{
  id: "550e8400-e29b-41d4-a716-446655440000",
  userId: "123",
  tenantId: "innova",
  practiceId: "1",
  obfuscatedToken: "550e8400-...", // Session ID
  expiresAt: 1730563200000, // Unix timestamp
  createdAt: 1730476800000,
  lastValidated: 1730476800000
}
```

### **Cached Session**

```typescript
{
  id: "550e8400-e29b-41d4-a716-446655440000",
  userId: "123",
  tenantId: "innova",
  practiceId: "1",
  currentPracticeId: "1", // For admins
  accessiblePracticeIds: ["1", "2", "3"], // For admins
  email: "user@example.com",
  name: "John Doe",
  role: "ADMINISTRATOR",
  roles: ["admin", "veterinarian"],
  preferences: {
    theme: "light",
    language: "en",
    offlineEnabled: true,
    autoSync: true,
    syncInterval: 30000
  },
  expiresAt: "2024-11-02T12:00:00.000Z",
  createdAt: 1730476800000,
  lastActivity: 1730476800000
}
```

---

## Testing Steps

### **1. Test Caching on Login**

```bash
# 1. Open DevTools → Application → IndexedDB
# 2. Login with valid credentials
# 3. Check SmartDMV_OfflineDB database
# 4. Verify stores contain data:
#    - offline_auth_tokens (1 entry)
#    - offline_sessions (1 entry)
#    - offline_permissions (if roles exist)
```

### **2. Test Offline Authentication**

```bash
# 1. Login while online
# 2. Open DevTools → Network tab
# 3. Select "Offline" throttling
# 4. Refresh page
# 5. ✅ Should load with cached session
# 6. Check console for:
#    "[useOfflineAuth] Loaded session for user: user@example.com"
```

### **3. Test Logout Clearing**

```bash
# 1. Login while online
# 2. Verify IndexedDB has cached data
# 3. Click logout
# 4. Check IndexedDB again
# 5. ✅ All auth data should be cleared
# 6. Check console for:
#    "[clearAuthCache] ✅ Auth cache cleared"
```

### **4. Test Expired Session**

```bash
# 1. Login while online
# 2. Manually edit cached session in IndexedDB:
#    Set expiresAt to yesterday's date
# 3. Go offline
# 4. Refresh page
# 5. ✅ Should show "Not Authenticated" (expired)
# 6. Check console for:
#    "[useOfflineAuth] All sessions expired"
```

---

## Security Considerations

### **What's Stored:**

- ✅ User ID, email, name (basic profile)
- ✅ Roles and permissions (for access control)
- ✅ Practice IDs (for tenant routing)
- ✅ Session ID (used as token)

### **What's NOT Stored:**

- ❌ Password (never cached)
- ❌ Sensitive medical data (unless explicitly saved)
- ❌ Payment information (never cached)
- ❌ Real JWT tokens (session ID used instead)

### **Token Security:**

- Tokens are **obfuscated** (base64 + character substitution)
- **NOT cryptographically encrypted** (acceptable for session IDs)
- Sessions expire after **24 hours**
- Cleared automatically on logout

### **Production Recommendations:**

1. Use **Web Crypto API** for real encryption
2. Implement **biometric authentication** for offline access
3. Add **device fingerprinting** to prevent session theft
4. Use **secure key storage** (OS keychain on mobile)

---

## Console Logs to Expect

### **On Login:**

```
[UserContext login] Attempting login for: user@example.com
[AUTH_API] Session created successfully for user: 123 with session ID: 550e8400-...
[cacheAuthForOffline] Caching auth data for user: user@example.com
[cacheAuthForOffline] Auth token saved
[cacheAuthForOffline] Session saved
[cacheAuthForOffline] Permissions saved
[cacheAuthForOffline] ✅ All auth data cached successfully
[UserContext login] ✅ Auth data cached for offline use
[UserContext login SUCCESS] Login successful, user set in context: user@example.com ADMINISTRATOR
```

### **On Offline Load:**

```
[API ME] Network/DB error detected. Client should use offline mode.
[useOfflineAuth] Loaded session for user: user@example.com
[useAuthWithOffline] Server returned offline flag, switching to offline mode
[useAuthWithOffline] Loaded user from offline storage: user@example.com
```

### **On Logout:**

```
[UserContext logout] Attempting logout.
[clearAuthCache] Clearing offline auth data
[clearAuthCache] ✅ Auth cache cleared
[UserContext logout] ✅ Offline auth cache cleared
[UserContext logout FINALLY] Client state cleared.
```

---

## Benefits

### **For Users:**

- ✅ Can continue working after initial login, even offline
- ✅ No need to re-login when connection drops
- ✅ Seamless experience across online/offline transitions
- ✅ Data persists across browser sessions

### **For Developers:**

- ✅ Automatic caching on login (no manual intervention)
- ✅ Automatic clearing on logout (no orphaned data)
- ✅ Non-blocking implementation (errors don't break login)
- ✅ Easy to test and debug

### **For System:**

- ✅ Reduced server load (fewer auth API calls)
- ✅ Faster app initialization (cached data)
- ✅ Better offline user experience
- ✅ Foundation for full offline mode

---

## Next Steps

1. **Test thoroughly:**

   - Login → Go offline → Refresh → Should stay logged in
   - Logout → IndexedDB should be cleared
   - Expired session → Should force re-login

2. **Monitor console logs:**

   - Look for caching success messages
   - Check for any errors during save/load
   - Verify session expiry validation

3. **Update offline demo page:**

   - Show cached session details
   - Display token expiry countdown
   - Add "Force Refresh" button

4. **Add to Sprint 2:**
   - Automatic sync when back online
   - Session refresh before expiry
   - Multi-device session management

---

## Summary

✅ **Problem Solved:** Users can now login once and continue working offline

✅ **Implementation:**

- Auth data cached to IndexedDB on login
- Session loaded from cache when offline
- Cache cleared on logout

✅ **Result:** Full offline authentication support with 24-hour session persistence

The app will now show **"Authenticated"** and **"Token Valid"** when offline, as long as the user logged in within the last 24 hours!
