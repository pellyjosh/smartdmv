(globalThis.TURBOPACK = globalThis.TURBOPACK || []).push(["chunks/[root of the server]__97d3c91d._.js", {

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
"[project]/src/config/authConstants.ts [middleware-edge] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME": (()=>HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME),
    "SESSION_MAX_AGE_SECONDS": (()=>SESSION_MAX_AGE_SECONDS),
    "SESSION_TOKEN_COOKIE_NAME": (()=>SESSION_TOKEN_COOKIE_NAME)
});
const SESSION_TOKEN_COOKIE_NAME = 'smartdvm-user-session'; // Client-readable cookie with user object
const HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME = 'session_token'; // Server-set HttpOnly cookie (session ID)
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days in seconds
}}),
"[project]/src/middleware.ts [middleware-edge] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "config": (()=>config),
    "middleware": (()=>middleware)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/api/server.js [middleware-edge] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/server/web/spec-extension/response.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$authConstants$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/config/authConstants.ts [middleware-edge] (ecmascript)");
;
;
const AUTH_PAGE = '/auth/login';
const ACCESS_DENIED_PAGE = '/access-denied';
// Define dashboard paths
const CLIENT_DASHBOARD = '/client';
const ADMINISTRATOR_DASHBOARD = '/administrator';
const PRACTICE_ADMIN_DASHBOARD = '/practice-administrator';
// Other protected routes (relevant for access control, not initial login redirect)
const OTHER_CLIENT_PROTECTED_ROUTES = [
    '/favorites',
    '/symptom-checker'
];
async function middleware(request) {
    const { pathname } = request.nextUrl;
    const httpOnlySessionToken = request.cookies.get(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$authConstants$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME"])?.value;
    const clientUserSessionCookie = request.cookies.get(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$authConstants$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["SESSION_TOKEN_COOKIE_NAME"])?.value;
    let userFromClientCookie = null;
    let isClientCookieValid = false;
    if (clientUserSessionCookie) {
        try {
            const parsedUser = JSON.parse(clientUserSessionCookie);
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
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL(AUTH_PAGE, request.url));
    }
    // 2. Handle the login page itself
    if (pathname === AUTH_PAGE) {
        if (isServerAuthenticated && isClientCookieValid && userFromClientCookie) {
            console.log(`[Middleware] Authenticated user (${userFromClientCookie.email}) on auth page. Allowing request for client-side redirect from UserContext.`);
        // UserContext will handle redirecting away from login if authenticated
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
    }
    // 3. Handle the access denied page itself
    if (pathname === ACCESS_DENIED_PAGE) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
    }
    // 4. Handle root path ('/')
    if (pathname === '/') {
        if (!isServerAuthenticated) {
            console.log(`[Middleware] Unauthenticated user on root path. Redirecting to login.`);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL(AUTH_PAGE, request.url));
        }
        // Authenticated users get redirected to their specific dashboards from root
        if (isClientCookieValid && userFromClientCookie) {
            const userRole = userFromClientCookie.role;
            console.log(`[Middleware] Authenticated user (${userFromClientCookie.email} - ${userRole}) on root path. Redirecting to their dashboard.`);
            if (userRole === 'ADMINISTRATOR') return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL(ADMINISTRATOR_DASHBOARD, request.url));
            if (userRole === 'PRACTICE_ADMINISTRATOR') return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL(PRACTICE_ADMIN_DASHBOARD, request.url));
            if (userRole === 'CLIENT') return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL(CLIENT_DASHBOARD, request.url));
            // Fallback for unknown role
            console.warn(`[Middleware] Unknown role ${userRole} for authenticated user on root path. Redirecting to ${ACCESS_DENIED_PAGE}.`);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL(ACCESS_DENIED_PAGE, request.url));
        }
        // If server authenticated but client cookie is pending/invalid, let UserContext handle it on client for /
        // This allows UserContext to fetch user details via /api/auth/me
        console.log(`[Middleware] Server-authenticated user on root path, client cookie pending. Allowing request for UserContext to resolve.`);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
    }
    // 5. Handle other explicitly protected paths
    const isClientDashboard = pathname.startsWith(CLIENT_DASHBOARD);
    const isAdminDashboard = pathname.startsWith(ADMINISTRATOR_DASHBOARD);
    const isPracticeAdminDashboard = pathname.startsWith(PRACTICE_ADMIN_DASHBOARD);
    const isOtherClientRoute = OTHER_CLIENT_PROTECTED_ROUTES.some((route)=>pathname.startsWith(route));
    const isExplicitlyProtectedPath = isClientDashboard || isAdminDashboard || isPracticeAdminDashboard || isOtherClientRoute;
    if (isExplicitlyProtectedPath) {
        if (!isServerAuthenticated) {
            const loginUrl = new URL(AUTH_PAGE, request.url);
            loginUrl.searchParams.set('callbackUrl', pathname + request.nextUrl.search);
            console.log(`[Middleware] No server session token for protected page (${pathname}), redirecting to login.`);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(loginUrl);
        }
        // Server session token exists. Now check if we have client cookie for role-based authorization.
        if (!isClientCookieValid || !userFromClientCookie) {
            // Server session token exists, but client cookie (with role) is missing/invalid.
            // Allow the request to proceed. UserContext on the page will call /api/auth/me.
            // If /api/auth/me fails, UserContext will redirect to login.
            // If /api/auth/me succeeds, UserContext populates, and client-side role checks occur.
            console.warn(`[Middleware] Server session token exists, but client cookie missing/invalid for protected page (${pathname}). Allowing request to proceed for UserContext to handle.`);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
        }
        // Both server session token and client user details are available. Perform role-based access control.
        const userRole = userFromClientCookie.role;
        if (userRole === 'CLIENT') {
            if (isAdminDashboard || isPracticeAdminDashboard) {
                console.log(`[Middleware] Client (${userFromClientCookie.email}) attempting restricted dashboard (${pathname}). Redirecting to ${ACCESS_DENIED_PAGE}.`);
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL(ACCESS_DENIED_PAGE, request.url));
            }
        } else if (userRole === 'ADMINISTRATOR') {
            if (isClientDashboard || isPracticeAdminDashboard || isOtherClientRoute) {
                console.log(`[Middleware] Administrator (${userFromClientCookie.email}) attempting restricted page (${pathname}). Redirecting to ${ACCESS_DENIED_PAGE}.`);
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL(ACCESS_DENIED_PAGE, request.url));
            }
        } else if (userRole === 'PRACTICE_ADMINISTRATOR') {
            if (isClientDashboard || isAdminDashboard || isOtherClientRoute) {
                console.log(`[Middleware] Practice Admin (${userFromClientCookie.email}) attempting restricted page (${pathname}). Redirecting to ${ACCESS_DENIED_PAGE}.`);
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL(ACCESS_DENIED_PAGE, request.url));
            }
        } else {
            console.warn(`[Middleware] Unknown role in client cookie: ${userRole} for protected path ${pathname}. Redirecting to ${ACCESS_DENIED_PAGE}.`);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL(ACCESS_DENIED_PAGE, request.url));
        }
    }
    // If path is not explicitly protected and not login/denied, allow it.
    console.log(`[Middleware] Path ${pathname} not explicitly handled by auth checks. Allowing request.`);
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
}
const config = {
    matcher: [
        // Apply middleware to all paths except API routes, static files, images, etc.
        '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|robots.txt|assets|images|.*\\.(?:png|jpg|jpeg|gif|svg)$).*)'
    ]
};
}}),
}]);

//# sourceMappingURL=%5Broot%20of%20the%20server%5D__97d3c91d._.js.map