
"use client";
import { useState, createContext, useContext, ReactNode, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { db } from '@/db';
import { users as usersTable, administratorAccessiblePractices as adminPracticesTable } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Define base user and role-specific user types for multi-location
interface BaseUser {
  id: string; // Add id to BaseUser
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
  switchPractice?: (practiceId: string) => Promise<void>; // For Administrator, make it async
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to manage the mock auth cookie (still used for middleware simplicity)
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


  const login = async (email: string, passwordInput: string) => {
    setIsLoading(true);
    try {
      const result = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
      const dbUser = result[0];

      if (!dbUser || !dbUser.password) {
        throw new Error('User not found or password not set.');
      }

      const passwordMatch = bcrypt.compareSync(passwordInput, dbUser.password);
      if (!passwordMatch) {
        throw new Error('Invalid credentials. Please try again.');
      }

      let userData: User;

      if (dbUser.role === 'ADMINISTRATOR') {
        const adminPractices = await db.select({ practiceId: adminPracticesTable.practiceId })
          .from(adminPracticesTable)
          .where(eq(adminPracticesTable.administratorId, dbUser.id));
        
        const accessiblePracticeIds = adminPractices.map(p => p.practiceId);
        let currentPracticeId = dbUser.currentPracticeId;
        if (!currentPracticeId && accessiblePracticeIds.length > 0) {
          currentPracticeId = accessiblePracticeIds[0]; // Default to first accessible practice if none set
        } else if (!currentPracticeId && accessiblePracticeIds.length === 0) {
          // This case should ideally not happen if an admin is expected to manage practices
          console.warn(`Administrator ${dbUser.email} has no current or accessible practices configured.`);
          // Fallback or handle appropriately - for now, let's use a placeholder or throw error
          // For demo, let's allow login but currentPracticeId might be problematic
           currentPracticeId = 'practice_NONE'; // Or handle as error
        }


        userData = {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name || undefined,
          role: 'ADMINISTRATOR',
          accessiblePracticeIds,
          currentPracticeId: currentPracticeId!, // Assert non-null after logic
        };
      } else if (dbUser.role === 'PRACTICE_ADMINISTRATOR') {
        if (!dbUser.practiceId) {
          throw new Error('Practice Administrator is not associated with a practice.');
        }
        userData = {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name || undefined,
          role: 'PRACTICE_ADMINISTRATOR',
          practiceId: dbUser.practiceId,
        };
      } else if (dbUser.role === 'CLIENT') {
        if (!dbUser.practiceId) {
          throw new Error('Client is not associated with a practice.');
        }
        userData = {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name || undefined,
          role: 'CLIENT',
          practiceId: dbUser.practiceId,
        };
      } else {
        throw new Error('Unknown user role.');
      }

      setUser(userData);
      const userString = JSON.stringify(userData);
      sessionStorage.setItem('vetconnectpro-user', userString);
      setCookie(MOCK_AUTH_COOKIE_NAME, userString);
      navigateBasedOnRole(userData.role);

    } catch (error) {
      console.error("Login error:", error);
      // Propagate error to be caught by the form
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
          await db.update(usersTable)
            .set({ currentPracticeId: newPracticeId })
            .where(eq(usersTable.id, user.id));

          const updatedUser = { ...user, currentPracticeId: newPracticeId };
          setUser(updatedUser);
          const userString = JSON.stringify(updatedUser);
          sessionStorage.setItem('vetconnectpro-user', userString);
          setCookie(MOCK_AUTH_COOKIE_NAME, userString);
        } catch (error) {
          console.error("Failed to switch practice:", error);
          // Optionally: show a toast to the user
        } finally {
          setIsLoading(false);
        }
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
