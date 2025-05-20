
"use client";
import { useState, createContext, useContext, ReactNode, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { switchPracticeAction } from '@/actions/authActions'; 
import { SESSION_TOKEN_COOKIE_NAME, HTTP_ONLY_SESSION_TOKEN_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/config/authConstants';

// Define base user and role-specific user types
interface BaseUser {
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

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  initialAuthChecked: boolean;
  switchPractice?: (practiceId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // For initial load and subsequent auth operations
  const [initialAuthChecked, setInitialAuthChecked] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const navigateBasedOnRole = useCallback((role: User['role']) => {
    console.log(`[Auth Nav] Navigating based on role: ${role}`);
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

  // Effect to load user from session storage on initial mount
  useEffect(() => {
    console.log('[Auth Effect] Initializing auth state from sessionStorage...');
    setIsLoading(true);
    try {
      const storedUserString = sessionStorage.getItem('smartdvm-user-session');
      if (storedUserString) {
        const storedUser: User = JSON.parse(storedUserString);
        setUser(storedUser);
        console.log('[Auth Effect] User loaded from session storage:', storedUser);
      } else {
        console.log('[Auth Effect] No user found in session storage.');
      }
    } catch (error) {
      console.error("[Auth Effect] Failed to parse stored user from session storage", error);
      sessionStorage.removeItem('smartdvm-user-session');
      setClientCookie(SESSION_TOKEN_COOKIE_NAME, null, 0); 
    }
    setInitialAuthChecked(true);
    setIsLoading(false);
  }, []);


  // Effect to redirect from /auth/login if user is already authenticated and state is settled
  useEffect(() => {
    if (initialAuthChecked && user && pathname === '/auth/login' && !isLoading) {
      console.log('[Auth Effect] User is authenticated, on login page, and not loading. Redirecting to dashboard.');
      navigateBasedOnRole(user.role);
    }
  }, [user, initialAuthChecked, pathname, isLoading, navigateBasedOnRole]);


  const login = async (emailInput: string, passwordInput: string) => {
    setIsLoading(true);
    try {
      console.log('[Auth Login] Attempting login via API for:', emailInput);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, password: passwordInput }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[Auth Login] API login failed:', data.error || `API Error: ${response.status}`);
        throw new Error(data.error || `API Error: ${response.statusText || response.status}`);
      }
      
      const userData = data.user as User; 
      
      if (!userData || !userData.role) {
        console.error('[Auth Login] Invalid user data received from API.');
        throw new Error("Invalid user data received from server.");
      }
      
      console.log('[Auth Login] API login successful, user data received:', userData);
      const userString = JSON.stringify(userData);
      sessionStorage.setItem('smartdvm-user-session', userString);
      // The HttpOnly session_token is set by the server API route.
      // The client-side cookie is for client-side convenience (e.g. middleware reading user details without DB lookup for role)
      setClientCookie(SESSION_TOKEN_COOKIE_NAME, userString, SESSION_MAX_AGE_SECONDS / (24 * 60 * 60)); 
      setUser(userData); // This will trigger the useEffect for navigation if on /auth/login
      console.log('[Auth Login] User state, sessionStorage, and client cookie set.');

    } catch (error) {
      console.error("[Auth Login] Login error caught in useAuth:", error);
      if (error instanceof Error) throw error; 
      throw new Error("An unknown login error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    console.log('[Auth Logout] Logging out user.');
    setIsLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      console.log('[Auth Logout] Server session invalidation API called.');
    } catch (err) {
      console.error('[Auth Logout] Error calling API to invalidate server session:', err);
    } finally {
      setUser(null);
      sessionStorage.removeItem('smartdvm-user-session');
      setClientCookie(SESSION_TOKEN_COOKIE_NAME, null, 0); // Clear client-readable cookie
      // The HttpOnly cookie is cleared by the server API route.
      setIsLoading(false);
      router.push('/auth/login'); 
      console.log('[Auth Logout] Client state cleared, redirected to login page.');
    }
  };

  const switchPractice = async (newPracticeId: string) => {
    if (user && user.role === 'ADMINISTRATOR') {
      if (!(user as AdministratorUser).accessiblePracticeIds.includes(newPracticeId)) {
        console.warn("[Auth SwitchPractice] Admin tried to switch to an inaccessible practice.");
        return;
      }
      setIsLoading(true);
      try {
        console.log(`[Auth SwitchPractice] Admin ${user.id} switching to practice ${newPracticeId}`);
        const { success, updatedUser: refreshedUser } = await switchPracticeAction(user.id, newPracticeId);
        if (success && refreshedUser) {
          setUser(refreshedUser);
          const userString = JSON.stringify(refreshedUser);
          sessionStorage.setItem('smartdvm-user-session', userString);
          setClientCookie(SESSION_TOKEN_COOKIE_NAME, userString, SESSION_MAX_AGE_SECONDS / (24 * 60 * 60));
          console.log('[Auth SwitchPractice] Practice switched successfully, user state updated.');
        } else {
          console.error("[Auth SwitchPractice] Failed to switch practice via server action or user data not returned.");
        }
      } catch (error) {
        console.error("[Auth SwitchPractice] Error switching practice:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, initialAuthChecked, switchPractice }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
