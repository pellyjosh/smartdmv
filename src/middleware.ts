
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { User } from '@/hooks/useAuth'; // Adjust path if needed

const MOCK_AUTH_COOKIE_NAME = 'mock-auth-user';

// Helper to parse the user from the cookie
const getUserFromCookie = (request: NextRequest): User | null => {
  const cookie = request.cookies.get(MOCK_AUTH_COOKIE_NAME);
  if (cookie && cookie.value) {
    try {
      return JSON.parse(cookie.value) as User;
    } catch (e) {
      console.error('Error parsing auth cookie in middleware:', e);
      return null;
    }
  }
  return null;
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const user = getUserFromCookie(request);

  const isAuthPage = pathname === '/auth/login';

  // If user is authenticated and tries to access login page, redirect them to their dashboard
  if (user && isAuthPage) {
    let redirectUrl = '/';
    switch (user.role) {
      case 'CLIENT':
        redirectUrl = '/client';
        break;
      case 'ADMINISTRATOR':
        redirectUrl = '/administrator';
        break;
      case 'PRACTICE_ADMINISTRATOR':
        redirectUrl = '/practice-administrator';
        break;
    }
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  // Define protected routes and their required roles
  const protectedRoutesConfig: Record<string, User['role'][]> = {
    '/client': ['CLIENT'],
    '/administrator': ['ADMINISTRATOR'],
    '/practice-administrator': ['PRACTICE_ADMINISTRATOR'],
    '/favorites': ['CLIENT', null], // Assuming null means accessible by guest too, but for now tied to CLIENT if logged in.
    // Add other routes like '/symptom-checker' if they need specific roles or just auth
  };
  
  // Check if the current path starts with any of the protected route prefixes
  const matchedProtectedPath = Object.keys(protectedRoutesConfig).find(path => pathname.startsWith(path));

  if (matchedProtectedPath) {
    // If route is protected
    if (!user) {
      // If no user (not authenticated), redirect to login
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    // User is authenticated, check role access
    const allowedRoles = protectedRoutesConfig[matchedProtectedPath];
    if (!allowedRoles.includes(user.role)) {
      // If user's role is not allowed for this path, redirect to their default dashboard or login
      // For simplicity, redirecting to login. A better UX might be an "Access Denied" page or their own dashboard.
      console.warn(`Role mismatch: User with role ${user.role} tried to access ${pathname}. Redirecting to login.`);
       let userDashboard = '/auth/login'; // Default to login
        switch (user.role) {
            case 'CLIENT': userDashboard = '/client'; break;
            case 'ADMINISTRATOR': userDashboard = '/administrator'; break;
            case 'PRACTICE_ADMINISTRATOR': userDashboard = '/practice-administrator'; break;
        }
        return NextResponse.redirect(new URL(userDashboard, request.url));
    }
  }

  // Allow the request to proceed if none ofthe above conditions are met
  return NextResponse.next();
}

// Specify which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - assets (if you have a public assets folder)
     * - public (if you serve static files directly from public, though typically handled by Next.js implicitly)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|assets|public).*)',
  ],
};
