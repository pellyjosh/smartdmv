
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useUser, type ClientUser, type AdministratorUser, type PracticeAdminUser } from '@/context/UserContext';
import { Loader2 } from 'lucide-react';

const PublicHomePageContent = () => (
  <div className="text-center">
    <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-6xl">
      Welcome to SmartDVM
    </h1>
    <p className="mt-6 text-lg leading-8 text-foreground">
      Your trusted partner in pet health management. This is the public landing page.
    </p>
    <div className="mt-10 flex items-center justify-center gap-x-6">
      <Button asChild>
        <Link href="/auth/login">Login</Link>
      </Button>
    </div>
  </div>
);

const ClientHomePageContent = ({ user }: { user: ClientUser }) => (
  <div className="text-center">
    <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-6xl">
      Client Home Page
    </h1>
    <p className="mt-6 text-lg leading-8 text-foreground">
      Welcome, {user.name || user.email}! This is your personalized client home page.
    </p>
    <p className="text-muted-foreground">
      You are associated with practice: <span className="font-semibold">{user.practiceId ? user.practiceId.replace('practice_', '') : 'N/A'}</span>.
    </p>
    <div className="mt-10 flex items-center justify-center gap-x-6">
      <Button asChild>
        <Link href="/client">Go to Your Dashboard</Link>
      </Button>
    </div>
  </div>
);

const AdministratorHomePageContent = ({ user }: { user: AdministratorUser }) => (
   <div className="text-center">
    <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-6xl">
      Administrator Home Page
    </h1>
    <p className="mt-6 text-lg leading-8 text-foreground">
      Welcome, Administrator {user.name || user.email}!
    </p>
    <p className="text-muted-foreground">
      You are currently viewing practice: <span className="font-semibold">
        {user.currentPracticeId ? user.currentPracticeId.replace('practice_', '') : 'N/A'}
      </span>.
    </p>
    <div className="mt-10 flex items-center justify-center gap-x-6">
      <Button asChild>
        <Link href="/administrator">Go to Admin Dashboard</Link>
      </Button>
    </div>
  </div>
);

const PracticeAdminHomePageContent = ({ user }: { user: PracticeAdminUser }) => (
  <div className="text-center">
    <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-6xl">
      Practice Administrator Home Page
    </h1>
    <p className="mt-6 text-lg leading-8 text-foreground">
      Welcome, Practice Admin {user.name || user.email}!
    </p>
     <p className="text-muted-foreground">
      You are managing practice: <span className="font-semibold">{user.practiceId ? user.practiceId.replace('practice_', '') : 'N/A'}</span>.
    </p>
    <div className="mt-10 flex items-center justify-center gap-x-6">
      <Button asChild>
        <Link href="/practice-administrator">Go to Practice Dashboard</Link>
      </Button>
    </div>
  </div>
);

export default function HomePage() {
  const { user, isLoading, initialAuthChecked } = useUser();

  if (isLoading || !initialAuthChecked) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading home page...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12">
      {!user ? (
        <PublicHomePageContent />
      ) : user.role === 'CLIENT' ? (
        <ClientHomePageContent user={user as ClientUser} />
      ) : user.role === 'ADMINISTRATOR' ? (
        <AdministratorHomePageContent user={user as AdministratorUser} />
      ) : user.role === 'PRACTICE_ADMINISTRATOR' ? (
        <PracticeAdminHomePageContent user={user as PracticeAdminUser} />
      ) : (
        // Fallback for unknown roles or if role is somehow not set
        <PublicHomePageContent />
      )}
    </div>
  );
}
