"use client";

import { useState, useEffect } from "react";
import { AppSidebar, menuGroups } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader"; // Import the new AppHeader
import { Loader2 } from "lucide-react";
import { PracticeProvider } from "@/hooks/use-practice";
import { FeatureAccessProvider } from "@/hooks/use-feature-access";
import { NotificationProvider } from "@/components/notifications/notification-provider";
import { useUser } from "@/context/UserContext";
import { useOfflineInitialization } from "@/hooks/use-offline-initialization";
import { OfflineProtected } from "@/components/offline";
import { flattenMenuForOfflineCheck } from "@/lib/offline/utils/menu-data";
import { initializePWA } from "@/lib/pwa";

// Flatten menu data once for offline protection
const offlineMenuData = flattenMenuForOfflineCheck(menuGroups);

export default function MainApplicationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { user, userPracticeId } = useUser();

  // Initialize offline system with user context
  useOfflineInitialization();

  useEffect(() => {
    setIsMounted(true);

    // Initialize PWA on app startup
    console.log('[Layout] Starting PWA initialization...');
    initializePWA().then((result) => {
      console.log('[Layout] PWA initialization result:', result);
    }).catch((error) => {
      console.error('[Layout] PWA initialization failed:', error);
    });
  }, []);

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  if (!isMounted) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <NotificationProvider userId={user?.id} practiceId={userPracticeId}>
      <div className="flex min-h-screen bg-background">
        <AppSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
        />
        <div className="flex flex-col flex-1 transition-all duration-300 ease-in-out">
          <AppHeader /> {/* Add the AppHeader here */}
          <main
            className="flex-1 overflow-y-auto" // Added overflow-y-auto for scrollable main content
          >
            {/* Add a container for consistent padding */}
            <div className="p-4 sm:p-6 md:p-8">
              <PracticeProvider>
                <FeatureAccessProvider>
                  <OfflineProtected menuData={offlineMenuData}>
                    {children}
                  </OfflineProtected>
                </FeatureAccessProvider>
              </PracticeProvider>
            </div>
          </main>
        </div>
      </div>
    </NotificationProvider>
  );
}
