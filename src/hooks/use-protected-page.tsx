'use client';

import { useUser, type User } from "@/context/UserContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2, XCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export interface UseProtectedPageOptions {
  allowedRoles: User['role'][];
  redirectPath?: string;
  accessDeniedPath?: string;
}

export interface UseProtectedPageReturn {
  user: User | null;
  isLoading: boolean;
  networkError: boolean;
  retryAuth: () => void;
  renderAuthState: () => React.ReactNode | null;
  NetworkErrorAlert: () => React.ReactNode | null;
}

/**
 * Custom hook for handling authentication in protected pages
 * Provides consistent loading states, error handling, and network error management
 */
export function useProtectedPage(options: UseProtectedPageOptions): UseProtectedPageReturn {
  const { 
    user, 
    isLoading, 
    initialAuthChecked, 
    networkError, 
    retryAuth 
  } = useUser();
  
  const router = useRouter();
  const { 
    allowedRoles, 
    redirectPath = '/auth/login', 
    accessDeniedPath = '/access-denied' 
  } = options;

  // Handle navigation based on auth state
  useEffect(() => {
    if (initialAuthChecked) {
      // Don't redirect to login if there's a network error - keep the user on the page
      if (!user && !networkError) {
        router.push(redirectPath);
      } else if (user && !allowedRoles.includes(user.role)) {
        router.push(accessDeniedPath);
      }
    }
  }, [user, initialAuthChecked, router, networkError, allowedRoles, redirectPath, accessDeniedPath]);

  /**
   * Renders the appropriate loading/error state based on current auth status
   * Returns null if the page should render normally
   */
  const renderAuthState = (): React.ReactNode | null => {
    // Show loading spinner while checking auth
    if (isLoading || !initialAuthChecked) {
      return (
        <div className="flex flex-col justify-center items-center h-screen">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-lg text-muted-foreground">Loading, please wait...</p>
        </div>
      );
    }

    // Show network error state if there's a network error and no cached user
    if (networkError && !user) {
      return (
        <div className="flex flex-col justify-center items-center h-screen space-y-4">
          <XCircle className="h-16 w-16 text-destructive" />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive mb-2">Connection Error</h1>
            <p className="text-lg text-muted-foreground mb-4">
              Unable to connect to the server. Please check your internet connection.
            </p>
            <Button onClick={retryAuth} variant="outline">
              Retry Connection
            </Button>
          </div>
        </div>
      );
    }

    // Only redirect to login if no user AND no network error (meaning session is truly expired)
    if (!user && !networkError) {
      return (
        <div className="flex flex-col justify-center items-center h-screen">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-lg text-muted-foreground">Redirecting to login...</p>
        </div>
      );
    }

    // Check role authorization
    if (user && !allowedRoles.includes(user.role)) {
      return (
        <div className="flex flex-col justify-center items-center h-screen">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-lg text-muted-foreground">Access Denied. Redirecting...</p>
        </div>
      );
    }

    // Final safety check - if we get here, we should have a user
    if (!user) {
      return (
        <div className="flex flex-col justify-center items-center h-screen">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-lg text-muted-foreground">Loading user data...</p>
        </div>
      );
    }

    // All checks passed - page can render normally
    return null;
  };

  /**
   * Component for displaying network error alert when user has cached data
   */
  const NetworkErrorAlert = (): React.ReactNode | null => {
    if (!networkError || !user) return null;

    return (
      <Alert variant="destructive" className="mb-4">
        <XCircle className="h-5 w-5" />
        <AlertTitle className="font-semibold">
          Connection Lost
        </AlertTitle>
        <AlertDescription>
          <div className="flex flex-col gap-2">
            <p>
              You&apos;re currently working offline with cached data. Some features may not be available until your connection is restored.
            </p>
            <div className="flex justify-end mt-2">
              <Button
                onClick={retryAuth}
                size="sm"
                variant="outline"
              >
                Retry Connection
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  };

  return {
    user,
    isLoading,
    networkError,
    retryAuth,
    renderAuthState,
    NetworkErrorAlert,
  };
}
