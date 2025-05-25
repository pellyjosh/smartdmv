
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_TOKEN_COOKIE_NAME, HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME } from '@/config/authConstants';
import type { User } from '@/context/UserContext'; // Use User types from UserContext

const AUTH_PAGE = '/auth/login';

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
      // User is authenticated and on the login page.
      // UserContext will handle redirecting them to their dashboard.
      console.log(`[Middleware] Authenticated user (${userFromClientCookie.email}) on auth page. Allowing request for client-side redirect from UserContext.`);
    }
    return NextResponse.next();
  }

  // 3. Handle root path ('/')
  if (pathname === '/') {
    if (!isServerAuthenticated) {
      console.log(`[Middleware] Unauthenticated user on root path. Redirecting to login.`);
      return NextResponse.redirect(new URL(AUTH_PAGE, request.url));
    }
    // If authenticated and on root path, redirect to their role-specific dashboard
    if (isClientCookieValid && userFromClientCookie) {
        const userRole = userFromClientCookie.role;
        console.log(`[Middleware] Authenticated user (${userFromClientCookie.email} - ${userRole}) on root path. Redirecting to their dashboard.`);
        if (userRole === 'ADMINISTRATOR') return NextResponse.redirect(new URL(ADMINISTRATOR_DASHBOARD, request.url));
        if (userRole === 'PRACTICE_ADMINISTRATOR') return NextResponse.redirect(new URL(PRACTICE_ADMIN_DASHBOARD, request.url));
        if (userRole === 'CLIENT') return NextResponse.redirect(new URL(CLIENT_DASHBOARD, request.url));
        // Fallback for unknown role
        console.warn(`[Middleware] Unknown role ${userRole} for authenticated user on root path. Redirecting to login.`);
        return NextResponse.redirect(new URL(AUTH_PAGE, request.url));
    }
    // If server authenticated but client cookie not yet valid (e.g., race condition), allow UserContext to resolve on the client side.
    // src/app/(main)/page.tsx should handle its own loading/redirect logic if user context isn't ready.
    console.log(`[Middleware] Server-authenticated user on root path, client cookie pending. Allowing request for UserContext to resolve on client for /.`);
    return NextResponse.next();
  }

  // 4. Handle other explicitly protected paths
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

    // If httpOnly token exists, but client cookie details are missing for role check,
    // allow UserContext to validate via /api/auth/me.
    if (!isClientCookieValid || !userFromClientCookie) {
      console.warn(`[Middleware] Server session token exists, but client cookie missing/invalid for protected page (${pathname}). Allowing request to proceed for UserContext to validate via /api/auth/me.`);
      return NextResponse.next();
    }

    // Role-based access control for protected paths
    const userRole = userFromClientCookie.role;
    if (userRole === 'CLIENT') {
      if (isAdminDashboard || isPracticeAdminDashboard) {
        console.log(`[Middleware] Client (${userFromClientCookie.email}) attempting restricted dashboard (${pathname}). Redirecting to client dashboard.`);
        return NextResponse.redirect(new URL(CLIENT_DASHBOARD, request.url));
      }
    } else if (userRole === 'ADMINISTRATOR') {
      if (isClientDashboard || isPracticeAdminDashboard || isOtherClientRoute) {
        console.log(`[Middleware] Administrator (${userFromClientCookie.email}) attempting restricted page (${pathname}). Redirecting to admin dashboard.`);
        return NextResponse.redirect(new URL(ADMINISTRATOR_DASHBOARD, request.url));
      }
    } else if (userRole === 'PRACTICE_ADMINISTRATOR') {
      if (isClientDashboard || isAdminDashboard || isOtherClientRoute) {
        console.log(`[Middleware] Practice Admin (${userFromClientCookie.email}) attempting restricted page (${pathname}). Redirecting to practice admin dashboard.`);
        return NextResponse.redirect(new URL(PRACTICE_ADMIN_DASHBOARD, request.url));
      }
    } else {
        console.warn(`[Middleware] Unknown role in client cookie: ${userRole} for protected path ${pathname}. Redirecting to login.`);
        const loginUrl = new URL(AUTH_PAGE, request.url);
        loginUrl.searchParams.set('callbackUrl', pathname + request.nextUrl.search);
        return NextResponse.redirect(loginUrl);
    }
  }

  // For any other paths not explicitly handled, allow them
  // This is important for public pages that are not the root or auth pages.
  console.log(`[Middleware] Path ${pathname} not explicitly handled by auth checks. Allowing request.`);
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except for API routes, static files, image optimization files, and specific public files.
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|robots.txt|assets|images|.*\\.(?:png|jpg|jpeg|gif|svg)$).*)',
  ],
};
