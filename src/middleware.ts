
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_TOKEN_COOKIE_NAME, HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME } from '@/config/authConstants';
import type { User } from '@/hooks/useAuth';

const AUTH_PAGE = '/auth/login';

// Define dashboard paths
const CLIENT_DASHBOARD = '/client';
const ADMINISTRATOR_DASHBOARD = '/administrator';
const PRACTICE_ADMIN_DASHBOARD = '/practice-administrator';

// Other protected routes
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
  
  const isServerAuthenticated = !!httpOnlySessionToken; // Basic check: server session was created

  // If the user is trying to access the login page
  if (pathname === AUTH_PAGE) {
    if (isServerAuthenticated && isClientCookieValid && userFromClientCookie) {
      // If both server session seems active and client cookie has valid user, redirect away from login
      let redirectTo = '/'; 
      if (userFromClientCookie.role === 'ADMINISTRATOR') redirectTo = ADMINISTRATOR_DASHBOARD;
      else if (userFromClientCookie.role === 'PRACTICE_ADMINISTRATOR') redirectTo = PRACTICE_ADMIN_DASHBOARD;
      else if (userFromClientCookie.role === 'CLIENT') redirectTo = CLIENT_DASHBOARD;
      console.log(`[Middleware] Authenticated user (${userFromClientCookie.email} - ${userFromClientCookie.role}) on auth page, redirecting to ${redirectTo}`);
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }
    // Unauthenticated user or user with only server session but no client cookie yet on auth page, allow access
    return NextResponse.next();
  }

  // Define all protected routes
  const isClientDashboard = pathname === CLIENT_DASHBOARD;
  const isAdminDashboard = pathname === ADMINISTRATOR_DASHBOARD;
  const isPracticeAdminDashboard = pathname === PRACTICE_ADMIN_DASHBOARD;
  const isOtherClientRoute = OTHER_CLIENT_PROTECTED_ROUTES.some(route => pathname.startsWith(route));

  const isProtectedPath = isClientDashboard || isAdminDashboard || isPracticeAdminDashboard || isOtherClientRoute;

  if (isProtectedPath) {
    if (!isServerAuthenticated) {
      // If no server session token, definitely redirect to login
      const loginUrl = new URL(AUTH_PAGE, request.url);
      loginUrl.searchParams.set('callbackUrl', pathname + request.nextUrl.search);
      console.log(`[Middleware] No server session token for protected page (${pathname}), redirecting to login.`);
      return NextResponse.redirect(loginUrl);
    }

    // Server session exists, now check role based on client cookie for authorization
    if (!isClientCookieValid || !userFromClientCookie) {
      // Server session exists, but client cookie is not (yet) valid or parsed.
      // This can happen briefly after login.
      // Allowing the request to proceed might be better than immediate redirect to avoid loops.
      // The client-side AuthProvider or page guards should handle this state.
      // However, if critical role info is missing, redirecting might be safer if the client-side guards fail.
      // For now, if no role info, we'll redirect. A more advanced setup might call an API to verify session_token and get role.
      console.warn(`[Middleware] Server session token exists, but client cookie missing/invalid for protected page (${pathname}). Redirecting to login.`);
      const loginUrl = new URL(AUTH_PAGE, request.url);
      loginUrl.searchParams.set('callbackUrl', pathname + request.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }

    // Both server session and client user details are available. Perform role-based access control.
    if (userFromClientCookie.role === 'CLIENT') {
      if (isAdminDashboard || isPracticeAdminDashboard) {
        console.log(`[Middleware] Client (${userFromClientCookie.email}) attempting restricted dashboard (${pathname}). Redirecting to client dashboard.`);
        return NextResponse.redirect(new URL(CLIENT_DASHBOARD, request.url));
      }
    } else if (userFromClientCookie.role === 'ADMINISTRATOR') {
      if (isClientDashboard || isPracticeAdminDashboard || isOtherClientRoute) {
        console.log(`[Middleware] Administrator (${userFromClientCookie.email}) attempting restricted page (${pathname}). Redirecting to admin dashboard.`);
        return NextResponse.redirect(new URL(ADMINISTRATOR_DASHBOARD, request.url));
      }
    } else if (userFromClientCookie.role === 'PRACTICE_ADMINISTRATOR') {
      if (isClientDashboard || isAdminDashboard || isOtherClientRoute) {
        console.log(`[Middleware] Practice Admin (${userFromClientCookie.email}) attempting restricted page (${pathname}). Redirecting to practice admin dashboard.`);
        return NextResponse.redirect(new URL(PRACTICE_ADMIN_DASHBOARD, request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|robots.txt|assets|images|.*\\.(?:png|jpg|jpeg|gif|svg)$).*)',
  ],
};
