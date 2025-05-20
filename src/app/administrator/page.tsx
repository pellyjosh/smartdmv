
"use client";
import { useAuth } from "@/hooks/useAuth";
import type { User, AdministratorUser } from "@/hooks/useAuth"; // Ensure AdministratorUser is imported if not already
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


export default function AdministratorDashboardPage() {
  const { user, logout, isLoading, initialAuthChecked, switchPractice } = useAuth();
  const router = useRouter();
  // Ensure currentPracticeSelection is initialized from user if available and correct role
  const [currentPracticeSelection, setCurrentPracticeSelection] = useState<string | undefined>(
    user && user.role === 'ADMINISTRATOR' ? (user as AdministratorUser).currentPracticeId : undefined
  );

  useEffect(() => {
    // Wait for auth state to be resolved
    if (isLoading || !initialAuthChecked) {
      return;
    }

    // If no user, middleware should handle redirect, but as a fallback:
    if (!user) {
      router.push('/auth/login');
      return;
    }

    // If user is present but not an ADMIN, middleware should have caught this.
    // This effect mainly sets up admin-specific state.
    if (user.role === 'ADMINISTRATOR') {
      const adminUser = user as AdministratorUser;
      // Update local state if the user's currentPracticeId changes (e.g., after switchPractice)
      if (adminUser.currentPracticeId !== currentPracticeSelection) {
        setCurrentPracticeSelection(adminUser.currentPracticeId);
      }
    } else {
        // If role is incorrect, rely on render guards and middleware to prevent access/redirect.
        // Avoid calling logout() here to prevent loops if user state is transient.
        // For instance, if this page is somehow reached by a non-admin,
        // the render guards below will show "Access Denied".
    }
  }, [user, isLoading, initialAuthChecked, router, currentPracticeSelection]);

  if (isLoading || !initialAuthChecked) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!user) {
    // This should ideally not be reached if middleware is effective.
    // Indicates user session ended or was cleared.
    return <div className="flex justify-center items-center h-screen">Redirecting to login...</div>;
  }

  if (user.role !== 'ADMINISTRATOR') {
     return <div className="flex justify-center items-center h-screen">Access Denied. You do not have permission to view this page.</div>;
  }

  // User is definitely an Administrator here
  const adminUser = user as AdministratorUser;

  const handlePracticeChange = (newPracticeId: string) => {
    if (switchPractice) {
      switchPractice(newPracticeId);
      // currentPracticeSelection will be updated by the useEffect when 'user' object changes
    }
  };

  return (
    <div className="container mx-auto py-8">
      <header className="mb-8 flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold text-primary">Administrator Dashboard</h1>
            {adminUser && (
              <div className="mt-2">
                <span className="text-sm text-muted-foreground mr-2">Viewing Practice:</span>
                <Select value={currentPracticeSelection || ''} onValueChange={handlePracticeChange}>
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Select practice to view" />
                  </SelectTrigger>
                  <SelectContent>
                    {adminUser.accessiblePracticeIds && adminUser.accessiblePracticeIds.map(practiceId => (
                      <SelectItem key={practiceId} value={practiceId}>
                        {practiceId ? practiceId.replace('practice_', '') : 'Unnamed Practice'}
                      </SelectItem>
                    ))}
                    {(!adminUser.accessiblePracticeIds || adminUser.accessiblePracticeIds.length === 0) && (
                        <SelectItem value="none" disabled>No practices accessible</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
        </div>
        <Button onClick={logout} variant="outline">Logout</Button>
      </header>
      <p className="text-lg text-foreground">Welcome, Administrator {adminUser.name || adminUser.email}!</p>
      <p className="text-muted-foreground">
        You are currently managing: <span className="font-semibold">
          {adminUser.currentPracticeId ? adminUser.currentPracticeId.replace('practice_', '') : 'N/A'}
        </span>.
      </p>
      <p className="text-sm text-muted-foreground">
        Accessible practices: {adminUser.accessiblePracticeIds && adminUser.accessiblePracticeIds.length > 0 
          ? adminUser.accessiblePracticeIds.map(id => id ? id.replace('practice_', '') : 'Unknown').join(', ') 
          : 'No other practices accessible'}
      </p>
      {/* Add administrator-specific components and features here, filtered by adminUser.currentPracticeId */}
    </div>
  );
}
