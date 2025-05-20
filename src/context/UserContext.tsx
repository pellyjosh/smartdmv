
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
    // To delete a cookie, set its expiration date to the past or maxAge to 0.
    // Using maxAge=0 is often more reliable.
    expires = "; Max-Age=0";
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax";
  console.log(`[UserContext setClientCookie] Cookie ${name} set/deleted. Value:`, value ? '******' : null);
};


export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialAuthChecked, setInitialAuthChecked] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const fetchUser = useCallback(async () => {
    console.log('[UserProvider fetchUser START] Attempting to fetch current user from /api/auth/me');
    setIsLoading(true);
    setInitialAuthChecked(false); // Explicitly set to false before fetch
    try {
      console.log('[UserProvider fetchUser] Calling fetch("/api/auth/me")...');
      const response = await fetch('/api/auth/me');
      console.log('[UserProvider fetchUser] fetch("/api/auth/me") response status:', response.status);

      if (response.ok) {
        const userData: User | null = await response.json();
        if (userData && userData.id) {
          setUser(userData);
          sessionStorage.setItem(SESSION_TOKEN_COOKIE_NAME, JSON.stringify(userData));
          setClientCookie(SESSION_TOKEN_COOKIE_NAME, JSON.stringify(userData));
          console.log('[UserProvider fetchUser SUCCESS] User fetched and set:', userData.email, userData.role);
        } else {
          setUser(null);
          sessionStorage.removeItem(SESSION_TOKEN_COOKIE_NAME);
          setClientCookie(SESSION_TOKEN_COOKIE_NAME, null); // Delete cookie
          console.log('[UserProvider fetchUser NO_USER] /api/auth/me returned no user or invalid data.');
        }
      } else {
        setUser(null);
        sessionStorage.removeItem(SESSION_TOKEN_COOKIE_NAME);
        setClientCookie(SESSION_TOKEN_COOKIE_NAME, null); // Delete cookie
        console.warn(`[UserProvider fetchUser API_FAIL] /api/auth/me call failed, status: ${response.status}`);
      }
    } catch (error) {
      console.error('[UserProvider fetchUser CATCH_ERROR] Error fetching current user:', error);
      setUser(null);
      sessionStorage.removeItem(SESSION_TOKEN_COOKIE_NAME);
      setClientCookie(SESSION_TOKEN_COOKIE_NAME, null); // Delete cookie
    } finally {
      setIsLoading(false);
      setInitialAuthChecked(true);
      console.log('[UserProvider fetchUser FINALLY] fetchUser finished. isLoading:', false, 'initialAuthChecked:', true);
    }
  }, []);

  useEffect(() => {
    console.log('[UserProvider Mount/Effect] Initializing user state.');
    const storedUserString = sessionStorage.getItem(SESSION_TOKEN_COOKIE_NAME);
    if (storedUserString) {
        try {
            const storedUser = JSON.parse(storedUserString) as User;
            if(storedUser && storedUser.id) {
                console.log('[UserProvider Mount/Effect] Found user in sessionStorage:', storedUser.email);
                setUser(storedUser);
            }
        } catch (e) {
            console.error('[UserProvider Mount/Effect] Error parsing sessionStorage user:', e);
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
      console.log('[UserProvider Nav Effect] User authenticated, on login page, attempting redirect. User:', user.email, 'Role:', user.role);
      navigateBasedOnRole(user.role);
    } else {
      console.log('[UserProvider Nav Effect] Conditions for redirect from login not met. initialAuthChecked:', initialAuthChecked, 'user:', !!user, 'pathname:', pathname, 'isLoading:', isLoading);
    }
  }, [user, initialAuthChecked, pathname, isLoading, navigateBasedOnRole]);

  const login = async (emailInput: string, passwordInput: string): Promise<User | null> => {
    console.log('[UserProvider login] Attempting login for:', emailInput);
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, password: passwordInput }),
      });
      const data = await response.json();
      if (!response.ok) {
        console.error('[UserProvider login] API login failed:', data.error || response.status);
        throw new Error(data.error || `API Error: ${response.status}`);
      }
      
      const loggedInUser = data.user as User;
      if (loggedInUser && loggedInUser.id) {
        setUser(loggedInUser); 
        sessionStorage.setItem(SESSION_TOKEN_COOKIE_NAME, JSON.stringify(loggedInUser));
        setClientCookie(SESSION_TOKEN_COOKIE_NAME, JSON.stringify(loggedInUser));
        console.log('[UserProvider login SUCCESS] Login successful, user set in context:', loggedInUser.email);
        // Navigation is handled by the useEffect watching `user` state
        return loggedInUser;
      }
      console.warn('[UserProvider login] API returned ok, but no valid user data.');
      return null;
    } catch (error) {
      console.error("[UserProvider login CATCH_ERROR] Login error:", error);
      setUser(null); 
      sessionStorage.removeItem(SESSION_TOKEN_COOKIE_NAME);
      setClientCookie(SESSION_TOKEN_COOKIE_NAME, null);
      throw error; 
    } finally {
      setIsLoading(false);
      console.log('[UserProvider login FINALLY] isLoading set to false.');
    }
  };

  const logout = async () => {
    console.log('[UserProvider logout] Attempting logout.');
    setIsLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      console.log('[UserProvider logout] API logout call successful.');
    } catch (err) {
      console.error('[UserProvider logout CATCH_ERROR] Error calling API to invalidate server session:', err);
    } finally {
      setUser(null);
      sessionStorage.removeItem(SESSION_TOKEN_COOKIE_NAME);
      setClientCookie(SESSION_TOKEN_COOKIE_NAME, null); // Delete cookie
      setIsLoading(false);
      setInitialAuthChecked(true); // After logout, auth state is checked (no user)
      console.log('[UserProvider logout FINALLY] Client state cleared. isLoading: false, initialAuthChecked: true. Redirecting to login.');
      router.push('/auth/login');
    }
  };

  const switchPractice = async (newPracticeId: string) => {
    if (user && user.role === 'ADMINISTRATOR') {
      console.log(`[UserProvider switchPractice] Admin ${user.email} switching to practice ${newPracticeId}`);
      setIsLoading(true);
      try {
        const { success, updatedUser } = await switchPracticeAction(user.id, newPracticeId);
        if (success && updatedUser) {
          setUser(updatedUser);
          sessionStorage.setItem(SESSION_TOKEN_COOKIE_NAME, JSON.stringify(updatedUser));
          setClientCookie(SESSION_TOKEN_COOKIE_NAME, JSON.stringify(updatedUser));
          console.log('[UserProvider switchPractice SUCCESS] Practice switched. New currentPracticeId:', updatedUser.currentPracticeId);
        } else {
          console.error("[UserProvider switchPractice FAIL] Failed to switch practice via server action.");
           await fetchUser();
        }
      } catch (error) {
        console.error("[UserProvider switchPractice CATCH_ERROR] Error switching practice:", error);
        await fetchUser();
      } finally {
        setIsLoading(false);
        console.log('[UserProvider switchPractice FINALLY] isLoading set to false.');
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
