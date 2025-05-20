
"use client";
import { useAuth } from "@/hooks/useAuth";
import type { User, PracticeAdminUser } from "@/hooks/useAuth"; // Ensure PracticeAdminUser is imported
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function PracticeAdministratorDashboardPage() {
  const { user, logout, isLoading, initialAuthChecked } = useAuth();
  const router = useRouter();

 useEffect(() => {
    if (isLoading || !initialAuthChecked) {
        return; // Wait for auth state to be resolved
    }

    if (!user) {
      router.push('/auth/login'); // Redirect if no user
      return;
    }
    
    // If user is present but not a PRACTICE_ADMINISTRATOR, rely on render guards and middleware.
    // This useEffect is for practice-admin-specific setup if needed.
    if (user.role === 'PRACTICE_ADMINISTRATOR') {
        // Practice Admin specific logic can go here
    } else {
        // If role is incorrect, render guards below will handle display.
    }
  }, [user, isLoading, initialAuthChecked, router]);


  if (isLoading || !initialAuthChecked) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }
  
  if (!user) {
    return <div className="flex justify-center items-center h-screen">Redirecting to login...</div>;
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
