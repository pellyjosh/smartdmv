
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Home } from 'lucide-react';
import { useUser } from '@/context/UserContext';

export default function AccessDeniedPage() {
  const { user } = useUser();

  const getHomePath = () => {
    if (!user) return '/auth/login';
    switch (user.role) {
      case 'ADMINISTRATOR':
        return '/administrator';
      case 'PRACTICE_ADMINISTRATOR':
        return '/practice-administrator';
      case 'CLIENT':
        return '/client';
      default:
        return '/';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-6 bg-background">
      <ShieldAlert className="w-24 h-24 text-destructive mb-8" />
      <h1 className="text-4xl font-bold text-foreground mb-4">Access Denied</h1>
      <p className="text-lg text-muted-foreground mb-8 max-w-md">
        You do not have the necessary permissions to access this page or resource.
        Please contact your administrator if you believe this is an error.
      </p>
      <Button asChild>
        <Link href={getHomePath()} className="flex items-center gap-2">
          <Home className="w-5 h-5" />
          Go to Your Home Page
        </Link>
      </Button>
    </div>
  );
}
