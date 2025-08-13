
"use client";
import { useUser, type PracticeAdminUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { useProtectedPage } from "@/hooks/use-protected-page";

export default function PracticeAdministratorDashboardPage() {
  const { user, logout } = useUser();
  const { renderAuthState, NetworkErrorAlert } = useProtectedPage({
    allowedRoles: ['PRACTICE_ADMINISTRATOR']
  });

  // Check if we should render auth state instead of the main content
  const authStateComponent = renderAuthState();
  if (authStateComponent) {
    return authStateComponent;
  }

  // If we get here, we have an authenticated user with the right role
  const practiceAdminUser = user as PracticeAdminUser;

  return (
    <div className="container mx-auto py-8">
      <NetworkErrorAlert />

      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-primary">Practice Administrator Dashboard</h1>
        <Button onClick={logout} variant="outline">Logout</Button>
      </header>
      <p className="text-lg text-foreground">Welcome, Practice Admin {practiceAdminUser.name || practiceAdminUser.email}!</p>
      <p className="text-muted-foreground">You are managing practice: <span className="font-semibold">{practiceAdminUser.practiceId ? practiceAdminUser.practiceId.replace('practice_', '') : 'N/A'}</span>.</p>
      {/* Add practice administrator-specific components and features here, specific to practiceAdminUser.practiceId */}
    </div>
  );
}
