
'use client';

import type { Dispatch, ReactNode, SetStateAction } from 'react';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { switchPracticeAction } from '@/actions/authActions';
import { SESSION_TOKEN_COOKIE_NAME, HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME } from '@/config/authConstants';

// Define User types
export interface BaseUser {
  id: string;
  email: string;
  name?: string;
  companyId?: string; // Add company context for multi-tenancy
  username?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
}

export interface ClientUser extends BaseUser {
  role: 'CLIENT';
  practiceId: string;
  companyId: string; // Required for tenant users
}

export interface PracticeAdminUser extends BaseUser {
  role: 'PRACTICE_ADMINISTRATOR';
  practiceId: string;
  companyId: string; // Required for tenant users
}

export interface VeterinarianUser extends BaseUser {
  role: 'VETERINARIAN';
  practiceId: string;
  companyId: string; // Required for tenant users
}

export interface PracticeManagerUser extends BaseUser {
  role: 'PRACTICE_MANAGER';
  practiceId: string;
  companyId: string; // Required for tenant users
}

export interface AdministratorUser extends BaseUser {
  role: 'ADMINISTRATOR';
  accessiblePracticeIds: string[];
  currentPracticeId: string;
  companyId: string; // Required for tenant users
}

export interface SuperAdminUser extends BaseUser {
  role: 'SUPER_ADMIN';
  accessiblePracticeIds: string[];
  currentPracticeId: string;
  companyId: string; // Required for tenant users
}

// Owner user types (for platform management)
export interface OwnerUser extends BaseUser {
  role: 'OWNER';
  // No companyId - owners manage multiple companies
}

export interface CompanyAdminUser extends BaseUser {
  role: 'COMPANY_ADMIN';
  companyId: string; // Company they manage
}

export type User = ClientUser | PracticeAdminUser | AdministratorUser | SuperAdminUser | VeterinarianUser | PracticeManagerUser | OwnerUser | CompanyAdminUser;

const AUTH_PAGE = '/auth/login';

