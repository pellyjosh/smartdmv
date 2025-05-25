
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

// Other protected routes (relevant for access control, not initial login redirect)
const OTHER_CLIENT_PROTECTED_ROUTES = ['/favorites', '/symptom-checker']; 

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
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
  console.log(`[Middleware] Path: ${pathname}, ServerAuth: ${isServerAuthenticated}, ClientCookieValid: ${isClientCookieValid}, UserRole: ${userFromClientCookie?.role}`);

  // 1. Handle /auth or /auth/ redirect to /auth/login
  if (pathname === '/auth' || pathname === '/auth/') {
    console.log('[Middleware] Path is /auth or /auth/, redirecting to /auth/login');
    return NextResponse.redirect(new URL(AUTH_PAGE, request.url));
  }
  
  // 2. Handle the login page itself
  if (pathname === AUTH_PAGE) {
    if (isServerAuthenticated && isClientCookieValid && userFromClientCookie) {
      console.log(`[Middleware] Authenticated user (${userFromClientCookie.email}) on auth page. Allowing request for client-side redirect from UserContext.`);
    }
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
        if (userRole === 'ADMINISTRATOR') return NextResponse.redirect(new URL(ADMINISTRATOR_DASHBOARD, request.url));
        if (userRole === 'PRACTICE_ADMINISTRATOR') return NextResponse.redirect(new URL(PRACTICE_ADMIN_DASHBOARD, request.url));
        if (userRole === 'CLIENT') return NextResponse.redirect(new URL(CLIENT_DASHBOARD, request.url));
        // Fallback for unknown role, though UserContext should prevent this state if API is consistent
        console.warn(`[Middleware] Unknown role ${userRole} for authenticated user on root path. Redirecting to login.`);
        return NextResponse.redirect(new URL(AUTH_PAGE, request.url));
    }
    // If server authenticated but client cookie is pending/invalid, let UserContext handle it on client for /
    console.log(`[Middleware] Server-authenticated user on root path, client cookie pending. Allowing request for UserContext to resolve on client for /.`);
    return NextResponse.next();
  }

  // 5. Handle other explicitly protected paths
  const isClientDashboard = pathname.startsWith(CLIENT_DASHBOARD);
  const isAdminDashboard = pathname.startsWith(ADMINISTRATOR_DASHBOARD);
  const isPracticeAdminDashboard = pathname.startsWith(PRACTICE_ADMIN_DASHBOARD);
  const isOtherClientRoute = OTHER_CLIENT_PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  const isExplicitlyProtectedPath = isClientDashboard || isAdminDashboard || isPracticeAdminDashboard || isOtherClientRoute;

  if (isExplicitlyProtectedPath) {
    if (!isServerAuthenticated) {
      const loginUrl = new URL(AUTH_PAGE, request.url);
      loginUrl.searchParams.set('callbackUrl', pathname + request.nextUrl.search);
      console.log(`[Middleware] No server session token for protected page (${pathname}), redirecting to login.`);
      return NextResponse.redirect(loginUrl);
    }

    // Server session token exists, now check client cookie for role-based authorization
    if (!isClientCookieValid || !userFromClientCookie) {
      // If server token exists but client cookie is missing/invalid,
      // it's safer to deny access or redirect to login rather than letting potentially
      // unauthorized access through to a page that UserContext might not protect quickly enough.
      console.warn(`[Middleware] Server session token exists, but client cookie missing/invalid for protected page (${pathname}). Redirecting to login.`);
      const loginUrl = new URL(AUTH_PAGE, request.url);
      loginUrl.searchParams.set('callbackUrl', pathname + request.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }

    // Role-based access control for protected paths
    const userRole = userFromClientCookie.role;
    if (userRole === 'CLIENT') {
      if (isAdminDashboard || isPracticeAdminDashboard) {
        console.log(`[Middleware] Client (${userFromClientCookie.email}) attempting restricted dashboard (${pathname}). Redirecting to ${ACCESS_DENIED_PAGE}.`);
        return NextResponse.redirect(new URL(ACCESS_DENIED_PAGE, request.url));
      }
    } else if (userRole === 'ADMINISTRATOR') {
      if (isClientDashboard || isPracticeAdminDashboard || isOtherClientRoute) {
        console.log(`[Middleware] Administrator (${userFromClientCookie.email}) attempting restricted page (${pathname}). Redirecting to ${ACCESS_DENIED_PAGE}.`);
        return NextResponse.redirect(new URL(ACCESS_DENIED_PAGE, request.url));
      }
    } else if (userRole === 'PRACTICE_ADMINISTRATOR') {
      if (isClientDashboard || isAdminDashboard || isOtherClientRoute) {
        console.log(`[Middleware] Practice Admin (${userFromClientCookie.email}) attempting restricted page (${pathname}). Redirecting to ${ACCESS_DENIED_PAGE}.`);
        return NextResponse.redirect(new URL(ACCESS_DENIED_PAGE, request.url));
      }
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
    // Apply middleware to all paths except API routes, static files, images, etc.
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|robots.txt|assets|images|.*\\.(?:png|jpg|jpeg|gif|svg)$).*)',
  ],
};
