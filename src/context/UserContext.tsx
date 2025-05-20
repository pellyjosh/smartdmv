
'use client';

import type { Dispatch, ReactNode, SetStateAction } from 'react';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { switchPracticeAction } from '@/actions/authActions';
import { SESSION_TOKEN_COOKIE_NAME, HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/config/authConstants';

// Define User types (can be moved to a dedicated types file e.g. @/models/User.ts)
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


interface UserContextType {
  user: User | null;
  isLoading: boolean;
  initialAuthChecked: boolean; // Indicates if initial /api/auth/me has been attempted
  login: (emailInput: string, passwordInput: string) => Promise<User | null>; // Returns user or null
  logout: () => Promise<void>;
  switchPractice?: (newPracticeId: string) => Promise<void>;
  fetchUser: () => Promise<void>; // Expose fetchUser
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const setClientCookie = (name: string, value: string | null, days: number = 7) => {
  if (typeof document === 'undefined') return;
  let expires = "";
  if (value) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax";
};


export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialAuthChecked, setInitialAuthChecked] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const fetchUser = useCallback(async () => {
    console.log('[UserProvider] Attempting to fetch current user from /api/auth/me');
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const userData: User | null = await response.json(); // API might return null
        if (userData && userData.id) {
          setUser(userData);
          sessionStorage.setItem(SESSION_TOKEN_COOKIE_NAME, JSON.stringify(userData));
          setClientCookie(SESSION_TOKEN_COOKIE_NAME, JSON.stringify(userData), SESSION_MAX_AGE_SECONDS / (24 * 60 * 60));
          console.log('[UserProvider] User fetched and set:', userData);
        } else {
          setUser(null);
          sessionStorage.removeItem(SESSION_TOKEN_COOKIE_NAME);
          setClientCookie(SESSION_TOKEN_COOKIE_NAME, null, 0);
          console.log('[UserProvider] /api/auth/me returned no user or invalid data.');
        }
      } else {
        setUser(null);
        sessionStorage.removeItem(SESSION_TOKEN_COOKIE_NAME);
        setClientCookie(SESSION_TOKEN_COOKIE_NAME, null, 0);
        // No need to log error for 401 or similar which are expected if not logged in
        if (response.status !== 401 && response.status !== 200) { // 200 if API returns null
            console.warn('[UserProvider] /api/auth/me call failed, status:', response.status);
        }
      }
    } catch (error) {
      console.error('[UserProvider] Error fetching current user:', error);
      setUser(null);
      sessionStorage.removeItem(SESSION_TOKEN_COOKIE_NAME);
      setClientCookie(SESSION_TOKEN_COOKIE_NAME, null, 0);
    } finally {
      setIsLoading(false);
      setInitialAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    // Check session storage first for quick hydration, then verify with API
    const storedUserString = sessionStorage.getItem(SESSION_TOKEN_COOKIE_NAME);
    if (storedUserString) {
        try {
            const storedUser = JSON.parse(storedUserString) as User;
            if(storedUser && storedUser.id) {
                setUser(storedUser);
            }
        } catch (e) {
            sessionStorage.removeItem(SESSION_TOKEN_COOKIE_NAME);
        }
    }
    fetchUser();
  }, [fetchUser]);

  const navigateBasedOnRole = useCallback((role: User['role']) => {
    console.log(`[UserProvider Nav] Navigating based on role: ${role}`);
    switch (role) {
      case 'CLIENT':
        router.push('/client');
        break;
      case 'ADMINISTRATOR':
        router.push('/administrator');
        break;
      case 'PRACTICE_ADMINISTRATOR':
        router.push('/practice-administrator');
        break;
      default:
        router.push('/');
    }
  }, [router]);

  useEffect(() => {
    if (initialAuthChecked && user && pathname === '/auth/login' && !isLoading) {
      console.log('[UserProvider Nav Effect] User authenticated, on login page, redirecting.');
      navigateBasedOnRole(user.role);
    }
  }, [user, initialAuthChecked, pathname, isLoading, navigateBasedOnRole]);

  const login = async (emailInput: string, passwordInput: string): Promise<User | null> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, password: passwordInput }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `API Error: ${response.statusText || response.status}`);
      }
      const loggedInUser = data.user as User;
      if (loggedInUser && loggedInUser.id) {
        setUser(loggedInUser); 
        sessionStorage.setItem(SESSION_TOKEN_COOKIE_NAME, JSON.stringify(loggedInUser));
        setClientCookie(SESSION_TOKEN_COOKIE_NAME, JSON.stringify(loggedInUser), SESSION_MAX_AGE_SECONDS / (24 * 60 * 60));
        console.log('[UserProvider] Login successful, user set in context:', loggedInUser);
        return loggedInUser; // Important: return the user
      }
      return null;
    } catch (error) {
      console.error("[UserProvider] Login error:", error);
      setUser(null); 
      sessionStorage.removeItem(SESSION_TOKEN_COOKIE_NAME);
      setClientCookie(SESSION_TOKEN_COOKIE_NAME, null, 0);
      throw error; 
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('[UserProvider] Error calling API to invalidate server session:', err);
    } finally {
      setUser(null);
      sessionStorage.removeItem(SESSION_TOKEN_COOKIE_NAME);
      setClientCookie(SESSION_TOKEN_COOKIE_NAME, null, 0); 
      setIsLoading(false);
      router.push('/auth/login');
    }
  };

  const switchPractice = async (newPracticeId: string) => {
    if (user && user.role === 'ADMINISTRATOR') {
      setIsLoading(true);
      try {
        // The server action should handle updating the DB and returning the refreshed user
        const { success, updatedUser } = await switchPracticeAction(user.id, newPracticeId);
        if (success && updatedUser) {
          setUser(updatedUser); // Update context
          sessionStorage.setItem(SESSION_TOKEN_COOKIE_NAME, JSON.stringify(updatedUser));
          setClientCookie(SESSION_TOKEN_COOKIE_NAME, JSON.stringify(updatedUser), SESSION_MAX_AGE_SECONDS / (24 * 60 * 60));
        } else {
          console.error("[UserProvider] Failed to switch practice via server action.");
           // Optionally refetch user to ensure consistency if server action fails to return updated user
           await fetchUser();
        }
      } catch (error) {
        console.error("[UserProvider] Error switching practice:", error);
        await fetchUser(); // Refetch on error
      } finally {
        setIsLoading(false);
      }
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
