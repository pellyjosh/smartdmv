"use client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdministratorDashboardPage() {
  const { user, logout, isLoading, initialAuthChecked } = useAuth();
  const router = useRouter();

  useEffect(() => {
     if (initialAuthChecked && !isLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'ADMINISTRATOR') {
      logout();
    }
  }, [user, isLoading, initialAuthChecked, router, logout]);

  if (isLoading || !initialAuthChecked || !user) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (user.role !== 'ADMINISTRATOR') {
     return <div className="flex justify-center items-center h-screen">Access Denied. Redirecting...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-primary">Administrator Dashboard</h1>
        <Button onClick={logout} variant="outline">Logout</Button>
      </header>
      <p className="text-lg text-foreground">Welcome, Administrator {user.name || user.email}!</p>
      <p className="text-muted-foreground">Manage system settings, users, and overall application health.</p>
      {/* Add administrator-specific components and features here */}
    </div>
  );
}
