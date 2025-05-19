
"use client";
import { useState, createContext, useContext, ReactNode, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

// Define base user and role-specific user types for multi-location
interface BaseUser {
  email: string;
  name?: string;
}

interface ClientUser extends BaseUser {
  role: 'CLIENT';
  practiceId: string; // Client belongs to a specific practice
}

interface PracticeAdminUser extends BaseUser {
  role: 'PRACTICE_ADMINISTRATOR';
  practiceId: string; // Practice Admin manages a specific practice
}

interface AdministratorUser extends BaseUser {
  role: 'ADMINISTRATOR';
  accessiblePracticeIds: string[]; // Admin can access multiple practices
  currentPracticeId: string; // Admin's currently active practice view
}

export type User = ClientUser | PracticeAdminUser | AdministratorUser;

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  initialAuthChecked: boolean;
  switchPractice?: (practiceId: string) => void; // For Administrator
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to manage the mock auth cookie
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
  const [isLoading, setIsLoading] = useState(true); // Start true for initial check
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


  const login = async (email: string, password: string) => {
    setIsLoading(true);
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        let userData: User | null = null;
        if (email === 'admin@vetconnect.pro' && password === 'password') {
          userData = {
            email,
            role: 'ADMINISTRATOR',
            name: 'Admin User',
            accessiblePracticeIds: ['practice_MAIN_HQ', 'practice_NORTH', 'practice_SOUTH'],
            currentPracticeId: 'practice_MAIN_HQ',
          };
        } else if (email === 'vet@vetconnect.pro' && password === 'password') {
          userData = {
            email,
            role: 'PRACTICE_ADMINISTRATOR',
            name: 'Dr. Vet',
            practiceId: 'practice_NORTH',
          };
        } else if (email === 'client@vetconnect.pro' && password === 'password') {
          userData = {
            email,
            role: 'CLIENT',
            name: 'Pet Owner',
            practiceId: 'practice_NORTH',
          };
        } else if (email.endsWith('@example.com') && password === 'password') {
          userData = {
            email,
            role: 'CLIENT',
            name: email.split('@')[0],
            practiceId: 'practice_SOUTH', 
          };
        }

        if (userData) {
          setUser(userData);
          const userString = JSON.stringify(userData);
          sessionStorage.setItem('vetconnectpro-user', userString);
          setCookie(MOCK_AUTH_COOKIE_NAME, userString); 
          navigateBasedOnRole(userData.role);
          resolve();
        } else {
          reject(new Error('Invalid credentials. Please try again.'));
        }
        setIsLoading(false);
      }, 1000);
    });
  };

  const logout = () => {
    setIsLoading(true);
    setUser(null);
    sessionStorage.removeItem('vetconnectpro-user');
    setCookie(MOCK_AUTH_COOKIE_NAME, null); 
    router.push('/auth/login');
    setIsLoading(false);
  };

  const switchPractice = (practiceId: string) => {
    if (user && user.role === 'ADMINISTRATOR') {
      if (user.accessiblePracticeIds.includes(practiceId)) {
        const updatedUser = { ...user, currentPracticeId: practiceId };
        setUser(updatedUser);
        const userString = JSON.stringify(updatedUser);
        sessionStorage.setItem('vetconnectpro-user', userString);
        setCookie(MOCK_AUTH_COOKIE_NAME, userString);
      } else {
        console.warn("Admin tried to switch to an inaccessible practice.");
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
