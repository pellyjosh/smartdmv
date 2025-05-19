
"use client";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


export default function AdministratorDashboardPage() {
  const { user, logout, isLoading, initialAuthChecked, switchBranch } = useAuth();
  const router = useRouter();
  const [currentBranchSelection, setCurrentBranchSelection] = useState<string | undefined>(undefined);

  useEffect(() => {
     if (initialAuthChecked && !isLoading) {
        if (!user) {
          router.push('/auth/login');
        } else if (user.role !== 'ADMINISTRATOR') {
          logout();
        } else {
           // User is Administrator, set current branch for select
           setCurrentBranchSelection(user.currentBranchId);
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

  const handleBranchChange = (newBranchId: string) => {
    if (switchBranch) {
      switchBranch(newBranchId);
      setCurrentBranchSelection(newBranchId); // Update local state for select
    }
  };

  return (
    <div className="container mx-auto py-8">
      <header className="mb-8 flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold text-primary">Administrator Dashboard</h1>
            {adminUser && (
              <div className="mt-2">
                <span className="text-sm text-muted-foreground mr-2">Viewing Branch:</span>
                <Select value={currentBranchSelection} onValueChange={handleBranchChange}>
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Select branch to view" />
                  </SelectTrigger>
                  <SelectContent>
                    {adminUser.accessibleBranchIds.map(branchId => (
                      <SelectItem key={branchId} value={branchId}>
                        {branchId.replace('branch_', '')} {/* Display cleaner name */}
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
        You are currently managing: <span className="font-semibold">{adminUser.currentBranchId.replace('branch_', '')}</span>.
      </p>
      <p className="text-sm text-muted-foreground">Accessible branches: {adminUser.accessibleBranchIds.join(', ')}</p>
      {/* Add administrator-specific components and features here, filtered by adminUser.currentBranchId */}
    </div>
  );
}
