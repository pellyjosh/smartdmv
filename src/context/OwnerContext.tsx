"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

// Define Owner User types
export interface OwnerUser {
  id: string;
  email: string;
  name?: string;
  username?: string;
  role: "OWNER" | "COMPANY_ADMIN";
  createdAt?: string;
  updatedAt?: string;
  stats?: {
    totalTenants: number;
    activeTenants: number;
    inactiveTenants: number;
  };
}

interface OwnerContextType {
  user: OwnerUser | null;
  setUser: Dispatch<SetStateAction<OwnerUser | null>>;
  isLoading: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  networkError: boolean;
  retryAuth: () => void;
  initialAuthChecked: boolean;
  login: (
    emailInput: string,
    passwordInput: string
  ) => Promise<OwnerUser | null>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

const OwnerContext = createContext<OwnerContextType | undefined>(undefined);

const setOwnerCookie = (
  name: string,
  value: string | null,
  days: number = 7
) => {
  if (typeof document === "undefined") return;
  let expires = "";
  if (value) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = "; expires=" + date.toUTCString();
  } else {
    expires = "; Max-Age=0"; // Delete cookie
  }
  document.cookie =
    name + "=" + (value || "") + expires + "; path=/; SameSite=Lax";
  console.log(
    `[OwnerContext setOwnerCookie] Cookie ${name} ${value ? "set" : "deleted"}.`
  );
};

export function OwnerProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<OwnerUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialAuthChecked, setInitialAuthChecked] = useState(false);
  const [networkError, setNetworkError] = useState(false);

  // Load cached user data on initialization
  useEffect(() => {
    try {
      const cachedOwnerData = sessionStorage.getItem("owner-session-data");
      if (cachedOwnerData) {
        const userData: OwnerUser = JSON.parse(cachedOwnerData);
        if (userData && userData.id) {
          setUser(userData);
          console.log(
            "[OwnerContext INIT_CACHE] Loaded cached owner data on initialization:",
            userData.email,
            userData.role
          );
        }
      }
    } catch (error) {
      console.error(
        "[OwnerContext INIT_CACHE_ERROR] Error loading cached owner data on initialization:",
        error
      );
    }
  }, []);

  const fetchUser = useCallback(async () => {
    console.log(
      "[OwnerContext fetchUser START] Attempting to fetch current owner user from /api/owner/auth/me"
    );
    setIsLoading(true);
    setNetworkError(false);

    try {
      const result = await fetch("/api/owner/auth/me", {
        method: "GET",
        credentials: "include", // Include cookies
      });

      if (result.status === 200) {
        const response = await result.json();
        const userData: OwnerUser = response.user;
        if (userData && userData.id) {
          setUser(userData);
          // Cache user data
          sessionStorage.setItem(
            "owner-session-data",
            JSON.stringify(userData)
          );
          console.log(
            "[OwnerContext fetchUser SUCCESS] Owner user fetched and set:",
            userData.email,
            userData.role
          );
        } else {
          console.log(
            "[OwnerContext fetchUser NO_USER] /api/owner/auth/me returned no user or invalid data."
          );
          setUser(null);
          sessionStorage.removeItem("owner-session-data");
        }
      } else if (result.status === 401) {
        console.log(
          "[OwnerContext fetchUser NO_SESSION] /api/owner/auth/me returned null (no session). Owner cleared."
        );
        setUser(null);
        sessionStorage.removeItem("owner-session-data");
      } else {
        throw new Error(`Unexpected response status: ${result.status}`);
      }
    } catch (error) {
      console.error(
        "[OwnerContext fetchUser ERROR] Network or server error during owner auth check:",
        error
      );
      setNetworkError(true);
      // Try to load cached data during network error
      try {
        const cachedOwnerData = sessionStorage.getItem("owner-session-data");
        if (cachedOwnerData) {
          const userData: OwnerUser = JSON.parse(cachedOwnerData);
          if (userData && userData.id) {
            setUser(userData);
            console.log(
              "[OwnerContext fetchUser CACHED] Loaded cached owner data during network error:",
              userData.email,
              userData.role
            );
          }
        } else {
          console.log(
            "[OwnerContext fetchUser CACHED] No cached owner data found during network error"
          );
        }
      } catch (cacheError) {
        console.error(
          "[OwnerContext fetchUser CACHED_ERROR] Error loading cached owner data during network error:",
          cacheError
        );
      }
    } finally {
      setIsLoading(false);
      setInitialAuthChecked(true);
      console.log(
        "[OwnerContext fetchUser FINALLY] fetchUser finished. isLoading: false initialAuthChecked: true Owner set to:",
        user?.email || "null"
      );
    }
  }, [user?.email]);

  useEffect(() => {
    console.log(
      "[OwnerContext Mount/Effect] Initializing owner state. Calling fetchUser."
    );
    fetchUser();
  }, [fetchUser]);

  const login = useCallback(
    async (email: string, password: string): Promise<OwnerUser | null> => {
      console.log(
        "[OwnerContext login START] Attempting owner login for:",
        email
      );
      setIsLoading(true);
      setNetworkError(false);

      try {
        const response = await fetch("/api/owner/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok && data.user) {
          setUser(data.user);
          sessionStorage.setItem(
            "owner-session-data",
            JSON.stringify(data.user)
          );
          console.log(
            "[OwnerContext login SUCCESS] Owner login successful:",
            data.user.email
          );
          return data.user;
        } else {
          console.log(
            "[OwnerContext login FAILED] Owner login failed:",
            data.error
          );
          throw new Error(data.error || "Login failed");
        }
      } catch (error) {
        console.error("[OwnerContext login ERROR] Owner login error:", error);
        setNetworkError(true);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async (): Promise<void> => {
    console.log("[OwnerContext logout START] Logging out owner user");
    setIsLoading(true);

    try {
      await fetch("/api/owner/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      setUser(null);
      sessionStorage.removeItem("owner-session-data");
      console.log("[OwnerContext logout SUCCESS] Owner logout successful");
    } catch (error) {
      console.error("[OwnerContext logout ERROR] Owner logout error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const retryAuth = useCallback(() => {
    console.log("[OwnerContext retryAuth] Retrying owner auth...");
    fetchUser();
  }, [fetchUser]);

  const value: OwnerContextType = {
    user,
    setUser,
    isLoading,
    setIsLoading,
    networkError,
    retryAuth,
    initialAuthChecked,
    login,
    logout,
    fetchUser,
  };

  return (
    <OwnerContext.Provider value={value}>{children}</OwnerContext.Provider>
  );
}

export function useOwner(): OwnerContextType {
  const context = useContext(OwnerContext);
  if (context === undefined) {
    throw new Error("useOwner must be used within an OwnerProvider");
  }
  return context;
}
