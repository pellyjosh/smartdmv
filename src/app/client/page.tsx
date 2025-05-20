
"use client";
import { useAuth } from "@/hooks/useAuth";
import type { User, ClientUser } from "@/hooks/useAuth"; // Ensure ClientUser is imported
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ClientDashboardPage() {
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

    // If user is present but not a CLIENT, rely on render guards and middleware.
    // This useEffect is for client-specific setup if needed in the future.
    if (user.role === 'CLIENT') {
      // Client-specific logic can go here
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
  
  if (user.role !== 'CLIENT') {
     return <div className="flex justify-center items-center h-screen">Access Denied. You do not have permission to view this page.</div>;
  }
  
  const clientUser = user as ClientUser;


  return (
    <div className="container mx-auto py-8">
      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-primary">Client Dashboard</h1>
        <Button onClick={logout} variant="outline">Logout</Button>
      </header>
      <p className="text-lg text-foreground">Welcome, {clientUser.name || clientUser.email}!</p>
      <p className="text-muted-foreground">This is your personal dashboard. You are associated with practice: <span className="font-semibold">{clientUser.practiceId ? clientUser.practiceId.replace('practice_', '') : 'N/A'}</span>.</p>
      {/* Add client-specific components and features here */}
    </div>
  );
}
