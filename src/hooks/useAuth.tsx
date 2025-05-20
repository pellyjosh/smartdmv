
"use client";
import { useState, createContext, useContext, ReactNode, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
// Removed: import { loginUserAction, switchPracticeAction } from '@/actions/authActions';
import { switchPracticeAction } from '@/actions/authActions'; // Keep switchPracticeAction for now
import { SESSION_TOKEN_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/config/authConstants';

// Define base user and role-specific user types
interface BaseUser {
  id: string; // Added id here as it's fundamental
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
  document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax";
};


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialAuthChecked, setInitialAuthChecked] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const navigateBasedOnRole = useCallback((role: User['role']) => {
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
    setIsLoading(true);
    try {
      const storedUserString = sessionStorage.getItem('smartdvm-user-session');
      if (storedUserString) {
        const storedUser: User = JSON.parse(storedUserString);
        setUser(storedUser);
      }
    } catch (error) {
      console.error("Failed to parse stored user from session storage", error);
      sessionStorage.removeItem('smartdvm-user-session');
      setCookie(SESSION_TOKEN_COOKIE_NAME, null, SESSION_MAX_AGE_SECONDS / (24 * 60 * 60) ); 
    }
    setInitialAuthChecked(true);
    setIsLoading(false);
  }, []);


  useEffect(() => {
    if (initialAuthChecked && user && pathname === '/auth/login') {
      navigateBasedOnRole(user.role);
    }
  }, [user, initialAuthChecked, pathname, navigateBasedOnRole]);


  const login = async (emailInput: string, passwordInput: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: emailInput, password: passwordInput }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `API Error: ${response.status}`);
      }
      
      const userData = data.user as User; // API now returns the full User object
      
      if (!userData || !userData.role) { // Basic validation of the received user object
        throw new Error("Invalid user data received from server.");
      }

      setUser(userData);
      const userString = JSON.stringify(userData);
      sessionStorage.setItem('smartdvm-user-session', userString);
      // This cookie is used by the middleware for client-side session state communication
      setCookie(SESSION_TOKEN_COOKIE_NAME, userString, SESSION_MAX_AGE_SECONDS / (24 * 60 * 60)); 
      navigateBasedOnRole(userData.role);

    } catch (error) {
      console.error("Login error:", error);
      if (error instanceof Error) throw error;
      throw new Error("An unknown login error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setIsLoading(true);
    setUser(null);
    sessionStorage.removeItem('smartdvm-user-session');
    setCookie(SESSION_TOKEN_COOKIE_NAME, null, SESSION_MAX_AGE_SECONDS / (24 * 60 * 60));
    // TODO: Call an API endpoint to invalidate the server-side session_token if needed
    router.push('/auth/login'); 
    setIsLoading(false);
  };

  const switchPractice = async (newPracticeId: string) => {
    if (user && user.role === 'ADMINISTRATOR') {
      // Client-side check for accessibility before calling server action
      if (!(user as AdministratorUser).accessiblePracticeIds.includes(newPracticeId)) {
        console.warn("Admin tried to switch to an inaccessible practice.");
        // Optionally, show a toast or error message to the user
        return;
      }
      setIsLoading(true);
      try {
        // switchPracticeAction is still a server action
        const { success, updatedUser: refreshedUser } = await switchPracticeAction(user.id, newPracticeId);
        if (success && refreshedUser) {
          setUser(refreshedUser);
          const userString = JSON.stringify(refreshedUser);
          sessionStorage.setItem('smartdvm-user-session', userString);
          setCookie(SESSION_TOKEN_COOKIE_NAME, userString, SESSION_MAX_AGE_SECONDS / (24 * 60 * 60));
        } else {
          console.error("Failed to switch practice via server action or user data not returned.");
          // Optionally, show a toast or error message
        }
      } catch (error) {
        console.error("Failed to switch practice:", error);
         // Optionally, show a toast or error message
      } finally {
        setIsLoading(false);
      }
    }
  };

  const combinedIsLoading = isLoading || !initialAuthChecked;

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
