
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
  // Checks for the httpOnly server-side session token
  const httpOnlySessionToken = request.cookies.get(HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME)?.value;
  // Checks for the client-side cookie containing user details (including role)
  const clientUserSessionCookie = request.cookies.get(SESSION_TOKEN_COOKIE_NAME)?.value;

  let userFromClientCookie: User | null = null;
  let isClientCookieValid = false;

  // Attempts to parse the client cookie to get user details and role
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

  // Determines if the user is authenticated based on the server token
  const isServerAuthenticated = !!httpOnlySessionToken;
  console.log(`[Middleware] Path: ${pathname}, ServerAuth: ${isServerAuthenticated}, ClientCookieValid: ${isClientCookieValid}, UserRole: ${userFromClientCookie?.role}`);


  // --- Redirect /auth to /auth/login ---
  if (pathname === '/auth') {
    console.log('[Middleware] Path is /auth, redirecting to /auth/login');
    return NextResponse.redirect(new URL(AUTH_PAGE, request.url));
  }

  // --- Logic for handling the base URL ("/") ---
  // For now, we assume the base URL redirects to login if not authenticated,
  // or to the respective dashboard if authenticated.
  // Or it could be a public landing page. Currently, (main)/page.tsx is the landing.
  if (pathname === '/') {
    // If already authenticated and at root, let (main)/page.tsx handle it, or redirect to dashboard
    // For simplicity, if we ensure (main)/page.tsx checks auth and redirects if needed,
    // or UserContext's navigation logic handles it, we might not need explicit redirect here.
    // However, let's keep explicit redirect for authenticated users to their dashboard from '/'
    if (isServerAuthenticated && isClientCookieValid && userFromClientCookie) {
        let redirectTo = '/'; // Default to current page if no specific dashboard
        if (userFromClientCookie.role === 'ADMINISTRATOR') redirectTo = ADMINISTRATOR_DASHBOARD;
        else if (userFromClientCookie.role === 'PRACTICE_ADMINISTRATOR') redirectTo = PRACTICE_ADMIN_DASHBOARD;
        else if (userFromClientCookie.role === 'CLIENT') redirectTo = CLIENT_DASHBOARD;
        
        if (pathname !== redirectTo && redirectTo !== '/') { // Avoid self-redirect
            console.log(`[Middleware] Authenticated user (${userFromClientCookie.email}) at base URL, redirecting to ${redirectTo}`);
            return NextResponse.redirect(new URL(redirectTo, request.url));
        }
    }
    // If unauthenticated at base URL, let it render (main)/page.tsx, which should offer login or public content.
    // Or, if strict, redirect to login:
    // else if (!isServerAuthenticated) {
    //   return NextResponse.redirect(new URL(AUTH_PAGE, request.url));
    // }
  }


  // --- Logic for routing authenticated users FROM the login page ---
  if (pathname === AUTH_PAGE) {
    if (isServerAuthenticated && isClientCookieValid && userFromClientCookie) {
      let redirectTo = '/'; // Default redirect path
      if (userFromClientCookie.role === 'ADMINISTRATOR') redirectTo = ADMINISTRATOR_DASHBOARD;
      else if (userFromClientCookie.role === 'PRACTICE_ADMINISTRATOR') redirectTo = PRACTICE_ADMIN_DASHBOARD;
      else if (userFromClientCookie.role === 'CLIENT') redirectTo = CLIENT_DASHBOARD;
      console.log(`[Middleware] Authenticated user (${userFromClientCookie.email} - ${userFromClientCookie.role}) on auth page, redirecting to ${redirectTo}`);
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }
    return NextResponse.next(); // Allow access to login page if not authenticated
  }

  // --- Logic for protecting other routes and role-based access control ---
  const isClientDashboard = pathname.startsWith(CLIENT_DASHBOARD);
  const isAdminDashboard = pathname.startsWith(ADMINISTRATOR_DASHBOARD);
  const isPracticeAdminDashboard = pathname.startsWith(PRACTICE_ADMIN_DASHBOARD);
  const isOtherClientRoute = OTHER_CLIENT_PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  const isProtectedPath = isClientDashboard || isAdminDashboard || isPracticeAdminDashboard || isOtherClientRoute;

  if (isProtectedPath) {
    if (!isServerAuthenticated) { // Primary check: Server-side session must exist
      const loginUrl = new URL(AUTH_PAGE, request.url);
      loginUrl.searchParams.set('callbackUrl', pathname + request.nextUrl.search);
      console.log(`[Middleware] No server session token for protected page (${pathname}), redirecting to login.`);
      return NextResponse.redirect(loginUrl);
    }

    // Server session exists. Now check client-side details for role-based authorization.
    if (!isClientCookieValid || !userFromClientCookie) {
      // If client cookie is missing/invalid, but server session exists,
      // allow proceeding to the page. UserContext will fetch details via /api/auth/me.
      // If /api/auth/me fails, UserContext will then redirect to login.
      console.warn(`[Middleware] Server session token exists, but client cookie missing/invalid for protected page (${pathname}). Allowing request to proceed for UserContext to validate via /api/auth/me.`);
      return NextResponse.next();
    }

    // Both server session and client user details are available. Perform role-based access control.
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
        console.warn(`[Middleware] Unknown role in client cookie: ${userRole}. Redirecting to login.`);
        const loginUrl = new URL(AUTH_PAGE, request.url);
        loginUrl.searchParams.set('callbackUrl', pathname + request.nextUrl.search);
        return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|robots.txt|assets|images|.*\\.(?:png|jpg|jpeg|gif|svg)$).*)',
  ],
};
