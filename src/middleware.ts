import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_TOKEN_COOKIE_NAME, HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME } from '@/config/authConstants';
import type { User } from '@/context/UserContext'; // Use User types from UserContext

const AUTH_PAGE = '/auth/login';
const ACCESS_DENIED_PAGE = '/access-denied';

// Define dashboard paths
const CLIENT_DASHBOARD = '/client';
const ADMINISTRATOR_DASHBOARD = '/administrator';
const PRACTICE_ADMIN_DASHBOARD = '/practice-administrator';
const OWNER_DASHBOARD = '/owner';

// Other protected routes (relevant for access control, not initial login redirect)
const ADMIN_PROTECTED_ROUTES = ['/admin'];
const OWNER_PROTECTED_ROUTES = ['/company-management'];

// Extract tenant identifier from hostname (without database calls)
function extractTenantFromHostname(hostname: string): string | null {
  const cleanHostname = hostname.split(':')[0];
  
  // For plain localhost or IP addresses, return null
  if (cleanHostname === 'localhost' || 
      cleanHostname.startsWith('127.0.0.1') || 
      cleanHostname.startsWith('192.168.') ||
      /^\d+\.\d+\.\d+\.\d+$/.test(cleanHostname)) {
    return null;
  }
  
  const parts = cleanHostname.split('.');
  
  // Handle development subdomains like "smartvet.localhost"
  if (parts.length >= 2 && parts[parts.length - 1] === 'localhost') {
    return parts[0]; // Return "smartvet" from "smartvet.localhost"
  }
  
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
  
  // Handle API routes first
  if (pathname.startsWith('/api/')) {
    // Skip middleware for owner API routes
    if (pathname.startsWith('/api/owner/')) {
      if (!isOwnerDomain) {
        console.log(`[Middleware] Owner API attempted on non-owner domain: ${hostname}`);
        return new Response('Owner API not allowed on this domain', { status: 403 });
      }
      return NextResponse.next();
    }
    
    // For tenant API routes, set tenant headers
    const tenantIdentifier = extractTenantFromHostname(hostname);
    if (tenantIdentifier && !isOwnerDomain) {
      // Only log for debugging specific routes
      if (process.env.NODE_ENV === 'development' && (pathname.includes('/health-plans/') || pathname.includes('/debug'))) {
        console.log(`[Middleware] Setting tenant header for API route: ${pathname} -> ${tenantIdentifier}`);
      }
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('X-Tenant-Identifier', tenantIdentifier);
      
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }
    
    // For non-owner API routes on owner domain, block them
    if (isOwnerDomain) {
      console.log(`[Middleware] Non-owner API on owner domain: ${pathname}`);
      return new Response('Tenant API not allowed on owner domain', { status: 403 });
    }
    
    // Regular API route handling
    return NextResponse.next();
  }

  // Skip middleware for owner authentication routes on owner domain
  if (pathname.startsWith('/owner-auth')) {
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
      return NextResponse.redirect(new URL('/owner-auth', request.url));
    }
    // Owner is authenticated, allow access
    return NextResponse.next();
  }

  // For tenant routes, validate the subdomain exists in the database
  const tenantIdentifier = extractTenantFromHostname(hostname);
  
  // If we're on the owner domain but not accessing owner routes, redirect to owner auth
  if (isOwnerDomain && !pathname.startsWith('/api/') && pathname !== '/') {
    console.log(`[Middleware] Non-owner route on owner domain, redirecting to owner auth`);
    return NextResponse.redirect(new URL('/owner-auth', request.url));
  }
  
  // If we have a tenant identifier, we need to validate it exists
  if (tenantIdentifier && !isOwnerDomain) {
    console.log(`[Middleware] Tenant subdomain detected: ${tenantIdentifier}`);
    
    // Add a special header to indicate we need tenant validation
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('X-Tenant-Identifier', tenantIdentifier);
    requestHeaders.set('X-Requires-Tenant-Validation', 'true');
    
    // For now, pass through - the TenantProvider will handle validation
    // and show appropriate error if tenant doesn't exist
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    
    return response;
  }
  
  // If no tenant identifier and not owner domain, this might be an invalid request
  if (!isOwnerDomain && tenantIdentifier === null) {
    console.log(`[Middleware] No tenant identifier and not owner domain: ${hostname}`);
    return new Response('Invalid domain', { status: 404 });
  }
  
  console.log(`[Middleware] Hostname: ${hostname}, TenantIdentifier: ${tenantIdentifier || 'none'}, IsOwnerDomain: ${isOwnerDomain}`);

  // Continue with existing middleware logic
  const httpOnlySessionToken = request.cookies.get(HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME)?.value;
  const clientUserSessionCookie = request.cookies.get(SESSION_TOKEN_COOKIE_NAME)?.value;

  let userFromClientCookie: User | null = null;
  let isClientCookieValid = false;

  if (clientUserSessionCookie) {
    try {
      const parsedUser = JSON.parse(clientUserSessionCookie) as User;
      if (parsedUser && parsedUser.id && parsedUser.role) {
        userFromClientCookie = parsedUser;
        isClientCookieValid = true;
      } else {
        console.warn('[Middleware] Invalid user object in client session cookie.');
      }
    } catch (error) {
      console.error('[Middleware] Failed to parse client session cookie:', error);
    }
  }

  const isServerAuthenticated = !!httpOnlySessionToken;
  console.log(`[Middleware] Path: ${pathname}, TenantIdentifier: ${tenantIdentifier || 'none'}, ServerAuth: ${isServerAuthenticated}, ClientCookieValid: ${isClientCookieValid}, UserRole: ${userFromClientCookie?.role}`);

  // 1. Handle /auth or /auth/ redirect to /auth/login
  if (pathname === '/auth' || pathname === '/auth/') {
    console.log('[Middleware] Path is /auth or /auth/, redirecting to /auth/login');
    return NextResponse.redirect(new URL(AUTH_PAGE, request.url));
  }

  // 2. Handle the login page itself
  if (pathname === AUTH_PAGE) {
    if (isServerAuthenticated && isClientCookieValid && userFromClientCookie) {
      // If we already have a valid server session and a client cookie with role, redirect now to avoid client-side loops
      const role = userFromClientCookie.role;
      let target = '/';
      if (role === 'OWNER' || role === 'COMPANY_ADMIN') target = OWNER_DASHBOARD;
      else if (role === 'ADMINISTRATOR' || role === 'SUPER_ADMIN') target = ADMINISTRATOR_DASHBOARD;
      else if (role === 'PRACTICE_ADMINISTRATOR') target = PRACTICE_ADMIN_DASHBOARD;
      else if (role === 'CLIENT') target = CLIENT_DASHBOARD;
      console.log(`[Middleware] Authenticated user (${userFromClientCookie.email}) hit login. Redirecting to ${target} (role: ${role}).`);
      return NextResponse.redirect(new URL(target, request.url));
    }
    // If we don't have a client cookie yet, allow the request so UserContext can call /api/auth/me and then client-redirect.
    return NextResponse.next();
  }

  // 3. Handle the access denied page itself
  if (pathname === ACCESS_DENIED_PAGE) {
    return NextResponse.next();
  }

  // 4. Handle root path ('/')
  if (pathname === '/') {
    if (!isServerAuthenticated) { // Unauthenticated users go to login
      console.log(`[Middleware] Unauthenticated user on root path. Redirecting to login.`);
      return NextResponse.redirect(new URL(AUTH_PAGE, request.url));
    }
    // Authenticated users get redirected to their specific dashboards from root
    if (isClientCookieValid && userFromClientCookie) {
        const userRole = userFromClientCookie.role;
        console.log(`[Middleware] Authenticated user (${userFromClientCookie.email} - ${userRole}) on root path. Redirecting to their dashboard.`);
        if (userRole === 'OWNER') return NextResponse.redirect(new URL(OWNER_DASHBOARD, request.url));
        if (userRole === 'ADMINISTRATOR' || userRole === 'SUPER_ADMIN') return NextResponse.redirect(new URL(ADMINISTRATOR_DASHBOARD, request.url));
        if (userRole === 'PRACTICE_ADMINISTRATOR') return NextResponse.redirect(new URL(PRACTICE_ADMIN_DASHBOARD, request.url));
        if (userRole === 'CLIENT') return NextResponse.redirect(new URL(CLIENT_DASHBOARD, request.url));
        // Fallback for unknown role
        console.warn(`[Middleware] Unknown role ${userRole} for authenticated user on root path. Redirecting to ${ACCESS_DENIED_PAGE}.`);
        return NextResponse.redirect(new URL(ACCESS_DENIED_PAGE, request.url));
    }
    // If server authenticated but client cookie is pending/invalid, let UserContext handle it on client for /
    // This allows UserContext to fetch user details via /api/auth/me
    console.log(`[Middleware] Server-authenticated user on root path, client cookie pending. Allowing request for UserContext to resolve.`);
    return NextResponse.next();
  }

  // 5. Handle other explicitly protected paths
  const isClientDashboard = pathname.startsWith(CLIENT_DASHBOARD);
  const isAdminDashboard = pathname.startsWith(ADMINISTRATOR_DASHBOARD);
  const isPracticeAdminDashboard = pathname.startsWith(PRACTICE_ADMIN_DASHBOARD);
  const isOwnerDashboard = pathname.startsWith(OWNER_DASHBOARD);
  const isAdminRoute = ADMIN_PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  const isOwnerRoute = OWNER_PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  const isExplicitlyProtectedPath = isClientDashboard || isAdminDashboard || isPracticeAdminDashboard || isOwnerDashboard || isAdminRoute || isOwnerRoute;

  if (isExplicitlyProtectedPath) {
    if (!isServerAuthenticated) {
      const loginUrl = new URL(AUTH_PAGE, request.url);
      loginUrl.searchParams.set('callbackUrl', pathname + request.nextUrl.search);
      console.log(`[Middleware] No server session token for protected page (${pathname}), redirecting to login.`);
      return NextResponse.redirect(loginUrl);
    }

    // Server session token exists. Now check if we have client cookie for role-based authorization.
    if (!isClientCookieValid || !userFromClientCookie) {
      // Server session token exists, but client cookie (with role) is missing/invalid.
      // Allow the request to proceed. UserContext on the page will call /api/auth/me.
      // If /api/auth/me fails, UserContext will redirect to login.
      // If /api/auth/me succeeds, UserContext populates, and client-side role checks occur.
      console.warn(`[Middleware] Server session token exists, but client cookie missing/invalid for protected page (${pathname}). Allowing request to proceed for UserContext to handle.`);
      return NextResponse.next();
    }

    // Both server session token and client user details are available. Perform role-based access control.
    const userRole = userFromClientCookie.role;
    
    // Create response
    const response = NextResponse.next();
    
    // Add tenant identifier to response headers for debugging
    if (tenantIdentifier) {
      response.headers.set('x-tenant-identifier', tenantIdentifier);
    }
    
    // Role-based access control
    if (userRole === 'OWNER' || userRole === 'COMPANY_ADMIN') {
      // Owners and company admins can only access owner routes
      if (!isOwnerDashboard && !isOwnerRoute) {
        console.log(`[Middleware] Owner/Company Admin (${userFromClientCookie.email}) attempting non-owner route (${pathname}). Redirecting to ${ACCESS_DENIED_PAGE}.`);
        return NextResponse.redirect(new URL(ACCESS_DENIED_PAGE, request.url));
      }
      return response;
    } else if (userRole === 'CLIENT') {
      if (isAdminDashboard || isPracticeAdminDashboard || isAdminRoute || isOwnerDashboard || isOwnerRoute) {
        console.log(`[Middleware] Client (${userFromClientCookie.email}) attempting restricted dashboard (${pathname}). Redirecting to ${ACCESS_DENIED_PAGE}.`);
        return NextResponse.redirect(new URL(ACCESS_DENIED_PAGE, request.url));
      }
      return response;
    } else if (userRole === 'ADMINISTRATOR' || userRole === 'SUPER_ADMIN') {
      if (isClientDashboard || isPracticeAdminDashboard || isOwnerDashboard || isOwnerRoute) {
        console.log(`[Middleware] Administrator/SuperAdmin (${userFromClientCookie.email}) attempting restricted page (${pathname}). Redirecting to ${ACCESS_DENIED_PAGE}.`);
        return NextResponse.redirect(new URL(ACCESS_DENIED_PAGE, request.url));
      }
      return response;
    } else if (userRole === 'PRACTICE_ADMINISTRATOR') {
      if (isClientDashboard || isAdminDashboard || isAdminRoute || isOwnerDashboard || isOwnerRoute) {
        console.log(`[Middleware] Practice Admin (${userFromClientCookie.email}) attempting restricted page (${pathname}). Redirecting to ${ACCESS_DENIED_PAGE}.`);
        return NextResponse.redirect(new URL(ACCESS_DENIED_PAGE, request.url));
      }
      return response;
    } else {
        console.warn(`[Middleware] Unknown role in client cookie: ${userRole} for protected path ${pathname}. Redirecting to ${ACCESS_DENIED_PAGE}.`);
        return NextResponse.redirect(new URL(ACCESS_DENIED_PAGE, request.url));
    }
  }

  // If path is not explicitly protected and not login/denied, allow it.
  console.log(`[Middleware] Path ${pathname} not explicitly handled by auth checks. Allowing request.`);
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Apply middleware to all paths including API routes, but exclude static files, images, etc.
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|robots.txt|assets|images|.*\\.(?:png|jpg|jpeg|gif|svg)$).*)',
  ],
};
