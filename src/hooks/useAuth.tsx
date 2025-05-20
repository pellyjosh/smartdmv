
"use client";
import { useState, createContext, useContext, ReactNode, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { switchPracticeAction } from '@/actions/authActions'; 
import { SESSION_TOKEN_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/config/authConstants';

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

const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
};

const setCookie = (name: string, value: string | null, days: number = 7) => {
  if (typeof document === 'undefined') return;
  let expires = "";
  if (value) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  // Ensure cookie is set for the root path
  document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax";
};


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
    console.log('[Auth Effect] Initializing auth state...');
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
      setCookie(SESSION_TOKEN_COOKIE_NAME, null, SESSION_MAX_AGE_SECONDS / (24 * 60 * 60) ); 
    }
    setInitialAuthChecked(true);
    setIsLoading(false);
  }, []);


  // Effect to redirect from /auth/login if user is already authenticated
  useEffect(() => {
    if (initialAuthChecked && user && pathname === '/auth/login') {
      console.log('[Auth Effect] User is authenticated and on login page. Redirecting to dashboard.');
      navigateBasedOnRole(user.role);
    }
  }, [user, initialAuthChecked, pathname, navigateBasedOnRole]);


  const login = async (emailInput: string, passwordInput: string) => {
    setIsLoading(true);
    try {
      console.log('[Auth Login] Attempting login for:', emailInput);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: emailInput, password: passwordInput }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[Auth Login] API login failed:', data.error || `API Error: ${response.status}`);
        throw new Error(data.error || `API Error: ${response.status}`);
      }
      
      const userData = data.user as User; 
      
      if (!userData || !userData.role) {
        console.error('[Auth Login] Invalid user data received from server.');
        throw new Error("Invalid user data received from server.");
      }
      
      console.log('[Auth Login] Login successful, user data received:', userData);
      const userString = JSON.stringify(userData);
      sessionStorage.setItem('smartdvm-user-session', userString);
      setCookie(SESSION_TOKEN_COOKIE_NAME, userString, SESSION_MAX_AGE_SECONDS / (24 * 60 * 60)); 
      setUser(userData); // Set user state. This will trigger the useEffect for navigation.
      console.log('[Auth Login] User state, session storage, and cookie set.');

      // Navigation is now handled by the useEffect watching `user` and `pathname`
    } catch (error) {
      console.error("[Auth Login] Login error caught in useAuth:", error);
      // Ensure the error is re-thrown so the form can catch it
      if (error instanceof Error) throw error; 
      throw new Error("An unknown login error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    console.log('[Auth Logout] Logging out user.');
    setIsLoading(true);
    setUser(null);
    sessionStorage.removeItem('smartdvm-user-session');
    setCookie(SESSION_TOKEN_COOKIE_NAME, null, 0); // Set expiry to 0 to delete cookie
    // API call to invalidate server session_token is handled by /api/auth/logout
    fetch('/api/auth/logout', { method: 'POST' })
      .then(() => console.log('[Auth Logout] Server session invalidated.'))
      .catch(err => console.error('[Auth Logout] Error invalidating server session:', err))
      .finally(() => {
        router.push('/auth/login'); 
        setIsLoading(false);
        console.log('[Auth Logout] Redirected to login page.');
      });
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
          setCookie(SESSION_TOKEN_COOKIE_NAME, userString, SESSION_MAX_AGE_SECONDS / (24 * 60 * 60));
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

  const combinedIsLoading = isLoading; // initialAuthChecked is mostly for the first load. isLoading covers subsequent loads.

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading: combinedIsLoading, initialAuthChecked, switchPractice }}>
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


    