
"use client";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


export default function AdministratorDashboardPage() {
  const { user, logout, isLoading, initialAuthChecked, switchPractice } = useAuth();
  const router = useRouter();
  const [currentPracticeSelection, setCurrentPracticeSelection] = useState<string | undefined>(undefined);

  useEffect(() => {
     if (initialAuthChecked && !isLoading) {
        if (!user) {
          router.push('/auth/login');
        } else if (user.role !== 'ADMINISTRATOR') {
          logout();
        } else {
           setCurrentPracticeSelection(user.currentPracticeId);
        }
    }
  }, [user, isLoading, initialAuthChecked, router, logout]);

  if (isLoading || !initialAuthChecked || !user) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (user.role !== 'ADMINISTRATOR') {
     return <div className="flex justify-center items-center h-screen">Access Denied. Redirecting...</div>;
  }

  const adminUser = user as Extract<User, { role: 'ADMINISTRATOR' }>;

  const handlePracticeChange = (newPracticeId: string) => {
    if (switchPractice) {
      switchPractice(newPracticeId);
      setCurrentPracticeSelection(newPracticeId); 
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
                <Select value={currentPracticeSelection} onValueChange={handlePracticeChange}>
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Select practice to view" />
                  </SelectTrigger>
                  <SelectContent>
                    {adminUser.accessiblePracticeIds.map(practiceId => (
                      <SelectItem key={practiceId} value={practiceId}>
                        {practiceId.replace('practice_', '')} {/* Display cleaner name */}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
        </div>
        <Button onClick={logout} variant="outline">Logout</Button>
      </header>
      <p className="text-lg text-foreground">Welcome, Administrator {user.name || user.email}!</p>
      <p className="text-muted-foreground">
        You are currently managing: <span className="font-semibold">{adminUser.currentPracticeId.replace('practice_', '')}</span>.
      </p>
      <p className="text-sm text-muted-foreground">Accessible practices: {adminUser.accessiblePracticeIds.map(id => id.replace('practice_', '')).join(', ')}</p>
      {/* Add administrator-specific components and features here, filtered by adminUser.currentPracticeId */}
    </div>
  );
}
