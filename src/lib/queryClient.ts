import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Keep track of 401 errors to prevent flooding the console and UI with error messages
const authErrorTimestamps: number[] = [];
const AUTH_ERROR_THROTTLE_WINDOW = 10000; // 10 seconds window

// Check if we've had too many auth errors recently
function shouldThrottleAuthError(): boolean {
  const now = Date.now();
  // Filter out timestamps older than our window
  const recentErrors = authErrorTimestamps.filter(
    timestamp => now - timestamp < AUTH_ERROR_THROTTLE_WINDOW
  );
  
  // Update our array with only recent errors
  authErrorTimestamps.length = 0;
  authErrorTimestamps.push(...recentErrors);
  
  // If we have more than 3 errors in our window, throttle
  return recentErrors.length >= 3;
}

// Record a new auth error
function recordAuthError(): void {
  authErrorTimestamps.push(Date.now());
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = res.statusText;
    let errorData: any = null;
    
    try {
      // Try to parse the response as JSON for a more specific error message
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        errorData = await res.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } else {
        // If not JSON, just get the text
        const text = await res.text();
        if (text) errorMessage = text;
      }
    } catch (e) {
      // If we couldn't parse the response, use the status text
      console.error("Error parsing error response:", e);
    }
    
    // Special handling for auth errors
    if (res.status === 401) {
      recordAuthError();
      if (shouldThrottleAuthError()) {
        console.warn("Throttling 401 error messages - too many unauthorized requests");
        errorMessage = "Session expired. Please log in again.";
      } else {
        console.error(`401 Unauthorized: ${errorMessage}`);
      }
    } else {
      // Log any other error type for debugging
      console.error(`HTTP Error ${res.status}: ${errorMessage}`);
    }
    
    const error = new Error(`${res.status}: ${errorMessage}`);
    (error as any).status = res.status;
    (error as any).data = errorData;
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options: { cache?: RequestCache; skipErrorLogging?: boolean } = {}
): Promise<Response> {
  // Add cache busting for GET requests
  const endpoint = method === 'GET' 
    ? `${url}${url.includes('?') ? '&' : '?'}_cb=${Date.now()}` 
    : url;
    
  const fetchOptions: RequestInit = {
    method,
    headers: data ? { 
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache"
    } : {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache"
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
    cache: options.cache || "no-store",
  };
  
  console.log(`API Request: ${method} ${url}`, data ? { data } : '');
  
  try {
    const res = await fetch(endpoint, fetchOptions);
    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    // Skip logging for throttled auth errors if requested
    if (!options.skipErrorLogging && !((error as any).status === 401 && shouldThrottleAuthError())) {
      console.error(`API Request failed: ${method} ${url}`, error);
    }
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    let url = queryKey[0] as string;
    const skipAuth = unauthorizedBehavior === "returnNull";
    
    // Add cache busting parameter to prevent caching
    url = `${url}${url.includes('?') ? '&' : '?'}_cb=${Date.now()}`;
    
    if (!skipAuth) {
      console.log(`Fetching: ${url}`);
    }
    
    try {
      const res = await fetch(url, {
        credentials: "include",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache"
        }
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        // Don't log every auth check for routes that are expected to fail when not logged in
        if (!url.includes("/api/user")) {
          console.log(`Unauthorized (401) access to ${url}, returning null as configured`);
        }
        return null;
      }

      await throwIfResNotOk(res);
      const data = await res.json();
      return data;
    } catch (error) {
      if ((error as any).status === 401 && shouldThrottleAuthError()) {
        // Don't flood the console with throttled auth errors
        if (unauthorizedBehavior === "returnNull") {
          return null;
        }
      } else {
        console.error(`Error fetching ${url}:`, error);
      }
      throw error;
    }
  };

// For session errors, we'll try to recover by forcing a refresh
const handleSessionErrors = (error: unknown) => {
  // Check if it's an auth error
  if ((error as any)?.status === 401) {
    console.log("Session error detected, updating auth state...");
    // Will be handled by the useAuth hook's checkAuth method
    queryClient.invalidateQueries({ queryKey: ["/api/user"] });
  }
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true, // Changed to true to help detect session issues
      staleTime: 5 * 60 * 1000, // 5 minutes instead of infinity
      retry: 1, // Retry once
      // onError: handleSessionErrors,
    },
    mutations: {
      retry: 1, // Retry once
      onError: handleSessionErrors,
    },
  },
});
