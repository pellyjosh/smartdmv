
"use client";
import { useUser, type PracticeAdminUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Loader2 } from 'lucide-react';

export default function PracticeAdministratorDashboardPage() {
  const { user, logout, isLoading, initialAuthChecked } = useUser();
  const router = useRouter();

  if (isLoading || !initialAuthChecked) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading, please wait...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }

  if (user.role !== 'PRACTICE_ADMINISTRATOR') {
     return <div className="flex justify-center items-center h-screen">Access Denied. You do not have permission to view this page.</div>;
  }

  const practiceAdminUser = user as PracticeAdminUser;

  return (
    <div className="container mx-auto py-8">
      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-primary">Practice Administrator Dashboard</h1>
        <Button onClick={logout} variant="outline">Logout</Button>
      </header>
      <p className="text-lg text-foreground">Welcome, Practice Admin {practiceAdminUser.name || practiceAdminUser.email}!</p>
      <p className="text-muted-foreground">You are managing practice: <span className="font-semibold">{practiceAdminUser.practiceId ? practiceAdminUser.practiceId.replace('practice_', '') : 'N/A'}</span>.</p>
      {/* Add practice administrator-specific components and features here, specific to practiceAdminUser.practiceId */}
    </div>
  );
}
