
"use client";
import { useUser, type AdministratorUser } from "@/context/UserContext";
import { isAdmin } from '@/lib/rbac-helpers';
import { Button } from "@/components/ui/button";
import React, { useEffect, useState } from "react";
import { XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CustomizableDashboard } from "@/components/dashboard/customizable-dashboard";
import { useProtectedPage } from "@/hooks/use-protected-page";


export default function AdministratorDashboardPage() {
  const { user, switchPractice } = useUser();
  const { renderAuthState, NetworkErrorAlert } = useProtectedPage({
    allowedRoles: ['ADMINISTRATOR', 'SUPER_ADMIN']
  });
  
  const [currentPracticeSelection, setCurrentPracticeSelection] = useState<string | undefined>(undefined);
  const [isSetupCompleted, setIsSetupCompleted] = useState(false);

  // Keep all hooks above any potential early return
  useEffect(() => {
    if (!user) return;
    // Use RBAC helper to detect admin-like users
    if (isAdmin(user as any)) {
      const currentId = (user as any).currentPracticeId as string | undefined;
      if (currentId && currentId !== currentPracticeSelection) {
        setCurrentPracticeSelection(currentId);
      } else if (!currentId && currentPracticeSelection !== undefined) {
        setCurrentPracticeSelection(undefined);
      }
    }
  }, [user, currentPracticeSelection]);

  // Check if we should render auth state instead of the main content
  const authStateComponent = renderAuthState();
  if (authStateComponent) {
    return authStateComponent;
  }

  // If we get here, we have an authenticated user with the right role
  const adminUser = user as AdministratorUser;

  const handlePracticeChange = async (newPracticeId: string) => {
    if (switchPractice && adminUser) {
      await switchPractice(newPracticeId);
    }
  };

  return (
    <div className="container mx-auto">
      <NetworkErrorAlert />

      {!isSetupCompleted && (
        <Alert
        variant="default"
        className="border-blue-200 text-black dark:!text-white dark:border-blue-700 dark:text-blue-300"
      >
        <XCircle className="h-5 w-5 !text-blue-500" />
        <AlertTitle className="font-semibold !text-black dark:!text-white">
          Setup Not Started
        </AlertTitle>
        <AlertDescription>
          <div className="flex flex-col gap-2">
            <p>
              Your practice portal is ready, but you haven&apos;t completed the initial setup yet. Complete the guided setup process to get the most out of SmartDVM.
            </p>
            <div className="flex justify-end mt-2">
              <Button
                onClick={() => setIsSetupCompleted(true)}
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Start Setup
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>
      )}

      <CustomizableDashboard />
    </div>
  );
}

    