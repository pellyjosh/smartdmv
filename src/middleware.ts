
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { User } from '@/hooks/useAuth'; 

const MOCK_AUTH_COOKIE_NAME = 'mock-auth-user';

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

  const protectedRoutesConfig: Record<string, Array<User['role'] | null>> = {
    '/client': ['CLIENT'],
    '/administrator': ['ADMINISTRATOR'],
    '/practice-administrator': ['PRACTICE_ADMINISTRATOR'],
    '/favorites': ['CLIENT', null], 
  };
  
  const matchedProtectedPath = Object.keys(protectedRoutesConfig).find(path => pathname.startsWith(path));

  if (matchedProtectedPath) {
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    const allowedRoles = protectedRoutesConfig[matchedProtectedPath];
    if (!allowedRoles.includes(user.role)) {
      console.warn(`Role mismatch: User with role ${user.role} tried to access ${pathname}. Redirecting.`);
       let userDashboard = '/auth/login'; 
        switch (user.role) {
            case 'CLIENT': userDashboard = '/client'; break;
            case 'ADMINISTRATOR': userDashboard = '/administrator'; break;
            case 'PRACTICE_ADMINISTRATOR': userDashboard = '/practice-administrator'; break;
        }
        return NextResponse.redirect(new URL(userDashboard, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|assets|public).*)',
  ],
};
