import React from 'react';
import { useOnboarding } from '@/hooks/use-onboarding';
import { TaskChecklist } from '@/components/onboarding/TaskChecklist';
import { TourHelpButton } from '@/components/guided-tour/TourOverlay';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CircleCheck, CircleX, ArrowRight } from 'lucide-react';

export function OnboardingProgress() {
  const pathname = usePathname();
  const { isLoading, progress, completedTasksCount, totalTasks, isFirstLogin } = useOnboarding();

  if (isLoading) {
    return null;
  }

  // If all tasks are completed, show a success card
  if (progress === 100) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <CircleCheck className="h-5 w-5 text-primary mr-2" />
            All setup tasks completed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Great job! You've completed all the setup tasks for your practice. Your SmartDVM
            system is now fully configured.
          </p>
        </CardContent>
        <CardFooter className="pt-0">
          <Button variant="ghost" className="ml-auto" onClick={() => navigate('/guided-setup')}>
            View Details
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // If it's first login and they haven't seen the welcome page, direct them there
  if (isFirstLogin) {
    return (
      <Card className="border-primary/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <CircleX className="h-5 w-5 text-primary mr-2" />
            Setup Not Started
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Your practice portal is ready, but you haven't completed the initial setup yet. Complete
            the guided setup process to get the most out of SmartDVM.
          </p>
        </CardContent>
        <CardFooter className="pt-0">
          <Button variant="default" className="ml-auto gap-1" onClick={() => navigate('/guided-setup/welcome')}>
            Start Setup <ArrowRight className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Otherwise show the task checklist for the dashboard
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Practice Setup Progress</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {completedTasksCount}/{totalTasks} Tasks
          </span>
          <TourHelpButton onClick={() => navigate('/guided-setup')} />
        </div>
      </div>
      <TaskChecklist maxItems={3} showCompleted={false} />
    </div>
  );
}
