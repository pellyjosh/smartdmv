
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_TOKEN_COOKIE_NAME } from '@/config/authConstants';
import type { User, AdministratorUser, PracticeAdminUser, ClientUser } from '@/hooks/useAuth';

const AUTH_PAGE = '/auth/login';

// Define dashboard paths
const CLIENT_DASHBOARD = '/client';
const ADMINISTRATOR_DASHBOARD = '/administrator';
const PRACTICE_ADMIN_DASHBOARD = '/practice-administrator';

// Other protected routes for specific roles (example)
const OTHER_CLIENT_PROTECTED_ROUTES = ['/favorites', '/symptom-checker']; // Add more if needed

const ALL_DASHBOARD_ROUTES = [CLIENT_DASHBOARD, ADMINISTRATOR_DASHBOARD, PRACTICE_ADMIN_DASHBOARD];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionTokenCookie = request.cookies.get(SESSION_TOKEN_COOKIE_NAME);
  let user: User | null = null;
  let isAuthenticated = false;

  if (sessionTokenCookie?.value) {
    try {
      const parsedUser = JSON.parse(sessionTokenCookie.value) as User;
      // Basic validation of the parsed user object
      if (parsedUser && parsedUser.id && parsedUser.role) {
        user = parsedUser;
        isAuthenticated = true;
      } else {
        console.warn('[Middleware] Invalid user object in session cookie.');
        // Clear potentially corrupt cookie
        const response = NextResponse.next();
        response.cookies.delete(SESSION_TOKEN_COOKIE_NAME);
        // Potentially redirect to login here if strict, for now treat as unauthenticated
      }
    } catch (error) {
      console.error('[Middleware] Failed to parse session cookie:', error);
      // Clear potentially corrupt cookie
      const response = NextResponse.next();
      response.cookies.delete(SESSION_TOKEN_COOKIE_NAME);
      // Treat as unauthenticated
    }
  }

  // If the user is trying to access the login page
  if (pathname === AUTH_PAGE) {
    if (isAuthenticated && user) {
      let redirectTo = '/'; // Default redirect
      if (user.role === 'ADMINISTRATOR') redirectTo = ADMINISTRATOR_DASHBOARD;
      else if (user.role === 'PRACTICE_ADMINISTRATOR') redirectTo = PRACTICE_ADMIN_DASHBOARD;
      else if (user.role === 'CLIENT') redirectTo = CLIENT_DASHBOARD;
      console.log(`[Middleware] Authenticated user on auth page, redirecting to ${redirectTo}`);
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }
    // Unauthenticated user on auth page, allow access
    return NextResponse.next();
  }

  // Define all protected routes
  const isClientDashboard = pathname === CLIENT_DASHBOARD;
  const isAdminDashboard = pathname === ADMINISTRATOR_DASHBOARD;
  const isPracticeAdminDashboard = pathname === PRACTICE_ADMIN_DASHBOARD;
  const isOtherClientRoute = OTHER_CLIENT_PROTECTED_ROUTES.some(route => pathname.startsWith(route));

  const isProtectedDashboard = isClientDashboard || isAdminDashboard || isPracticeAdminDashboard;
  const isProtectedPath = isProtectedDashboard || isOtherClientRoute;


  if (isProtectedPath) {
    if (!isAuthenticated || !user) {
      const loginUrl = new URL(AUTH_PAGE, request.url);
      loginUrl.searchParams.set('callbackUrl', pathname + request.nextUrl.search);
      console.log(`[Middleware] Unauthenticated user on protected page (${pathname}), redirecting to login.`);
      return NextResponse.redirect(loginUrl);
    }

    // Role-based access control for dashboards
    if (user.role === 'CLIENT') {
      if (isAdminDashboard || isPracticeAdminDashboard) {
        console.log(`[Middleware] Client attempting to access restricted dashboard (${pathname}). Redirecting to client dashboard.`);
        return NextResponse.redirect(new URL(CLIENT_DASHBOARD, request.url));
      }
      // Client is allowed on CLIENT_DASHBOARD and OTHER_CLIENT_PROTECTED_ROUTES
    } else if (user.role === 'ADMINISTRATOR') {
      if (isClientDashboard || isPracticeAdminDashboard || isOtherClientRoute) {
        console.log(`[Middleware] Administrator attempting to access restricted page (${pathname}). Redirecting to admin dashboard.`);
        return NextResponse.redirect(new URL(ADMINISTRATOR_DASHBOARD, request.url));
      }
    } else if (user.role === 'PRACTICE_ADMINISTRATOR') {
      if (isClientDashboard || isAdminDashboard || isOtherClientRoute) {
        console.log(`[Middleware] Practice Admin attempting to access restricted page (${pathname}). Redirecting to practice admin dashboard.`);
        return NextResponse.redirect(new URL(PRACTICE_ADMIN_DASHBOARD, request.url));
      }
    }
  }

  // If none of the above conditions, allow the request to proceed
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.json (PWA manifest)
     * - robots.txt (SEO)
     * - assets (public assets folder)
     * - images (public images folder)
     * - *.png, *.jpg, *.jpeg, *.gif, *.svg (specific image extensions if served from public)
     * This matcher aims to cover page routes.
     */
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|robots.txt|assets|images|.*\\.(?:png|jpg|jpeg|gif|svg)$).*)',
  ],
};
