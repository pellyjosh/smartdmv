
"use client";
import { useUser, type AdministratorUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from 'lucide-react';

export default function AdministratorDashboardPage() {
  const { user, logout, isLoading, initialAuthChecked, switchPractice } = useUser();
  const router = useRouter();
  const [currentPracticeSelection, setCurrentPracticeSelection] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (user && user.role === 'ADMINISTRATOR') {
      const adminUser = user as AdministratorUser;
      // Only update local state if it's different from context, to avoid potential loops
      // and ensure it correctly reflects the context's currentPracticeId.
      if (adminUser.currentPracticeId && adminUser.currentPracticeId !== currentPracticeSelection) {
        setCurrentPracticeSelection(adminUser.currentPracticeId);
      } else if (!adminUser.currentPracticeId && currentPracticeSelection !== undefined) {
        // Handle case where context might clear currentPracticeId (e.g. if it became invalid)
        setCurrentPracticeSelection(undefined);
      }
    }
  // Only re-run if `user` changes (which includes its currentPracticeId)
  }, [user]); 

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

  if (user.role !== 'ADMINISTRATOR') {
     router.push('/access-denied');
     return (
      <div className="flex flex-col justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Access Denied. Redirecting...</p>
      </div>
    );
  }

  const adminUser = user as AdministratorUser;

  const handlePracticeChange = async (newPracticeId: string) => {
    if (switchPractice && adminUser) {
      await switchPractice(newPracticeId);
      // currentPracticeSelection will update via the useEffect hook when `user` (and thus adminUser.currentPracticeId) changes
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
                <Select
                    // Use currentPracticeSelection if set, otherwise default to context, or empty string for uncontrolled state
                    value={currentPracticeSelection || adminUser.currentPracticeId || ''}
                    onValueChange={handlePracticeChange}
                    disabled={isLoading}
                >
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Select practice to view" />
                  </SelectTrigger>
                  <SelectContent>
                    {adminUser.accessiblePracticeIds && adminUser.accessiblePracticeIds.length > 0 ?
                        adminUser.accessiblePracticeIds.map(practiceId => (
                          <SelectItem key={practiceId} value={practiceId}>
                            {practiceId ? practiceId.replace('practice_', '') : 'Unnamed Practice'}
                          </SelectItem>
                        )) :
                        <SelectItem value="none" disabled>No practices accessible</SelectItem>
                    }
                    {(!adminUser.accessiblePracticeIds || adminUser.accessiblePracticeIds.length === 0) && adminUser.currentPracticeId === "practice_NONE" && (
                         <SelectItem value="practice_NONE" disabled>No practices configured</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
        </div>
        <Button onClick={logout} variant="outline" disabled={isLoading}>Logout</Button>
      </header>
      <p className="text-lg text-foreground">Welcome, Administrator {adminUser.name || adminUser.email}!</p>
      <p className="text-muted-foreground">
        You are currently managing: <span className="font-semibold">
          {(adminUser.currentPracticeId && adminUser.currentPracticeId !== "practice_NONE") ? adminUser.currentPracticeId.replace('practice_', '') : 'N/A'}
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
