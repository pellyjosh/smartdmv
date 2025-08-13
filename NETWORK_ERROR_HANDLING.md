# Network Error Handling Guide

This project now includes comprehensive network error handling at both the API middleware level, client-side level, and authentication/offline handling for protected pages.

## Overview

The network error handling system provides:

- **Automatic retry logic** for transient network failures
- **User-friendly error messages** instead of technical database errors
- **Real-time network status monitoring** on the client side
- **Centralized error handling** at the middleware level
- **Toast notifications** for network issues
- **Offline authentication handling** that prevents unnecessary login redirects
- **Cached user data preservation** during network outages

## Server-Side (API Middleware)

### API Middleware Wrapper

All API routes should use the `withNetworkErrorHandlingAndRetry` wrapper from `/src/lib/api-middleware.ts`:

```typescript
import { withNetworkErrorHandlingAndRetry } from "@/lib/api-middleware";

const getHandler = async (request: Request) => {
  // Your API logic here
  const data = await db.query.something.findMany();
  return NextResponse.json(data);
};

export const GET = withNetworkErrorHandlingAndRetry(getHandler);
```

### What it handles:

1. **Network connectivity issues** (DNS failures, connection timeouts)
2. **Database connection errors** (Neon DB connection failures)
3. **Automatic retries** with exponential backoff (1s, 2s, 4s delays)
4. **Proper HTTP status codes** (503 for network errors, 500 for other errors)
5. **Detailed logging** for debugging purposes

### Response format for network errors:

```json
{
  "error": "Unable to connect to the server. Please check your internet connection and try again.",
  "isNetworkError": true,
  "isDatabaseError": true,
  "retryable": true
}
```

## Client-Side Error Handling

### fetchWithRetry Utility

Use the enhanced fetch wrapper from `/src/lib/client-network-utils.ts`:

```typescript
import { fetchWithRetry } from "@/lib/client-network-utils";

const { data, error, isNetworkError } = await fetchWithRetry("/api/pets", {
  method: "GET",
  maxRetries: 2,
  showToast: true, // Automatically show toast notifications
});

if (error) {
  console.log("Error:", error);
  // Error handling is automatic, but you can add custom logic
}
```

### useApi Hook

For React components, use the `useApi` hook:

```typescript
import { useApi } from "@/lib/client-network-utils";

function MyComponent() {
  const { apiCall, isOnline } = useApi();

  const fetchData = async () => {
    const result = await apiCall("/api/soap-templates");
    if (result.data) {
      // Handle success
    }
    // Errors are handled automatically
  };

  return (
    <div>
      {isOnline ? "Connected" : "Offline"}
      <button onClick={fetchData}>Fetch Data</button>
    </div>
  );
}
```

## Network Status Components

### NetworkStatus Component

Displays network status and retry options (already added to root layout):

```typescript
import { NetworkStatus } from "@/components/NetworkStatus";

<NetworkStatus
  showOfflineAlert={true}
  onRetry={() => window.location.reload()}
/>;
```

### NetworkIndicator Component

Shows current connection status:

```typescript
import { NetworkIndicator } from "@/components/NetworkStatus";

<NetworkIndicator className="fixed bottom-4 right-4" />;
```

## Error Types Handled

### Network Errors

- DNS resolution failures (`ENOTFOUND`)
- Connection timeouts (`ETIMEDOUT`)
- Connection refused (`ECONNREFUSED`)
- Socket hang up errors
- General fetch failures

### Database Errors

- Neon DB connection errors
- Database timeouts
- Connection pool issues

### User-Friendly Messages

Instead of technical errors like:

```
Error [NeonDbError]: Error connecting to database: TypeError: fetch failed
```

Users see:

```
Unable to connect to the server. Please check your internet connection and try again.
```

## Automatic Features

1. **Automatic retries** with exponential backoff
2. **Toast notifications** for connection issues
3. **Online/offline detection** and notifications
4. **Proper HTTP status codes** for different error types
5. **Detailed logging** for debugging

## Migration Guide

### Updating Existing API Routes

Replace this pattern:

```typescript
export async function GET(request: Request) {
  try {
    const data = await db.query.something.findMany();
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
```

With this:

```typescript
import { withNetworkErrorHandlingAndRetry } from "@/lib/api-middleware";

const getHandler = async (request: Request) => {
  const data = await db.query.something.findMany();
  return NextResponse.json(data);
};

export const GET = withNetworkErrorHandlingAndRetry(getHandler);
```

### Updating Client-Side Fetch Calls

Replace this:

```typescript
const response = await fetch("/api/data");
const data = await response.json();
```

With this:

```typescript
import { fetchWithRetry } from "@/lib/client-network-utils";

const { data, error } = await fetchWithRetry("/api/data");
```

## Testing Network Errors

1. **Disconnect internet** and test API calls
2. **Block Neon DB domain** in browser dev tools
3. **Use Network Error Test component** at `/components/NetworkErrorTest.tsx`
4. **Simulate slow connections** in browser dev tools

## Benefits

- **Better user experience** with friendly error messages
- **Improved reliability** with automatic retries
- **Centralized error handling** reduces code duplication
- **Real-time feedback** on connection status
- **Easier debugging** with detailed logging

## Authentication and Offline Handling

### Problem Solved

Previously, when the network connection was lost and a protected page was refreshed:

1. The page would attempt to fetch user authentication status
2. Network error would result in no user data being available
3. Page would immediately redirect to login, even though the user's session might still be valid
4. User would lose their current page context unnecessarily

### Solution: Enhanced UserContext with Cached Data

The `UserContext` now:

- Loads cached user data from sessionStorage on initialization
- Preserves cached user data during network errors instead of clearing it
- Automatically retries authentication when network connection is restored
- Distinguishes between network errors and actual authentication failures

### useProtectedPage Hook

A new `useProtectedPage` hook provides consistent authentication handling:

```typescript
import { useProtectedPage } from "@/hooks/use-protected-page";

export default function MyProtectedPage() {
  const { user } = useUser();
  const { renderAuthState, NetworkErrorAlert } = useProtectedPage({
    allowedRoles: ["ADMINISTRATOR", "PRACTICE_ADMINISTRATOR"],
  });

  // Check if we should render auth state instead of the main content
  const authStateComponent = renderAuthState();
  if (authStateComponent) {
    return authStateComponent;
  }

  // If we get here, we have an authenticated user with the right role
  return (
    <div className="container mx-auto">
      <NetworkErrorAlert />
      {/* Your page content here */}
    </div>
  );
}
```

### Network States Handled

1. **Online + Authenticated**: Normal operation
2. **Online + Not Authenticated**: Redirect to login (session expired)
3. **Offline + Cached User**: Show offline indicator, allow continued use with cached data
4. **Offline + No Cached User**: Show network error with retry option
5. **Connection Restored**: Automatically retry authentication and update status

### User Feedback

Users now see appropriate feedback:

- **Loading**: "Loading, please wait..." while checking authentication
- **Network Error**: "Connection Error" with retry button when offline and no cached data
- **Offline Mode**: Alert banner when working with cached data during network issues
- **Redirecting**: "Redirecting to login..." only when session is actually expired

This ensures users maintain context and aren't unnecessarily logged out due to temporary network issues.

- **Consistent error responses** across all API routes
