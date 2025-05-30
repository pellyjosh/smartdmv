module.exports = {

"[externals]/next/dist/compiled/next-server/app-page.runtime.dev.js [external] (next/dist/compiled/next-server/app-page.runtime.dev.js, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page.runtime.dev.js"));

module.exports = mod;
}}),
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

module.exports = mod;
}}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}}),
"[project]/src/actions/authActions.ts [app-ssr] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
/* __next_internal_action_entry_do_not_use__ {"603dcf86c247ba3b1ad3b634f9051d9928b90df1ec":"switchPracticeAction","60b39a56c016027888fed902fc31686ec165948b14":"loginUserAction"} */ __turbopack_context__.s({
    "loginUserAction": (()=>loginUserAction),
    "switchPracticeAction": (()=>switchPracticeAction)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-client-wrapper.js [app-ssr] (ecmascript)");
;
var loginUserAction = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createServerReference"])("60b39a56c016027888fed902fc31686ec165948b14", __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["callServer"], void 0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["findSourceMapURL"], "loginUserAction");
var switchPracticeAction = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createServerReference"])("603dcf86c247ba3b1ad3b634f9051d9928b90df1ec", __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["callServer"], void 0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["findSourceMapURL"], "switchPracticeAction");
}}),
"[project]/src/config/authConstants.ts [app-ssr] (ecmascript)": ((__turbopack_context__) => {
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
"[project]/src/context/UserContext.tsx [app-ssr] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "UserProvider": (()=>UserProvider),
    "useUser": (()=>useUser)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$actions$2f$authActions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/actions/authActions.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$authConstants$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/config/authConstants.ts [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
const AUTH_PAGE = '/auth/login';
const PROTECTED_PATHS_CONFIG = {
    CLIENT: [
        '/client',
        '/favorites',
        '/symptom-checker'
    ],
    ADMINISTRATOR: [
        '/administrator' /* Add other admin specific routes */ 
    ],
    PRACTICE_ADMINISTRATOR: [
        '/practice-administrator' /* Add other practice-admin specific routes */ 
    ]
};
function isPathProtectedForRole(pathname, role) {
    const commonProtectedPaths = [
        '/settings'
    ]; // Example of a path accessible by multiple authenticated roles
    const roleSpecificPaths = PROTECTED_PATHS_CONFIG[role] || [];
    return [
        ...roleSpecificPaths,
        ...commonProtectedPaths
    ].some((protectedPath)=>pathname.startsWith(protectedPath));
}
function isGenerallyProtectedPath(pathname) {
    const allProtectedPaths = Object.values(PROTECTED_PATHS_CONFIG).flat();
    // Add any paths that are protected regardless of role but require auth
    const generalProtected = [
        '/favorites',
        '/symptom-checker',
        '/settings'
    ];
    return [
        ...new Set([
            ...allProtectedPaths,
            ...generalProtected
        ])
    ].some((p)=>pathname.startsWith(p));
}
const UserContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])(undefined);
const setClientCookie = (name, value, days = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$authConstants$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SESSION_MAX_AGE_SECONDS"] / (24 * 60 * 60))=>{
    if (typeof document === 'undefined') return;
    let expires = "";
    if (value) {
        const date = new Date();
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
        expires = "; expires=" + date.toUTCString();
    } else {
        // To delete a cookie, set its Max-Age to 0 or a past date
        expires = "; Max-Age=0";
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax";
    console.log(`[UserContext setClientCookie] Cookie ${name} set/deleted. Value:`, value ? '******' : null);
};
function UserProvider({ children }) {
    const [user, setUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isLoading, setIsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [initialAuthChecked, setInitialAuthChecked] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRouter"])();
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["usePathname"])();
    const fetchUser = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        console.log('[UserContext fetchUser START] Attempting to fetch current user from /api/auth/me');
        // No need to set isLoading true here if it's already true by default or set by caller
        try {
            console.log('[UserContext fetchUser] Calling fetch("/api/auth/me")...');
            const response = await fetch('/api/auth/me');
            console.log('[UserContext fetchUser] fetch("/api/auth/me") response status:', response.status);
            if (response.ok) {
                const userData = await response.json();
                if (userData && userData.id) {
                    setUser(userData);
                    sessionStorage.setItem(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$authConstants$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SESSION_TOKEN_COOKIE_NAME"], JSON.stringify(userData));
                    setClientCookie(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$authConstants$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SESSION_TOKEN_COOKIE_NAME"], JSON.stringify(userData));
                    console.log('[UserContext fetchUser SUCCESS] User fetched and set:', userData.email, userData.role);
                } else {
                    setUser(null);
                    sessionStorage.removeItem(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$authConstants$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SESSION_TOKEN_COOKIE_NAME"]);
                    setClientCookie(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$authConstants$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SESSION_TOKEN_COOKIE_NAME"], null);
                    console.log('[UserContext fetchUser NO_USER] /api/auth/me returned no user or invalid data.');
                }
            } else {
                setUser(null);
                sessionStorage.removeItem(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$authConstants$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SESSION_TOKEN_COOKIE_NAME"]);
                setClientCookie(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$authConstants$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SESSION_TOKEN_COOKIE_NAME"], null);
                console.warn(`[UserContext fetchUser API_FAIL] /api/auth/me call failed, status: ${response.status}`);
            }
        } catch (error) {
            console.error('[UserContext fetchUser CATCH_ERROR] Error fetching current user:', error);
            setUser(null);
            sessionStorage.removeItem(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$authConstants$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SESSION_TOKEN_COOKIE_NAME"]);
            setClientCookie(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$authConstants$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SESSION_TOKEN_COOKIE_NAME"], null);
        } finally{
            setIsLoading(false);
            setInitialAuthChecked(true);
            console.log('[UserContext fetchUser FINALLY] fetchUser finished. isLoading:', false, 'initialAuthChecked:', true);
        }
    }, []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        console.log('[UserContext Mount/Effect] Initializing user state.');
        fetchUser();
    }, [
        fetchUser
    ]);
    const navigateBasedOnRole = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((role)=>{
        console.log(`[UserContext Nav] Navigating based on role: ${role}`);
        let targetPath = '/';
        switch(role){
            case 'CLIENT':
                targetPath = '/client';
                break;
            case 'ADMINISTRATOR':
                targetPath = '/administrator';
                break;
            case 'PRACTICE_ADMINISTRATOR':
                targetPath = '/practice-administrator';
                break;
            default:
                console.warn(`[UserContext Nav] Unknown role for navigation: ${role}`);
                targetPath = '/';
        }
        if (pathname !== targetPath) {
            console.log(`[UserContext Nav Effect EXECUTE] Calling router.replace(${targetPath})`);
            router.replace(targetPath);
        } else {
            console.log(`[UserContext Nav] Already on target path: ${targetPath}`);
        }
    }, [
        router,
        pathname
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        console.log('[UserContext Nav Effect Check] user:', user ? user.email : null, 'initialAuthChecked:', initialAuthChecked, 'pathname:', pathname, 'isLoading:', isLoading);
        if (!isLoading && initialAuthChecked) {
            if (user && pathname === AUTH_PAGE) {
                console.log('[UserContext Nav Effect EXECUTE from Login] User authenticated and on login page. Redirecting. Role:', user.role);
                navigateBasedOnRole(user.role);
            } else if (!user && pathname !== AUTH_PAGE && isGenerallyProtectedPath(pathname)) {
                console.log(`[UserContext Nav Effect EXECUTE to Login] User not authenticated but on a protected page (${pathname}). Redirecting to login.`);
                router.push(AUTH_PAGE);
            }
        } else {
            console.log('[UserContext Nav Effect] Conditions for navigation not met (still loading/checking or path is public).');
        }
    }, [
        user,
        initialAuthChecked,
        pathname,
        isLoading,
        navigateBasedOnRole,
        router
    ]);
    const login = async (emailInput, passwordInput)=>{
        console.log('[UserContext login] Attempting login for:', emailInput);
        setIsLoading(true);
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: emailInput,
                    password: passwordInput
                })
            });
            const data = await response.json();
            if (!response.ok) {
                console.error('[UserContext login] API login failed:', data.error || response.statusText);
                setUser(null);
                sessionStorage.removeItem(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$authConstants$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SESSION_TOKEN_COOKIE_NAME"]);
                setClientCookie(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$authConstants$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SESSION_TOKEN_COOKIE_NAME"], null);
                throw new Error(data.error || `API Error: ${response.status}`);
            }
            const loggedInUser = data.user;
            if (loggedInUser && loggedInUser.id) {
                setUser(loggedInUser);
                sessionStorage.setItem(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$authConstants$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SESSION_TOKEN_COOKIE_NAME"], JSON.stringify(loggedInUser));
                setClientCookie(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$authConstants$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SESSION_TOKEN_COOKIE_NAME"], JSON.stringify(loggedInUser));
                console.log('[UserContext login SUCCESS] Login successful, user set in context:', loggedInUser.email, loggedInUser.role);
                // Navigation is handled by the useEffect watching `user` state
                return loggedInUser;
            }
            console.warn('[UserContext login] API returned ok, but no valid user data.');
            setUser(null);
            sessionStorage.removeItem(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$authConstants$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SESSION_TOKEN_COOKIE_NAME"]);
            setClientCookie(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$authConstants$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SESSION_TOKEN_COOKIE_NAME"], null);
            return null;
        } catch (error) {
            console.error("[UserContext login CATCH_ERROR] Login error:", error);
            setUser(null);
            sessionStorage.removeItem(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$authConstants$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SESSION_TOKEN_COOKIE_NAME"]);
            setClientCookie(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$authConstants$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SESSION_TOKEN_COOKIE_NAME"], null);
            throw error;
        } finally{
            setIsLoading(false);
            setInitialAuthChecked(true);
            console.log('[UserContext login FINALLY] isLoading: false, initialAuthChecked: true');
        }
    };
    const logout = async ()=>{
        console.log('[UserContext logout] Attempting logout.');
        setIsLoading(true);
        try {
            await fetch('/api/auth/logout', {
                method: 'POST'
            });
            console.log('[UserContext logout] API logout call successful.');
        } catch (err) {
            console.error('[UserContext logout CATCH_ERROR] Error calling API to invalidate server session:', err);
        } finally{
            setUser(null);
            sessionStorage.removeItem(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$authConstants$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SESSION_TOKEN_COOKIE_NAME"]);
            setClientCookie(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$authConstants$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SESSION_TOKEN_COOKIE_NAME"], null); // Clear client-side cookie
            setClientCookie(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$authConstants$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME"], null); // Attempt to clear httpOnly cookie (browser might block this)
            setIsLoading(false);
            setInitialAuthChecked(true);
            console.log('[UserContext logout FINALLY] Client state cleared. isLoading: false, initialAuthChecked: true. Redirecting to login.');
            if (pathname !== AUTH_PAGE) {
                router.push(AUTH_PAGE);
            }
        }
    };
    const switchPractice = async (newPracticeId)=>{
        if (user && user.role === 'ADMINISTRATOR') {
            console.log(`[UserContext switchPractice] Admin ${user.email} attempting to switch to practice ${newPracticeId}`);
            setIsLoading(true);
            try {
                const { success, updatedUser } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$actions$2f$authActions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["switchPracticeAction"])(user.id, newPracticeId);
                if (success && updatedUser) {
                    setUser(updatedUser);
                    sessionStorage.setItem(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$authConstants$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SESSION_TOKEN_COOKIE_NAME"], JSON.stringify(updatedUser));
                    setClientCookie(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$authConstants$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SESSION_TOKEN_COOKIE_NAME"], JSON.stringify(updatedUser));
                    console.log('[UserContext switchPractice SUCCESS] Practice switched. New currentPracticeId:', updatedUser.currentPracticeId);
                } else {
                    console.error("[UserContext switchPractice FAIL] Failed to switch practice via server action. Refetching user.");
                    await fetchUser();
                }
            } catch (error) {
                console.error("[UserContext switchPractice CATCH_ERROR] Error switching practice:", error);
                await fetchUser();
            } finally{
                setIsLoading(false);
                console.log('[UserContext switchPractice FINALLY] isLoading set to false.');
            }
        } else {
            console.warn("[UserContext switchPractice] Switch practice called by non-admin or no user.");
        }
    };
    // Render children only after initial auth check is complete to avoid flashes or premature rendering
    if (!initialAuthChecked && isLoading) {
        // You could return a global loading spinner here for the whole app if desired
        // For now, returning null means descendant Client Components might show their own loaders
        return null;
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(UserContext.Provider, {
        value: {
            user,
            isLoading,
            initialAuthChecked,
            login,
            logout,
            switchPractice,
            fetchUser
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/src/context/UserContext.tsx",
        lineNumber: 280,
        columnNumber: 5
    }, this);
}
function useUser() {
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}
}}),
"[project]/src/lib/utils.ts [app-ssr] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "cn": (()=>cn),
    "hexToHslParts": (()=>hexToHslParts)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/clsx/dist/clsx.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/tailwind-merge/dist/bundle-mjs.mjs [app-ssr] (ecmascript)");
;
;
function cn(...inputs) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["twMerge"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clsx"])(inputs));
}
function hexToHslParts(hex) {
    if (!hex) return null;
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
    } else {
        return null; // Invalid hex format
    }
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0; // Default h, s to 0 for achromatic colors
    const l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch(max){
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }
        h /= 6;
    }
    const H = Math.round(h * 360);
    const S = Math.round(s * 100);
    const L = Math.round(l * 100);
    return `${H} ${S}% ${L}%`;
}
}}),
"[project]/src/context/ThemeContext.tsx [app-ssr] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "ThemeProvider": (()=>ThemeProvider),
    "useTheme": (()=>useTheme)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
const ThemeContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])(undefined);
const DEFAULT_PRIMARY_COLOR_HEX = '#009eed';
function ThemeProvider({ children }) {
    const [theme, setTheme] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('light');
    const [primaryColor, setPrimaryColor] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(DEFAULT_PRIMARY_COLOR_HEX);
    const [isThemeMounted, setIsThemeMounted] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false); // Renamed for clarity
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const storedTheme = localStorage.getItem('vetconnectpro-theme');
        const storedPrimaryColor = localStorage.getItem('vetconnectpro-primary-color');
        if (storedTheme) {
            setTheme(storedTheme);
        } else {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            setTheme(prefersDark ? 'dark' : 'light');
        }
        if (storedPrimaryColor) {
            setPrimaryColor(storedPrimaryColor);
        }
        setIsThemeMounted(true); // Set mounted to true after initial load
    }, []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!isThemeMounted) return;
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(theme);
        localStorage.setItem('vetconnectpro-theme', theme);
    }, [
        theme,
        isThemeMounted
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!isThemeMounted) return;
        const primaryHslParts = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hexToHslParts"])(primaryColor);
        if (primaryHslParts) {
            document.documentElement.style.setProperty('--primary', primaryHslParts);
            document.documentElement.style.setProperty('--ring', primaryHslParts);
            document.documentElement.style.setProperty('--sidebar-primary', primaryHslParts);
            document.documentElement.style.setProperty('--sidebar-ring', primaryHslParts);
        }
        localStorage.setItem('vetconnectpro-primary-color', primaryColor);
    }, [
        primaryColor,
        isThemeMounted
    ]);
    // Do not return null here; let ClientOnlyWrapper handle delayed rendering.
    // The ThemeProvider needs to be in the tree for context to be available.
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(ThemeContext.Provider, {
        value: {
            theme,
            setTheme,
            primaryColor,
            setPrimaryColor,
            isThemeMounted
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/src/context/ThemeContext.tsx",
        lineNumber: 68,
        columnNumber: 5
    }, this);
}
function useTheme() {
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
}}),
"[project]/src/components/utils/ClientOnlyWrapper.tsx [app-ssr] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "ClientOnlyWrapper": (()=>ClientOnlyWrapper)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
"use client";
;
;
function ClientOnlyWrapper({ children, fallback = null }) {
    const [hasMounted, setHasMounted] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        setHasMounted(true);
    }, []);
    if (!hasMounted) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
            children: fallback
        }, void 0, false);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
        children: children
    }, void 0, false);
}
}}),

};

//# sourceMappingURL=%5Broot%20of%20the%20server%5D__6e3f34a9._.js.map