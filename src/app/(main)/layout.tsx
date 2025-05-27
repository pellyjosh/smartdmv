"use client";

import { useState, useEffect } from 'react';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { Loader2 } from 'lucide-react';

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
    // You can return a more sophisticated loader here if needed,
    // but ClientOnlyWrapper in RootLayout might already handle this.
    // Returning null defers rendering to client-side only.
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background"> {/* Added bg-background here for consistency */}
      <AppSidebar 
        isCollapsed={isSidebarCollapsed} 
        onToggleCollapse={toggleSidebarCollapse} 
      />
      <main 
        className={`flex-1 pt-16 md:pt-0 transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >
        {/* Add a container for consistent padding, or apply directly */}
        <div className="p-4 sm:p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
