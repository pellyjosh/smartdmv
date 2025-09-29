import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_PAGE = '/auth/login';
const OWNER_AUTH_PAGE = '/owner-auth';

// Extract tenant identifier from hostname (without database calls)
function extractTenantFromHostname(hostname: string): string | null {
  const cleanHostname = hostname.split(':')[0];
  
  // For localhost or IP addresses, return null (development mode)
  if (cleanHostname === 'localhost' || 
      cleanHostname.startsWith('127.0.0.1') || 
      cleanHostname.startsWith('192.168.') ||
      /^\d+\.\d+\.\d+\.\d+$/.test(cleanHostname)) {
    return null;
  }
  
  const parts = cleanHostname.split('.');
  
  // If it's a subdomain of your main domain (e.g., tenant.yourdomain.com)
  if (parts.length >= 3) {
    return parts[0];
  }
  
  // If it's a custom domain, return the full hostname
  return cleanHostname;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';
  
  // Check if this is the owner domain
  const ownerDomain = process.env.OWNER_DOMAIN || 'localhost:9002';
  const isOwnerDomain = hostname === ownerDomain;
  
  console.log(`[Middleware] ${pathname} on ${hostname}, isOwnerDomain: ${isOwnerDomain}`);
  
  // Skip middleware for owner authentication routes on owner domain
  if (pathname.startsWith('/owner-auth') || pathname.startsWith('/api/owner/auth')) {
    if (!isOwnerDomain) {
      console.log(`[Middleware] Owner auth attempted on non-owner domain: ${hostname}`);
      return new Response('Owner access not allowed on this domain', { status: 403 });
    }
    return NextResponse.next();
  }

  // Handle owner routes and owner API routes - only allow on owner domain
  if (pathname.startsWith('/owner') || pathname.startsWith('/api/owner/')) {
    if (!isOwnerDomain) {
      console.log(`[Middleware] Owner route attempted on non-owner domain: ${hostname}`);
      return new Response('Owner access not allowed on this domain', { status: 403 });
    }
    
    // For owner pages (not API), check owner session
    if (pathname.startsWith('/owner') && !pathname.startsWith('/owner-auth')) {
      const ownerSessionCookie = request.cookies.get('owner_session');
      if (!ownerSessionCookie) {
        console.log(`[Middleware] No owner session for ${pathname}, redirecting to owner auth`);
        return NextResponse.redirect(new URL(OWNER_AUTH_PAGE, request.url));
      }
    }
    
    // Owner routes and APIs allowed
    return NextResponse.next();
  }

  // For tenant routes, extract tenant identifier and validate basic format
  const tenantIdentifier = extractTenantFromHostname(hostname);
  
  // If we're on the owner domain but not accessing owner routes, redirect to owner auth
  if (isOwnerDomain && !pathname.startsWith('/api/') && pathname !== '/') {
    console.log(`[Middleware] Non-owner route on owner domain, redirecting to owner auth`);
    return NextResponse.redirect(new URL(OWNER_AUTH_PAGE, request.url));
  }
  
  // If we're on the owner domain accessing non-owner APIs, that's invalid
  if (isOwnerDomain && pathname.startsWith('/api/') && !pathname.startsWith('/api/owner/')) {
    console.log(`[Middleware] Non-owner API on owner domain: ${pathname}`);
    return new Response('API not available on owner domain', { status: 404 });
  }
  
  // If we have a tenant identifier, validate basic format and add to headers
  if (tenantIdentifier && !isOwnerDomain) {
    // Basic validation: tenant identifier should be reasonable (alphanumeric, hyphens, 3-20 chars)
    const isValidFormat = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,18}[a-zA-Z0-9]$/.test(tenantIdentifier);
    
    // if (!isValidFormat) {
    //   console.log(`[Middleware] Invalid tenant identifier format: ${tenantIdentifier}`);
    //   return new Response('Invalid subdomain format', { status: 404 });
    // }
    
    console.log(`[Middleware] Valid tenant subdomain format detected: ${tenantIdentifier}`);
    
    // Create response with tenant headers - TenantProvider will validate existence
    const response = NextResponse.next();
    response.headers.set('X-Tenant-Identifier', tenantIdentifier);
    response.headers.set('X-Requires-Tenant-Validation', 'true');
    
    return response;
  }
  
  // If no tenant identifier and not owner domain, this might be an invalid request
  if (!isOwnerDomain && tenantIdentifier === null) {
    console.log(`[Middleware] No tenant identifier and not owner domain: ${hostname}`);
    return new Response('Invalid domain', { status: 404 });
  }

  console.log(`[Middleware] Allowing request to ${pathname}`);
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Apply middleware to all paths except static files, images, but INCLUDE API routes
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|robots.txt|assets|images|.*\\.(?:png|jpg|jpeg|gif|svg)$).*)',
  ],
};
