
"use client";
import { useState, createContext, useContext, ReactNode, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
// import bcrypt from 'bcryptjs'; // No longer needed here
// import { db } from '@/db'; // No longer needed here
// import { users as usersTable, administratorAccessiblePractices as adminPracticesTable } from '@/db/schema'; // No longer needed here
// import { eq } from 'drizzle-orm'; // No longer needed here
import { loginUserAction, switchPracticeAction } from '@/actions/authActions';


// Define base user and role-specific user types for multi-location
interface BaseUser {
  id: string; 
  email: string;
  name?: string;
}

interface ClientUser extends BaseUser {
  role: 'CLIENT';
  practiceId: string; 
}

interface PracticeAdminUser extends BaseUser {
  role: 'PRACTICE_ADMINISTRATOR';
  practiceId: string; 
}

interface AdministratorUser extends BaseUser {
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

const MOCK_AUTH_COOKIE_NAME = 'mock-auth-user';

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
  document.cookie = name + "=" + (value || "") + expires + "; path=/";
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
      const storedUserString = sessionStorage.getItem('vetconnectpro-user');
      if (storedUserString) {
        const storedUser: User = JSON.parse(storedUserString);
        setUser(storedUser);
      }
    } catch (error) {
      console.error("Failed to parse stored user", error);
      sessionStorage.removeItem('vetconnectpro-user');
      setCookie(MOCK_AUTH_COOKIE_NAME, null);
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
      const userData = await loginUserAction(emailInput, passwordInput);
      setUser(userData);
      const userString = JSON.stringify(userData);
      sessionStorage.setItem('vetconnectpro-user', userString);
      setCookie(MOCK_AUTH_COOKIE_NAME, userString); // For middleware
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
    sessionStorage.removeItem('vetconnectpro-user');
    setCookie(MOCK_AUTH_COOKIE_NAME, null);
    router.push('/auth/login');
    setIsLoading(false);
  };

  const switchPractice = async (newPracticeId: string) => {
    if (user && user.role === 'ADMINISTRATOR') {
      if (user.accessiblePracticeIds.includes(newPracticeId)) {
        setIsLoading(true);
        try {
          const { success, updatedUser: refreshedUser } = await switchPracticeAction(user.id, newPracticeId);
          if (success && refreshedUser) {
            setUser(refreshedUser);
            const userString = JSON.stringify(refreshedUser);
            sessionStorage.setItem('vetconnectpro-user', userString);
            setCookie(MOCK_AUTH_COOKIE_NAME, userString); // Update cookie for middleware if needed
          } else {
            console.error("Failed to switch practice via server action or user data not returned.");
            // Optionally: show a toast to the user
          }
        } catch (error) {
          console.error("Failed to switch practice:", error);
          // Optionally: show a toast to the user
        } finally {
          setIsLoading(false);
        }
      } else {
        console.warn("Admin tried to switch to an inaccessible practice.");
        // Optionally show error to user
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
