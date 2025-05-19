"use client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ClientDashboardPage() {
  const { user, logout, isLoading, initialAuthChecked } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (initialAuthChecked && !isLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'CLIENT') {
      // Redirect if wrong role accesses this page
      logout(); // Or redirect to their correct dashboard/error page
    }
  }, [user, isLoading, initialAuthChecked, router, logout]);


  if (isLoading || !initialAuthChecked || !user) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }
  
  if (user.role !== 'CLIENT') {
     return <div className="flex justify-center items-center h-screen">Access Denied. Redirecting...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-primary">Client Dashboard</h1>
        <Button onClick={logout} variant="outline">Logout</Button>
      </header>
      <p className="text-lg text-foreground">Welcome, {user.name || user.email}!</p>
      <p className="text-muted-foreground">This is your personal dashboard where you can manage your pet's information, appointments, and more.</p>
      {/* Add client-specific components and features here */}
    </div>
  );
}
