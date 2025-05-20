
"use client";
import { useUser, type ClientUser } from "@/context/UserContext"; // Use UserContext
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation"; // Keep for potential client-side nav if needed

export default function ClientDashboardPage() {
  const { user, logout, isLoading, initialAuthChecked } = useUser(); // Use useUser
  const router = useRouter(); // Keep for now, though middleware handles primary redirection

  if (isLoading || !initialAuthChecked) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }
  
  if (!user) {
    // Middleware should redirect, but this is a fallback.
    // UserProvider might also redirect to login if fetchUser fails.
    return <div className="flex justify-center items-center h-screen">Redirecting to login...</div>;
  }
  
  if (user.role !== 'CLIENT') {
     return <div className="flex justify-center items-center h-screen">Access Denied. You do not have permission to view this page.</div>;
  }
  
  const clientUser = user as ClientUser; // Safe to cast after role check


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
