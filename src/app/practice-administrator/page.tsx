
"use client";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function PracticeAdministratorDashboardPage() {
  const { user, logout, isLoading, initialAuthChecked } = useAuth();
  const router = useRouter();

 useEffect(() => {
    if (initialAuthChecked && !isLoading) {
        if (!user) {
          router.push('/auth/login');
        } else if (user.role !== 'PRACTICE_ADMINISTRATOR') {
           logout();
        }
    }
  }, [user, isLoading, initialAuthChecked, router, logout]);


  if (isLoading || !initialAuthChecked ||!user) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }
  
  if (user.role !== 'PRACTICE_ADMINISTRATOR') {
     return <div className="flex justify-center items-center h-screen">Access Denied. Redirecting...</div>;
  }
  
  const practiceAdminUser = user as Extract<User, { role: 'PRACTICE_ADMINISTRATOR' }>;

  return (
    <div className="container mx-auto py-8">
      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-primary">Practice Administrator Dashboard</h1>
        <Button onClick={logout} variant="outline">Logout</Button>
      </header>
      <p className="text-lg text-foreground">Welcome, Practice Admin {user.name || user.email}!</p>
      <p className="text-muted-foreground">You are managing practice: <span className="font-semibold">{practiceAdminUser.practiceId.replace('practice_', '')}</span>.</p>
      {/* Add practice administrator-specific components and features here, specific to practiceAdminUser.practiceId */}
    </div>
  );
}
