
'use client';

import type { Dispatch, ReactNode, SetStateAction } from 'react';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { switchPracticeAction } from '@/actions/authActions';
import { SESSION_TOKEN_COOKIE_NAME, HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/config/authConstants';

// Define User types
export interface BaseUser {
  id: string;
  email: string;
  name?: string;
}

export interface ClientUser extends BaseUser {
  role: 'CLIENT';
  practiceId: string;
}

export interface PracticeAdminUser extends BaseUser {
  role: 'PRACTICE_ADMINISTRATOR';
  practiceId: string;
}

export interface AdministratorUser extends BaseUser {
  role: 'ADMINISTRATOR';
  accessiblePracticeIds: string[];
  currentPracticeId: string;
}

export type User = ClientUser | PracticeAdminUser | AdministratorUser;

const AUTH_PAGE = '/auth/login'; // Define for use within UserContext for navigation checks

// Helper function to define protected paths (can be expanded)
const PROTECTED_PATHS = [
  '/client',
  '/administrator',
  '/practice-administrator',
  '/favorites',
  '/symptom-checker',
  // Add other main app routes here that require authentication
];

function isPathProtected(pathname: string): boolean {
  return PROTECTED_PATHS.some(protectedPath => pathname.startsWith(protectedPath));
}


interface UserContextType {
  user: User | null;
  isLoading: boolean;
  initialAuthChecked: boolean;
  login: (emailInput: string, passwordInput: string) => Promise<User | null>;
  logout: () => Promise<void>;
  switchPractice?: (newPracticeId: string) => Promise<void>;
  fetchUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const setClientCookie = (name: string, value: string | null, days: number = SESSION_MAX_AGE_SECONDS / (24 * 60 * 60)) => {
  if (typeof document === 'undefined') return;
  let expires = "";
  if (value) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  } else {
    expires = "; Max-Age=0"; // More reliable for deletion
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax";
  console.log(`[UserContext setClientCookie] Cookie ${name} set/deleted. Value:`, value ? '******' : null);
};


export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start true, as we'll fetch user
  const [initialAuthChecked, setInitialAuthChecked] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const fetchUser = useCallback(async () => {
    console.log('[UserContext fetchUser START] Attempting to fetch current user from /api/auth/me');
    setIsLoading(true);
    // setInitialAuthChecked(false); // Keep initialAuthChecked false until fetch completes.
    try {
      console.log('[UserContext fetchUser] Calling fetch("/api/auth/me")...');
      const response = await fetch('/api/auth/me');
      console.log('[UserContext fetchUser] fetch("/api/auth/me") response status:', response.status);

      if (response.ok) {
        const userData: User | null = await response.json();
        if (userData && userData.id) {
          setUser(userData);
          sessionStorage.setItem(SESSION_TOKEN_COOKIE_NAME, JSON.stringify(userData));
          setClientCookie(SESSION_TOKEN_COOKIE_NAME, JSON.stringify(userData));
          console.log('[UserContext fetchUser SUCCESS] User fetched and set:', userData.email, userData.role);
        } else {
          setUser(null);
          sessionStorage.removeItem(SESSION_TOKEN_COOKIE_NAME);
          setClientCookie(SESSION_TOKEN_COOKIE_NAME, null);
          console.log('[UserContext fetchUser NO_USER] /api/auth/me returned no user or invalid data.');
        }
      } else {
        setUser(null);
        sessionStorage.removeItem(SESSION_TOKEN_COOKIE_NAME);
        setClientCookie(SESSION_TOKEN_COOKIE_NAME, null);
        console.warn(`[UserContext fetchUser API_FAIL] /api/auth/me call failed, status: ${response.status}`);
      }
    } catch (error) {
      console.error('[UserContext fetchUser CATCH_ERROR] Error fetching current user:', error);
      setUser(null);
      sessionStorage.removeItem(SESSION_TOKEN_COOKIE_NAME);
      setClientCookie(SESSION_TOKEN_COOKIE_NAME, null);
    } finally {
      setIsLoading(false);
      setInitialAuthChecked(true);
      console.log('[UserContext fetchUser FINALLY] fetchUser finished. isLoading:', false, 'initialAuthChecked:', true);
    }
  }, []); // Empty dependency array is correct for a function called on mount or imperatively.

  useEffect(() => {
    console.log('[UserContext Mount/Effect] Initializing user state.');
    // Attempt to load from sessionStorage for faster perceived load, but prioritize server validation
    const storedUserString = sessionStorage.getItem(SESSION_TOKEN_COOKIE_NAME);
    if (storedUserString) {
        try {
            const storedUser = JSON.parse(storedUserString) as User;
            if(storedUser && storedUser.id) {
                console.log('[UserContext Mount/Effect] Found user in sessionStorage (temporary):', storedUser.email);
                // setUser(storedUser); // Avoid setting user from sessionStorage directly to prevent flicker if /api/auth/me says otherwise
            }
        } catch (e) {
            console.error('[UserContext Mount/Effect] Error parsing sessionStorage user:', e);
            sessionStorage.removeItem(SESSION_TOKEN_COOKIE_NAME);
        }
    }
    fetchUser(); // Always fetch from server to validate session
  }, [fetchUser]);

  const navigateBasedOnRole = useCallback((role: User['role']) => {
    console.log(`[UserContext Nav] Navigating based on role: ${role}`);
    let targetPath = '/'; // Default
    switch (role) {
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
        targetPath = '/'; // Or AUTH_PAGE if preferred fallback for unknown roles
    }
    if (pathname !== targetPath) {
        router.push(targetPath);
    } else {
        console.log(`[UserContext Nav] Already on target path: ${targetPath}`);
    }
  }, [router, pathname]);

  useEffect(() => {
    console.log('[UserContext Nav Effect Check] user:', user ? user.email : null, 'initialAuthChecked:', initialAuthChecked, 'pathname:', pathname, 'isLoading:', isLoading);
    if (!isLoading && initialAuthChecked) {
      if (user && pathname === AUTH_PAGE) {
        console.log('[UserContext Nav Effect EXECUTE] User authenticated and on login page. Redirecting. Role:', user.role);
        navigateBasedOnRole(user.role);
      } else if (!user && pathname !== AUTH_PAGE && isPathProtected(pathname)) {
        console.log(`[UserContext Nav Effect EXECUTE] User not authenticated but on a protected page (${pathname}). Redirecting to login.`);
        if (pathname !== AUTH_PAGE) { // Avoid redundant push if already somehow on login
            router.push(AUTH_PAGE);
        }
      }
    } else {
        console.log('[UserContext Nav Effect] Conditions for navigation not met (still loading/checking or path is public).');
    }
  }, [user, initialAuthChecked, pathname, isLoading, navigateBasedOnRole, router]);

  const login = async (emailInput: string, passwordInput: string): Promise<User | null> => {
    console.log('[UserContext login] Attempting login for:', emailInput);
    setIsLoading(true);
    // setInitialAuthChecked(false); // Don't reset initialAuthChecked during login, fetchUser will handle it.
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, password: passwordInput }),
      });
      const data = await response.json();

      if (!response.ok) {
        console.error('[UserContext login] API login failed:', data.error || response.statusText);
        setUser(null); // Clear user on failed login
        sessionStorage.removeItem(SESSION_TOKEN_COOKIE_NAME);
        setClientCookie(SESSION_TOKEN_COOKIE_NAME, null);
        throw new Error(data.error || `API Error: ${response.status}`);
      }
      
      const loggedInUser = data.user as User;
      if (loggedInUser && loggedInUser.id) {
        setUser(loggedInUser); // Set user state from API response
        sessionStorage.setItem(SESSION_TOKEN_COOKIE_NAME, JSON.stringify(loggedInUser));
        setClientCookie(SESSION_TOKEN_COOKIE_NAME, JSON.stringify(loggedInUser));
        console.log('[UserContext login SUCCESS] Login successful, user set in context:', loggedInUser.email, loggedInUser.role);
        // The useEffect watching `user` state will handle navigation
        return loggedInUser;
      }
      console.warn('[UserContext login] API returned ok, but no valid user data.');
      setUser(null); // Ensure user is null if API response is not as expected
      sessionStorage.removeItem(SESSION_TOKEN_COOKIE_NAME);
      setClientCookie(SESSION_TOKEN_COOKIE_NAME, null);
      return null;
    } catch (error) {
      console.error("[UserContext login CATCH_ERROR] Login error:", error);
      setUser(null); 
      sessionStorage.removeItem(SESSION_TOKEN_COOKIE_NAME);
      setClientCookie(SESSION_TOKEN_COOKIE_NAME, null);
      throw error; 
    } finally {
      setIsLoading(false);
      // Crucially, ensure initialAuthChecked is true after a login attempt,
      // so that the navigation useEffect can correctly evaluate its conditions.
      setInitialAuthChecked(true);
      console.log('[UserContext login FINALLY] isLoading: false, initialAuthChecked: true');
    }
  };

  const logout = async () => {
    console.log('[UserContext logout] Attempting logout.');
    setIsLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      console.log('[UserContext logout] API logout call successful.');
    } catch (err) {
      console.error('[UserContext logout CATCH_ERROR] Error calling API to invalidate server session:', err);
    } finally {
      setUser(null);
      sessionStorage.removeItem(SESSION_TOKEN_COOKIE_NAME);
      setClientCookie(SESSION_TOKEN_COOKIE_NAME, null);
      setIsLoading(false);
      setInitialAuthChecked(true); 
      console.log('[UserContext logout FINALLY] Client state cleared. isLoading: false, initialAuthChecked: true. Redirecting to login.');
      if (pathname !== AUTH_PAGE) {
        router.push(AUTH_PAGE);
      }
    }
  };

  const switchPractice = async (newPracticeId: string) => {
    if (user && user.role === 'ADMINISTRATOR') {
      console.log(`[UserContext switchPractice] Admin ${user.email} attempting to switch to practice ${newPracticeId}`);
      setIsLoading(true);
      try {
        const { success, updatedUser } = await switchPracticeAction(user.id, newPracticeId);
        if (success && updatedUser) {
          setUser(updatedUser); // Update context with new user details (including new currentPracticeId)
          sessionStorage.setItem(SESSION_TOKEN_COOKIE_NAME, JSON.stringify(updatedUser));
          setClientCookie(SESSION_TOKEN_COOKIE_NAME, JSON.stringify(updatedUser));
          console.log('[UserContext switchPractice SUCCESS] Practice switched. New currentPracticeId:', updatedUser.currentPracticeId);
        } else {
          console.error("[UserContext switchPractice FAIL] Failed to switch practice via server action. Refetching user.");
           await fetchUser(); // Fallback to refetch to ensure context consistency
        }
      } catch (error) {
        console.error("[UserContext switchPractice CATCH_ERROR] Error switching practice:", error);
        await fetchUser(); // Fallback
      } finally {
        setIsLoading(false);
        console.log('[UserContext switchPractice FINALLY] isLoading set to false.');
      }
    } else {
      console.warn("[UserContext switchPractice] Switch practice called by non-admin or no user.")
    }
  };


  return (
    <UserContext.Provider value={{ user, isLoading, initialAuthChecked, login, logout, switchPractice, fetchUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

