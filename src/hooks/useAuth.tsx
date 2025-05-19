
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
  branchId: string; // Client belongs to a specific branch
}

interface PracticeAdminUser extends BaseUser {
  role: 'PRACTICE_ADMINISTRATOR';
  branchId: string; // Practice Admin manages a specific branch
}

interface AdministratorUser extends BaseUser {
  role: 'ADMINISTRATOR';
  accessibleBranchIds: string[]; // Admin can access multiple branches
  currentBranchId: string; // Admin's currently active branch view
}

export type User = ClientUser | PracticeAdminUser | AdministratorUser;

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  initialAuthChecked: boolean;
  switchBranch?: (branchId: string) => void; // For Administrator
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
        // If user is on login page but already authenticated, redirect them
        // This check should ideally happen after initialAuthChecked is true
        // and user is confirmed.
      }
    } catch (error) {
      console.error("Failed to parse stored user", error);
      sessionStorage.removeItem('vetconnectpro-user');
      setCookie(MOCK_AUTH_COOKIE_NAME, null); // Clear cookie too
    }
    setInitialAuthChecked(true);
    setIsLoading(false);
  }, []);


  // Effect to redirect if user is already logged in and on the login page
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
            accessibleBranchIds: ['branch_MAIN_HQ', 'branch_NORTH', 'branch_SOUTH'],
            currentBranchId: 'branch_MAIN_HQ',
          };
        } else if (email === 'vet@vetconnect.pro' && password === 'password') {
          userData = {
            email,
            role: 'PRACTICE_ADMINISTRATOR',
            name: 'Dr. Vet',
            branchId: 'branch_NORTH',
          };
        } else if (email === 'client@vetconnect.pro' && password === 'password') {
          userData = {
            email,
            role: 'CLIENT',
            name: 'Pet Owner',
            branchId: 'branch_NORTH',
          };
        } else if (email.endsWith('@example.com') && password === 'password') {
          userData = {
            email,
            role: 'CLIENT',
            name: email.split('@')[0],
            branchId: 'branch_SOUTH', // Assign a default branch for example.com users
          };
        }

        if (userData) {
          setUser(userData);
          const userString = JSON.stringify(userData);
          sessionStorage.setItem('vetconnectpro-user', userString);
          setCookie(MOCK_AUTH_COOKIE_NAME, userString); // Set cookie for middleware
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
    setCookie(MOCK_AUTH_COOKIE_NAME, null); // Clear cookie
    router.push('/auth/login');
    setIsLoading(false);
  };

  const switchBranch = (branchId: string) => {
    if (user && user.role === 'ADMINISTRATOR') {
      if (user.accessibleBranchIds.includes(branchId)) {
        const updatedUser = { ...user, currentBranchId: branchId };
        setUser(updatedUser);
        const userString = JSON.stringify(updatedUser);
        sessionStorage.setItem('vetconnectpro-user', userString);
        setCookie(MOCK_AUTH_COOKIE_NAME, userString);
        // Optional: force a re-render or data fetch if needed after branch switch
        // router.refresh(); // or similar, depending on how data is fetched
      } else {
        console.warn("Admin tried to switch to an inaccessible branch.");
      }
    }
  };


  // Provide a combined loading state. Loading is true if operations are in progress OR initial check isn't done.
  const combinedIsLoading = isLoading || !initialAuthChecked;


  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading: combinedIsLoading, initialAuthChecked, switchBranch }}>
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