// Helper function to define protected paths
const PROTECTED_PATHS = [
  '/client',
  '/administrator',
  '/practice-administrator',
  '/favorites',
  '/symptom-checker',
  '/owner', // Add owner management paths
  '/company-management',
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

const setClientCookie = (name: string, value: string | null, days: number = 7) => {
  if (typeof document === 'undefined') return;
  let expires = "";
  if (value) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  } else {
    expires = "; Max-Age=0"; // Preferred way to delete a cookie
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax";
  console.log(`[UserContext setClientCookie] Cookie ${name} ${value ? 'set' : 'deleted'}.`);
};


export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // True by default until first fetchUser completes
  const [initialAuthChecked, setInitialAuthChecked] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const fetchUser = useCallback(async () => {
    console.log('[UserContext fetchUser START] Attempting to fetch current user from /api/auth/me. Current path:', pathname);
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/me');
      console.log('[UserContext fetchUser] /api/auth/me response status:', response.status);

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
        console.warn(`[UserContext fetchUser API_FAIL] /api/auth/me call failed, status: ${response.status}. Setting user to null.`);
        
        // If it's a 401, redirect to login with session expired message
        if (response.status === 401) {
          console.log('[UserContext fetchUser] Session expired, redirecting to login');
          window.location.href = '/auth/login?error=session_expired';
          return;
        }
      }
    } catch (error) {
      console.error('[UserContext fetchUser CATCH_ERROR] Error fetching current user:', error);
      setUser(null);
      sessionStorage.removeItem(SESSION_TOKEN_COOKIE_NAME);
      setClientCookie(SESSION_TOKEN_COOKIE_NAME, null);
    } finally {
      setIsLoading(false);
      setInitialAuthChecked(true);
      console.log('[UserContext fetchUser FINALLY] fetchUser finished. isLoading:', false, 'initialAuthChecked:', true, 'User set to:', user ? user.email : 'null');
    }
  }, [pathname]); // pathname dependency ensures fetchUser can react to path changes if needed.

  useEffect(() => {
    console.log('[UserContext Mount/Effect] Initializing user state. Calling fetchUser.');
    fetchUser();
  }, [fetchUser]);

  const navigateBasedOnRole = useCallback((role: User['role']) => {
    console.log(`[UserContext Nav] Navigating based on role: ${role}. Current pathname: ${pathname}`);
    let targetPath = '/'; // Default to root, which itself might redirect
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
        console.warn(`[UserContext Nav] Unknown role for navigation: ${role}. Redirecting to login.`);
        targetPath = AUTH_PAGE;
    }
    
    if (pathname !== targetPath) {
        console.log(`[UserContext Nav] Redirecting to: ${targetPath}`);
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
        // This check ensures we only redirect if it's a protected path and not already login
        console.log(`[UserContext Nav Effect EXECUTE] User not authenticated but on a protected page (${pathname}). Redirecting to login.`);
        router.push(AUTH_PAGE);
      }
    } else {
        console.log('[UserContext Nav Effect] Conditions for navigation not met (still loading/checking or path is public/login with no user).');
    }
  }, [user, initialAuthChecked, pathname, isLoading, navigateBasedOnRole, router]);

  const login = async (emailInput: string, passwordInput: string): Promise<User | null> => {
    console.log('[UserContext login] Attempting login for:', emailInput);
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, password: passwordInput }),
      });
      const data = await response.json();

      if (!response.ok) {
        console.error('[UserContext login] API login failed:', data.error || response.statusText);
        setUser(null);
        sessionStorage.removeItem(SESSION_TOKEN_COOKIE_NAME);
        setClientCookie(SESSION_TOKEN_COOKIE_NAME, null);
        throw new Error(data.error || `API Error: ${response.status}`);
      }
      
      const userData = data.user as User;
      if (userData && userData.id) {
        setUser(userData);
        sessionStorage.setItem(SESSION_TOKEN_COOKIE_NAME, JSON.stringify(userData));
        setClientCookie(SESSION_TOKEN_COOKIE_NAME, JSON.stringify(userData));
        console.log('[UserContext login SUCCESS] Login successful, user set in context:', userData.email, userData.role);
        return userData;
      }
      console.warn('[UserContext login] API returned ok, but no valid user data.');
      setUser(null);
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
      setInitialAuthChecked(true); 
      console.log('[UserContext login FINALLY] isLoading: false, initialAuthChecked: true');
    }
  };

  const logout = async () => {
    console.log('[UserContext logout] Attempting logout.');
    setIsLoading(true);
    try {
      const apiResponse = await fetch('/api/auth/logout', { method: 'POST' });
      if(apiResponse.ok) {
        console.log('[UserContext logout] API logout call successful.');
      } else {
        console.error('[UserContext logout] API logout call failed:', apiResponse.status, await apiResponse.text());
      }
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
          console.log('[UserContext switchPractice] switchPracticeAction successful. Updated user from action:', JSON.stringify(updatedUser));
          setUser(updatedUser); 
          sessionStorage.setItem(SESSION_TOKEN_COOKIE_NAME, JSON.stringify(updatedUser));
          setClientCookie(SESSION_TOKEN_COOKIE_NAME, JSON.stringify(updatedUser));
          // console.log('[UserContext switchPractice SUCCESS] Practice switched. New currentPracticeId in context:', updatedUser.currentPracticeId);
        } else {
          console.error("[UserContext switchPractice FAIL] Failed to switch practice via server action. Refetching user.");
           await fetchUser(); 
        }
      } catch (error) {
        console.error("[UserContext switchPractice CATCH_ERROR] Error switching practice:", error);
        await fetchUser(); 
      } finally {
        setIsLoading(false);
        console.log('[UserContext switchPractice FINALLY] isLoading set to false.');
      }
    } else {
      console.warn("[UserContext switchPractice] Switch practice called by non-admin or no user.")
    }
  };

  // If initial auth check is not complete, render nothing to prevent hydration issues further down.
  if (!initialAuthChecked) {
    console.log('[UserProvider Render] Initial auth not checked. Returning null.');
    return null; 
  }

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
  // console.log('[useUser] Context:', context.user);

  // Example of how to access practiceId safely:
  const userPracticeId = context.user ?
    (context.user.role === 'CLIENT' || context.user.role === 'PRACTICE_ADMINISTRATOR' ?
      context.user.practiceId :
      (context.user.role === 'ADMINISTRATOR' ? context.user.currentPracticeId : undefined)
    ) : undefined;

  console.log('[useUser] Derived userPracticeId:', userPracticeId);

  // You can also return a more specific user object if needed
  // This approach is useful if different parts of your app need different user properties
  const getUserPracticeId = useCallback(() => {
    if (!context.user) return undefined;
    if (context.user.role === 'CLIENT' || context.user.role === 'PRACTICE_ADMINISTRATOR') {
      return context.user.practiceId;
    }
    if (context.user.role === 'ADMINISTRATOR') {
      return context.user.currentPracticeId;
    }
    return undefined;
  }, [context.user]);

  // If you need the practiceId often, you can return it directly from the hook
  // or add a helper function to the context value.
  return {
    ...context,
    userPracticeId: getUserPracticeId(),
    getPracticeId: getUserPracticeId,
  };
}
