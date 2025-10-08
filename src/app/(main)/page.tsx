"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useUser } from "@/context/UserContext";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const PublicHomePageContent = () => (
  <div className="text-center">
    <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-6xl">
      Welcome to <span className="text-foreground">Smart</span>
      <span className="text-primary">DVM</span>
    </h1>
    <p className="mt-6 text-lg leading-8 text-foreground">
      Your trusted partner in pet health management. Please log in to access
      your dashboard.
    </p>
    <div className="mt-10 flex items-center justify-center gap-x-6">
      <Button asChild>
        <Link href="/auth/login">Login</Link>
      </Button>
    </div>
  </div>
);

export default function HomePage() {
  const { user, isLoading, initialAuthChecked, networkError, retryAuth } =
    useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && initialAuthChecked && user && !networkError) {
      // User is authenticated, redirect to their dashboard
      switch (user.role) {
        case "CLIENT":
          router.replace("/client");
          break;
        case "ADMINISTRATOR":
          router.replace("/administrator");
          break;
        case "PRACTICE_ADMINISTRATOR":
          router.replace("/practice-administrator");
          break;
        default:
          // Fallback, should not happen if roles are well-defined
          router.replace("/auth/login"); // Or a generic error page
          break;
      }
    }
  }, [user, isLoading, initialAuthChecked, networkError, router]);

  // Show network error state
  if (networkError && !user) {
    return (
      <div className="flex flex-col justify-center items-center h-screen px-4">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Connection Error
          </h1>
          <p className="text-gray-600 mb-6">
            Unable to connect to the server. Please check your internet
            connection and try again.
          </p>
          <div className="space-y-3">
            <Button onClick={retryAuth} className="w-full">
              Try Again
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/auth/login")}
              className="w-full"
            >
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !initialAuthChecked) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading, please wait...</p>
      </div>
    );
  }

  // If user is authenticated, they will be redirected by the useEffect above.
  // Show a loading spinner during this brief redirection phase.
  if (user) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">
          Redirecting to your dashboard...
        </p>
      </div>
    );
  }

  // Only show public content if not loading and no user (unauthenticated)
  // For now, redirect unauthenticated users to login
  useEffect(() => {
    if (!isLoading && initialAuthChecked && !user && !networkError) {
      router.replace("/auth/login");
    }
  }, [isLoading, initialAuthChecked, user, networkError, router]);

  // Show public content while waiting for redirect
  return (
    <div className="container mx-auto py-12">
      <PublicHomePageContent />
    </div>
  );
}
