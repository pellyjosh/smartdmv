
"use client";
import { useState, createContext, useContext, ReactNode, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  email: string;
  role: 'CLIENT' | 'ADMINISTRATOR' | 'PRACTICE_ADMINISTRATOR';
  name?: string; // Optional: Store user's name
}
interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean; // Combined loading state for auth operations and initial check
  initialAuthChecked: boolean; // To know if initial check is done
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false); // For login/logout operations
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
        router.push('/'); // Fallback to home page
    }
  }, [router]);

  useEffect(() => {
    // Mock initial check for persisted session
    try {
      const storedUserString = sessionStorage.getItem('vetconnectpro-user');
      if (storedUserString) {
        const storedUser: User = JSON.parse(storedUserString);
        setUser(storedUser);
        // If user is on login page but already authenticated, redirect them
        if (pathname === '/login') {
          navigateBasedOnRole(storedUser.role);
        }
      }
    } catch (error) {
      console.error("Failed to parse stored user", error);
      sessionStorage.removeItem('vetconnectpro-user');
    }
    setInitialAuthChecked(true);
  }, [pathname, navigateBasedOnRole]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        let userData: User | null = null;
        if (email === 'admin@vetconnect.pro' && password === 'password') {
          userData = { email, role: 'ADMINISTRATOR', name: 'Admin User' };
        } else if (email === 'vet@vetconnect.pro' && password === 'password') {
          userData = { email, role: 'PRACTICE_ADMINISTRATOR', name: 'Dr. Vet' };
        } else if (email === 'client@vetconnect.pro' && password === 'password') {
          userData = { email, role: 'CLIENT', name: 'Pet Owner' };
        }
        // Allow any @example.com for generic client login for easier testing
         else if (email.endsWith('@example.com') && password === 'password') {
          userData = { email, role: 'CLIENT', name: email.split('@')[0] };
        }


        if (userData) {
          setUser(userData);
          sessionStorage.setItem('vetconnectpro-user', JSON.stringify(userData));
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
    router.push('/login');
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading: isLoading || !initialAuthChecked, initialAuthChecked }}>
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
