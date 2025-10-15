"use client";

import { usePathname } from "next/navigation";
import { UserProvider } from "@/context/UserContext";
import { OwnerProvider } from "@/context/OwnerContext";
import { TenantProvider, useTenant } from "@/context/TenantContext";
import { PracticeProvider } from "@/hooks/use-practice";
import { ThemeProvider } from "@/context/ThemeContext";
import { NotificationWrapper } from "@/components/notifications/notification-wrapper";
import { MobileBlocker } from "@/components/ui/mobile-blocker";
import ClientOnlyWrapper from "@/components/utils/ClientOnlyWrapper";
import GlobalLoader from "@/components/GlobalLoader";
import { Toaster } from "@/components/ui/toaster";
import { NetworkStatus } from "@/components/NetworkStatus";
import { ThemeSwitcherWidget } from "@/components/ThemeSwitcherWidget";

// Error boundary component for tenant validation
function TenantErrorBoundary({ children }: { children: React.ReactNode }) {
  const { error, isLoading, initialTenantChecked } = useTenant();

  // Show loading while checking tenant
  if (isLoading && !initialTenantChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error page for invalid tenants
  if (error && initialTenantChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">
              Domain Not Found
            </h2>
            <p className="text-gray-600 mb-6">
              The subdomain you're trying to access doesn't exist or has been
              deactivated.
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-700">Error: {error}</p>
            </div>
            <p className="text-sm text-gray-500">
              If you believe this is an error, please contact support.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

interface ConditionalProvidersProps {
  children: React.ReactNode;
}

export default function ConditionalProviders({
  children,
}: ConditionalProvidersProps) {
  const pathname = usePathname();

  // Check if this is an owner route that should use OwnerProvider
  const isOwnerRoute =
    pathname?.startsWith("/owner-auth") ||
    pathname?.startsWith("/owner") ||
    pathname?.startsWith("/owner/login");

  if (isOwnerRoute) {
    // For owner routes, use OwnerProvider instead of UserProvider
    return (
      <OwnerProvider>
        <ThemeProvider>
          <MobileBlocker allowTablets={false}>
            <GlobalLoader />
            <div className="min-h-screen">{children}</div>
            <Toaster />
            <NetworkStatus />
            <ThemeSwitcherWidget />
          </MobileBlocker>
        </ThemeProvider>
      </OwnerProvider>
    );
  }

  // For all other routes (tenant routes), use TenantProvider with UserProvider
  return (
    <TenantProvider>
      <TenantErrorBoundary>
        <UserProvider>
          <PracticeProvider>
            <ThemeProvider>
              <NotificationWrapper>
                <MobileBlocker allowTablets={false}>
                  <ClientOnlyWrapper>
                    <GlobalLoader />
                    {children}
                  </ClientOnlyWrapper>
                </MobileBlocker>
              </NotificationWrapper>
              <Toaster />
              <NetworkStatus />
              <ThemeSwitcherWidget />
            </ThemeProvider>
          </PracticeProvider>
        </UserProvider>
      </TenantErrorBoundary>
    </TenantProvider>
  );
}
