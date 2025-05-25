
"use client";
import { useUser, type ClientUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Loader2 } from 'lucide-react';

export default function ClientDashboardPage() {
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
