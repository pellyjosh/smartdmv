import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple in-memory cache for middleware (resets on server restart)
const middlewareCache = new Map<string, { tenantId: string; timestamp: number }>();
const MIDDLEWARE_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

function getCachedTenantId(subdomain: string): string | null {
  const cached = middlewareCache.get(subdomain);
  if (!cached) return null;
  
  const now = Date.now();
  if (now - cached.timestamp > MIDDLEWARE_CACHE_TTL) {
    middlewareCache.delete(subdomain);
    return null;
  }
  
  return cached.tenantId;
}

function setCachedTenantId(subdomain: string, tenantId: string): void {
  middlewareCache.set(subdomain, {
    tenantId,
    timestamp: Date.now()
  });
}

// Extract tenant identifier from hostname
function extractTenantFromHostname(hostname: string): string | null {
  const cleanHostname = hostname.split(':')[0];
  
  if (cleanHostname === 'localhost' || 
      cleanHostname.startsWith('127.0.0.1') || 
      cleanHostname.startsWith('192.168.') ||
      /^\d+\.\d+\.\d+\.\d+$/.test(cleanHostname)) {
    return null;
  }
  
  const parts = cleanHostname.split('.');
  
  // Handle development subdomains like "smartvet.localhost"
  if (parts.length >= 2 && parts[parts.length - 1] === 'localhost') {
    return parts[0];
  }
  
  if (parts.length >= 3) {
    return parts[0];
  }
  
  return cleanHostname;
}

export async function optimizedMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';
  
  // Skip middleware for static files and API routes that don't need tenant context
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/health')
  ) {
    return NextResponse.next();
  }

  // Check if this is the owner domain
  const ownerDomain = process.env.OWNER_DOMAIN || 'localhost:9002';
  const isOwnerDomain = hostname === ownerDomain;

  // Handle API routes
  if (pathname.startsWith('/api/')) {
    if (pathname.startsWith('/api/owner/')) {
      if (!isOwnerDomain) {
        return new Response('Owner API not allowed on this domain', { status: 403 });
      }
      return NextResponse.next();
    }
    
    // For tenant API routes, add tenant headers with caching
    const tenantIdentifier = extractTenantFromHostname(hostname);
    if (tenantIdentifier && !isOwnerDomain) {
      const requestHeaders = new Headers(request.headers);
      
      // Try to get cached tenant ID first
      const cachedTenantId = getCachedTenantId(tenantIdentifier);
      if (cachedTenantId) {
        requestHeaders.set('X-Tenant-Identifier', tenantIdentifier);
        requestHeaders.set('X-Tenant-ID-Cached', cachedTenantId);
      } else {
        requestHeaders.set('X-Tenant-Identifier', tenantIdentifier);
        requestHeaders.set('X-Requires-Tenant-Validation', 'true');
      }
      
      const response = NextResponse.next({
        request: { headers: requestHeaders },
      });

      // If we got a successful response, cache the tenant ID for future requests
      if (cachedTenantId) {
        response.headers.set('X-Tenant-Cache-Hit', 'true');
      }
      
      return response;
    }
    
    if (isOwnerDomain) {
      return new Response('Tenant API not allowed on owner domain', { status: 403 });
    }
    
    return NextResponse.next();
  }

  // For page routes, add tenant headers
  const tenantIdentifier = extractTenantFromHostname(hostname);
  
  if (isOwnerDomain && !pathname.startsWith('/api/') && pathname !== '/') {
    return NextResponse.redirect(new URL('/owner-auth', request.url));
  }
  
  if (tenantIdentifier && !isOwnerDomain) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('X-Tenant-Identifier', tenantIdentifier);
    
    // Check cache for faster response
    const cachedTenantId = getCachedTenantId(tenantIdentifier);
    if (cachedTenantId) {
      requestHeaders.set('X-Tenant-ID-Cached', cachedTenantId);
    } else {
      requestHeaders.set('X-Requires-Tenant-Validation', 'true');
    }
    
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    
    return response;
  }
  
  if (!isOwnerDomain && tenantIdentifier === null) {
    return new Response('Invalid domain', { status: 404 });
  }

  return NextResponse.next();
}

// Cache cleanup function
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of middlewareCache.entries()) {
    if (now - entry.timestamp > MIDDLEWARE_CACHE_TTL) {
      middlewareCache.delete(key);
    }
  }
}, 60 * 1000); // Clean up every minute

// Export a function to update cache from API responses
export function updateMiddlewareTenantCache(subdomain: string, tenantId: string) {
  setCachedTenantId(subdomain, tenantId);
}
