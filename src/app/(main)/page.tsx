
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useUser } from '@/context/UserContext';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const PublicHomePageContent = () => (
  <div className="text-center">
    <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-6xl">
      Welcome to <span className="text-foreground">Smart</span><span className="text-primary">DVM</span>
    </h1>
    <p className="mt-6 text-lg leading-8 text-foreground">
      Your trusted partner in pet health management. Please log in to access your dashboard.
    </p>
    <div className="mt-10 flex items-center justify-center gap-x-6">
      <Button asChild>
        <Link href="/auth/login">Login</Link>
      </Button>
    </div>
  </div>
);

export default function HomePage() {
  const { user, isLoading, initialAuthChecked } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && initialAuthChecked && user) {
      // User is authenticated, redirect to their dashboard
      switch (user.role) {
        case 'CLIENT':
          router.replace('/client');
          break;
        case 'ADMINISTRATOR':
          router.replace('/administrator');
          break;
        case 'PRACTICE_ADMINISTRATOR':
          router.replace('/practice-administrator');
          break;
        default:
          // Fallback, should not happen if roles are well-defined
          router.replace('/auth/login'); // Or a generic error page
          break;
      }
    }
  }, [user, isLoading, initialAuthChecked, router]);

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
        <p className="text-lg text-muted-foreground">Redirecting to your dashboard...</p>
      </div>
    );
  }

  // Only show public content if not loading and no user (unauthenticated)
  return (
    <div className="container mx-auto py-12">
      <PublicHomePageContent />
    </div>
  );
}
