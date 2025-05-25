
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

  if (pathname === '/auth') {
    console.log('[Middleware] Path is /auth, redirecting to /auth/login');
    return NextResponse.redirect(new URL(AUTH_PAGE, request.url));
  }

  // Logic for routing authenticated users FROM the login page
  if (pathname === AUTH_PAGE) {
    if (isServerAuthenticated && isClientCookieValid && userFromClientCookie) {
      let redirectTo = '/'; // Default redirect path after login is now the home page
      // Or, if you still want to redirect to specific dashboards immediately after login, uncomment below
      // if (userFromClientCookie.role === 'ADMINISTRATOR') redirectTo = ADMINISTRATOR_DASHBOARD;
      // else if (userFromClientCookie.role === 'PRACTICE_ADMINISTRATOR') redirectTo = PRACTICE_ADMIN_DASHBOARD;
      // else if (userFromClientCookie.role === 'CLIENT') redirectTo = CLIENT_DASHBOARD;
      console.log(`[Middleware] Authenticated user (${userFromClientCookie.email}) on auth page, will be handled by client-side redirect to ${redirectTo}`);
      // Let client-side UserContext handle redirect from login page
    }
    return NextResponse.next(); // Allow access to login page
  }

  // Logic for protecting other routes and role-based access control
  const isClientDashboard = pathname.startsWith(CLIENT_DASHBOARD);
  const isAdminDashboard = pathname.startsWith(ADMINISTRATOR_DASHBOARD);
  const isPracticeAdminDashboard = pathname.startsWith(PRACTICE_ADMIN_DASHBOARD);
  const isOtherClientRoute = OTHER_CLIENT_PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  
  // Any path other than '/' or '/auth/login' that isn't an asset.
  const isPotentiallyProtectedPage = pathname !== '/' && 
                                   pathname !== AUTH_PAGE && 
                                   !pathname.startsWith('/api') && 
                                   !pathname.startsWith('/_next') &&
                                   !pathname.includes('.'); // Basic check for assets

  // More specific check for actual protected application pages
  const isExplicitlyProtectedPath = isClientDashboard || isAdminDashboard || isPracticeAdminDashboard || isOtherClientRoute;


  if (isExplicitlyProtectedPath) {
    if (!isServerAuthenticated) {
      const loginUrl = new URL(AUTH_PAGE, request.url);
      loginUrl.searchParams.set('callbackUrl', pathname + request.nextUrl.search);
      console.log(`[Middleware] No server session token for protected page (${pathname}), redirecting to login.`);
      return NextResponse.redirect(loginUrl);
    }

    if (!isClientCookieValid || !userFromClientCookie) {
      console.warn(`[Middleware] Server session token exists, but client cookie missing/invalid for protected page (${pathname}). Allowing request to proceed for UserContext to validate via /api/auth/me.`);
      return NextResponse.next();
    }

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

  // For the root path `/`, do not redirect if authenticated. Let the page component handle role-based content.
  if (pathname === '/') {
     console.log(`[Middleware] Accessing root path /. Allowing request to proceed.`);
     return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|robots.txt|assets|images|.*\\.(?:png|jpg|jpeg|gif|svg)$).*)',
  ],
};
