
"use client";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ClientDashboardPage() {
  const { user, logout, isLoading, initialAuthChecked } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (initialAuthChecked && !isLoading) {
      if (!user) {
        router.push('/auth/login');
      } else if (user.role !== 'CLIENT') {
        // If wrong role, logout and redirect to login. Middleware should ideally catch this first.
        logout(); 
      }
    }
  }, [user, isLoading, initialAuthChecked, router, logout]);


  if (isLoading || !initialAuthChecked || !user) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }
  
  // This check is a fallback, middleware should handle primary redirection
  if (user.role !== 'CLIENT') {
     return <div className="flex justify-center items-center h-screen">Access Denied. Redirecting...</div>;
  }
  
  const clientUser = user as Extract<User, { role: 'CLIENT' }>;


  return (
    <div className="container mx-auto py-8">
      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-primary">Client Dashboard</h1>
        <Button onClick={logout} variant="outline">Logout</Button>
      </header>
      <p className="text-lg text-foreground">Welcome, {user.name || user.email}!</p>
      <p className="text-muted-foreground">This is your personal dashboard. You are associated with branch: <span className="font-semibold">{clientUser.branchId}</span>.</p>
      {/* Add client-specific components and features here */}
    </div>
  );
}
