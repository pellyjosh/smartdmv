
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useUser, type ClientUser, type AdministratorUser, type PracticeAdminUser } from '@/context/UserContext';
import { Loader2, PawPrint } from 'lucide-react'; // Keep PawPrint if used, Loader2 for loading

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
        {(user.currentPracticeId && user.currentPracticeId !== "practice_NONE") ? user.currentPracticeId.replace('practice_', '') : 'N/A'}
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
      <div className="flex flex-col justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading, please wait...</p>
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
        // This should ideally not be reached if auth is working correctly
        <PublicHomePageContent />
      )}
    </div>
  );
}
