
"use client";
import { useUser, type AdministratorUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CustomizableDashboard } from "@/components/dashboard/customizable-dashboard"; // Import the customizable dashboard


export default function AdministratorDashboardPage() {
  const { user, logout, isLoading, initialAuthChecked, switchPractice } = useUser();
  const router = useRouter();
  const [currentPracticeSelection, setCurrentPracticeSelection] = useState<string | undefined>(undefined);
  const [isSetupCompleted, setIsSetupCompleted] = useState(false); // Example state for setup status
  // const [showPracticeSelector, setShowPracticeSelector] = useState(false); // Control visibility of practice selector

  useEffect(() => {
    if (user && user.role === 'ADMINISTRATOR') {
      const adminUser = user as AdministratorUser;
      if (adminUser.currentPracticeId && adminUser.currentPracticeId !== currentPracticeSelection) {
        setCurrentPracticeSelection(adminUser.currentPracticeId);
      } else if (!adminUser.currentPracticeId && currentPracticeSelection !== undefined) {
        setCurrentPracticeSelection(undefined);
      }
      // Determine if practice selector should be shown
      // setShowPracticeSelector(!!adminUser.accessiblePracticeIds && adminUser.accessiblePracticeIds.length > 0);
    }
    // Simulate setup completion check, in a real app this would come from user data or API
    // setIsSetupCompleted(user?.isSetupComplete || false); 
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
    // Redirect to login if not authenticated, router.push should be called in useEffect or event handler
    // For now, just show a message or a loader.
    useEffect(() => {
      router.push('/login');
    }, [router]);
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }

  if (user.role !== 'ADMINISTRATOR') {
     useEffect(() => {
      router.push('/access-denied');
    }, [router]);
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
    }
  };

  return (
    <div className="container mx-auto">
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

    