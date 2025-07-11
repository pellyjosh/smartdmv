
"use client";

import { useState, useEffect } from 'react';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader'; // Import the new AppHeader
import { Loader2 } from 'lucide-react';
import { PracticeProvider } from '@/hooks/use-practice';
import { FeatureAccessProvider } from '@/hooks/use-feature-access';

export default function MainApplicationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => !prev);
  };

  if (!isMounted) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar 
        isCollapsed={isSidebarCollapsed} 
        onToggleCollapse={toggleSidebarCollapse} 
      />
      <div 
        className='flex flex-col flex-1 transition-all duration-300 ease-in-out'
      >
        <AppHeader /> {/* Add the AppHeader here */}
        <main 
          className="flex-1 overflow-y-auto" // Added overflow-y-auto for scrollable main content
        >
          {/* Add a container for consistent padding */}
          <div className="p-4 sm:p-6 md:p-8">
            <PracticeProvider>
              <FeatureAccessProvider>
                {children}
              </FeatureAccessProvider>
            </PracticeProvider>
          </div>
        </main>
      </div>
    </div>
  );
}
