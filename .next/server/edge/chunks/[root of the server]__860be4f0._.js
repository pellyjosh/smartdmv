(globalThis.TURBOPACK = globalThis.TURBOPACK || []).push(["chunks/[root of the server]__860be4f0._.js", {

"[externals]/node:async_hooks [external] (node:async_hooks, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}}),
"[externals]/node:buffer [external] (node:buffer, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}}),
"[project]/src/middleware.ts [middleware-edge] (ecmascript)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
// import { NextResponse } from 'next/server';
// import type { NextRequest } from 'next/server';
// import { SESSION_TOKEN_COOKIE_NAME, HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME } from '@/config/authConstants';
// import type { User } from '@/context/UserContext'; // Use User types from UserContext
// const AUTH_PAGE = '/auth/login';
// // Define dashboard paths
// const CLIENT_DASHBOARD = '/client';
// const ADMINISTRATOR_DASHBOARD = '/administrator';
// const PRACTICE_ADMIN_DASHBOARD = '/practice-administrator';
// // Other protected routes
// const OTHER_CLIENT_PROTECTED_ROUTES = ['/favorites', '/symptom-checker']; 
// export async function middleware(request: NextRequest) {
//   const { pathname } = request.nextUrl;
//   const httpOnlySessionToken = request.cookies.get(HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME)?.value;
//   const clientUserSessionCookie = request.cookies.get(SESSION_TOKEN_COOKIE_NAME)?.value;
//   let userFromClientCookie: User | null = null;
//   let isClientCookieValid = false;
//   if (clientUserSessionCookie) {
//     try {
//       const parsedUser = JSON.parse(clientUserSessionCookie) as User;
//       if (parsedUser && parsedUser.id && parsedUser.role) {
//         userFromClientCookie = parsedUser;
//         isClientCookieValid = true;
//       } else {
//         console.warn('[Middleware] Invalid user object in client session cookie.');
//       }
//     } catch (error) {
//       console.error('[Middleware] Failed to parse client session cookie:', error);
//     }
//   }
//   const isServerAuthenticated = !!httpOnlySessionToken; 
//   if (pathname === AUTH_PAGE) {
//     if (isServerAuthenticated && isClientCookieValid && userFromClientCookie) {
//       let redirectTo = '/'; 
//       if (userFromClientCookie.role === 'ADMINISTRATOR') redirectTo = ADMINISTRATOR_DASHBOARD;
//       else if (userFromClientCookie.role === 'PRACTICE_ADMINISTRATOR') redirectTo = PRACTICE_ADMIN_DASHBOARD;
//       else if (userFromClientCookie.role === 'CLIENT') redirectTo = CLIENT_DASHBOARD;
//       console.log(`[Middleware] Authenticated user (${userFromClientCookie.email} - ${userFromClientCookie.role}) on auth page, redirecting to ${redirectTo}`);
//       return NextResponse.redirect(new URL(redirectTo, request.url));
//     }
//     return NextResponse.next();
//   }
//   const isClientDashboard = pathname === CLIENT_DASHBOARD;
//   const isAdminDashboard = pathname === ADMINISTRATOR_DASHBOARD;
//   const isPracticeAdminDashboard = pathname === PRACTICE_ADMIN_DASHBOARD;
//   const isOtherClientRoute = OTHER_CLIENT_PROTECTED_ROUTES.some(route => pathname.startsWith(route));
//   const isProtectedPath = isClientDashboard || isAdminDashboard || isPracticeAdminDashboard || isOtherClientRoute;
//   if (isProtectedPath) {
//     if (!isServerAuthenticated) {
//       const loginUrl = new URL(AUTH_PAGE, request.url);
//       loginUrl.searchParams.set('callbackUrl', pathname + request.nextUrl.search);
//       console.log(`[Middleware] No server session token for protected page (${pathname}), redirecting to login.`);
//       return NextResponse.redirect(loginUrl);
//     }
//     if (!isClientCookieValid || !userFromClientCookie) {
//       // Server session exists, but client cookie for role check is missing/invalid.
//       // This could lead to a loop if UserProvider hasn't hydrated yet.
//       // For now, we will redirect to login if role info isn't available for authorization.
//       // A more sophisticated approach might involve a "session check" page or an API call here,
//       // but that adds complexity.
//       console.warn(`[Middleware] Server session token exists, but client cookie missing/invalid for protected page (${pathname}). Attempting to allow UserProvider to load or redirecting to login.`);
//        const loginUrl = new URL(AUTH_PAGE, request.url);
//        loginUrl.searchParams.set('callbackUrl', pathname + request.nextUrl.search);
//        return NextResponse.redirect(loginUrl);
//     }
//     // Both server session and client user details are available. Perform role-based access control.
//     const userRole = userFromClientCookie.role;
//     if (userRole === 'CLIENT') {
//       if (isAdminDashboard || isPracticeAdminDashboard) {
//         console.log(`[Middleware] Client (${userFromClientCookie.email}) attempting restricted dashboard (${pathname}). Redirecting to client dashboard.`);
//         return NextResponse.redirect(new URL(CLIENT_DASHBOARD, request.url));
//       }
//     } else if (userRole === 'ADMINISTRATOR') {
//       if (isClientDashboard || isPracticeAdminDashboard || isOtherClientRoute) {
//         console.log(`[Middleware] Administrator (${userFromClientCookie.email}) attempting restricted page (${pathname}). Redirecting to admin dashboard.`);
//         return NextResponse.redirect(new URL(ADMINISTRATOR_DASHBOARD, request.url));
//       }
//     } else if (userRole === 'PRACTICE_ADMINISTRATOR') {
//       if (isClientDashboard || isAdminDashboard || isOtherClientRoute) {
//         console.log(`[Middleware] Practice Admin (${userFromClientCookie.email}) attempting restricted page (${pathname}). Redirecting to practice admin dashboard.`);
//         return NextResponse.redirect(new URL(PRACTICE_ADMIN_DASHBOARD, request.url));
//       }
//     } else {
//         // Unknown role in client cookie, treat as unauthorized for protected paths
//         console.warn(`[Middleware] Unknown role in client cookie: ${userRole}. Redirecting to login.`);
//         const loginUrl = new URL(AUTH_PAGE, request.url);
//         loginUrl.searchParams.set('callbackUrl', pathname + request.nextUrl.search);
//         return NextResponse.redirect(loginUrl);
//     }
//   }
//   return NextResponse.next();
// }
// export const config = {
//   matcher: [
//     '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|robots.txt|assets|images|.*\\.(?:png|jpg|jpeg|gif|svg)$).*)',
//   ],
// };
}}),
}]);

//# sourceMappingURL=%5Broot%20of%20the%20server%5D__860be4f0._.js.map