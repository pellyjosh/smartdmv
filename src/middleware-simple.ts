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

  // Handle owner routes - only allow on owner domain
  if (pathname.startsWith('/owner')) {
    if (!isOwnerDomain) {
      console.log(`[Middleware] Owner route attempted on non-owner domain: ${hostname}`);
      return new Response('Owner access not allowed on this domain', { status: 403 });
    }
    
    const ownerSessionCookie = request.cookies.get('owner_session');
    if (!ownerSessionCookie) {
      console.log(`[Middleware] No owner session for ${pathname}, redirecting to owner auth`);
      return NextResponse.redirect(new URL(OWNER_AUTH_PAGE, request.url));
    }
    // Owner is authenticated, allow access
    return NextResponse.next();
  }

  // For tenant routes, extract tenant identifier and add to headers
  const tenantIdentifier = extractTenantFromHostname(hostname);
  
  // If we're on the owner domain but not accessing owner routes, redirect to owner auth
  if (isOwnerDomain && !pathname.startsWith('/api/') && pathname !== '/') {
    console.log(`[Middleware] Non-owner route on owner domain, redirecting to owner auth`);
    return NextResponse.redirect(new URL(OWNER_AUTH_PAGE, request.url));
  }
  
  // If we have a tenant identifier, add it to headers for the app to use
  if (tenantIdentifier && !isOwnerDomain) {
    console.log(`[Middleware] Tenant subdomain detected: ${tenantIdentifier}`);
    
    // Create response with tenant headers
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
    // Apply middleware to all paths except API routes, static files, images, etc.
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|robots.txt|assets|images|.*\\.(?:png|jpg|jpeg|gif|svg)$).*)',
  ],
};
