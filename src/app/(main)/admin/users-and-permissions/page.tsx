'use client';
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/context/UserContext";
import { usePractice } from "@/hooks/use-practice";
import { useRoles } from "@/hooks/use-roles";
import { useQuery } from "@tanstack/react-query";
import { 
  CircleUser, Shield, UserCog2, ShieldCheck, 
  Sliders, Users2, Share2, FileBarChart2, Settings, Loader2,
  Layers
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Import our tab content components (these will be implemented separately)
import UserManagementTab from "@/components/permissions/user-management-tab";
import RolesTab from "@/components/permissions/roles-tab";
import UserAssignmentsTab from "@/components/permissions/user-assignments-tab";
import PermissionOverridesTab from "@/components/permissions/permission-overrides-tab";
import PermissionCategoriesTab from "@/components/permissions/permission-categories-tab";

export default function UsersAndPermissionsPage() {
  const [activeTab, setActiveTab] = useState("users");
  const { toast } = useToast();
  const { user } = useUser();
  const { practice } = usePractice();

  // Get practice ID (0 for system-wide context for super admin)
  const practiceId = practice?.id || 
    (user && 'practiceId' in user ? Number(user.practiceId) : 
     user && 'currentPracticeId' in user ? Number(user.currentPracticeId) : 0);

  // Use the roles hook to get role checking functions (supports legacy `user.role` and assigned `user.roles`)
  const { isSuperAdmin, isPracticeAdmin, isSuperAdminAssigned, isPracticeAdminAssigned } = useRoles(practiceId);

  // Extract user role (legacy) and assigned roles (from user_roles)
  const userRole = user?.role || "";
  const assignedRoles = user && 'roles' in user ? (user as any).roles : undefined;

  // Determine effective admin status using either the legacy role or assigned roles
  const isSuperAdminUser = isSuperAdmin(userRole) || isSuperAdminAssigned(assignedRoles);
  const isPracticeAdminUser = isPracticeAdmin(userRole) || isPracticeAdminAssigned(assignedRoles);

  // Fetch real users count - use practice-admin/users endpoint to get correct practice-filtered data
  const { data: users = [], isLoading: usersLoading } = useQuery<any[]>({
    queryKey: [isPracticeAdminUser ? "/api/practice-admin/users" : "/api/users", { practiceId }],
    queryFn: async () => {
      const endpoint = isPracticeAdminUser ? "/api/practice-admin/users" : "/api/users";
      const response = await fetch(`${endpoint}?practiceId=${practiceId}`);
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
    enabled: !!practiceId,
  });

  // Fetch custom roles
  const { data: roles = [], isLoading: rolesLoading } = useQuery<any[]>({
    queryKey: ["/api/roles", { practiceId }],
    queryFn: async () => {
      const response = await fetch(`/api/roles?practiceId=${practiceId}`);
      if (!response.ok) throw new Error('Failed to fetch roles');
      return response.json();
    },
    enabled: !!practiceId,
  });

  // Fetch permission overrides
  const { data: overrides = [], isLoading: overridesLoading } = useQuery<any[]>({
    queryKey: ["/api/permission-overrides", { practiceId }],
    queryFn: async () => {
      const response = await fetch(`/api/permission-overrides?practiceId=${practiceId}`);
      if (!response.ok) throw new Error('Failed to fetch permission overrides');
      return response.json();
    },
    enabled: !!practiceId,
  });

  // Calculate metrics
  const totalUsers = users.length || 0;
  const customRoles = roles.filter((role: any) => role.isCustom).length || 0;
  const totalOverrides = overrides.length || 0;

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <div className="mx-auto py-6 space-y-6">
      {/* Modern gradient header */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background rounded-xl p-6 mb-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <div className="bg-primary/20 p-2 rounded-lg">
                  <Settings className="h-6 w-6 text-primary" />
                </div>
                Users & Permissions
              </h1>
              <p className="text-muted-foreground max-w-2xl">
                Manage users, their access levels, and role-based permissions for {isSuperAdminUser ? "all practices" : "your practice"}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-muted py-1.5 px-3 rounded-lg text-sm flex items-center gap-1.5">
                <FileBarChart2 className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Practice:</span>
                <span className="font-medium">{practice?.name || "System"}</span>
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="bg-card rounded-lg p-4 border shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <Users2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Total Users</div>
                    {usersLoading ? (
                      <div className="flex items-center gap-2 mt-1">
                        <Skeleton className="h-8 w-12 rounded-md" />
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="text-2xl font-bold">
                        {totalUsers}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-lg p-4 border shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Custom Roles</div>
                    {rolesLoading ? (
                      <div className="flex items-center gap-2 mt-1">
                        <Skeleton className="h-8 w-12 rounded-md" />
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="text-2xl font-bold">
                        {customRoles}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-lg p-4 border shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <Share2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Permission Overrides</div>
                    {overridesLoading ? (
                      <div className="flex items-center gap-2 mt-1">
                        <Skeleton className="h-8 w-12 rounded-md" />
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="text-2xl font-bold">
                        {totalOverrides}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Tabs 
        value={activeTab} 
        onValueChange={handleTabChange} 
        className="space-y-6"
      >
        <div className="bg-card rounded-lg border shadow-sm p-1">
          <TabsList className="grid grid-cols-5 gap-1 p-1 h-auto">
            <TabsTrigger value="users" className="flex items-center gap-2 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <CircleUser className="w-4 h-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center gap-2 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Roles & Permissions</span>
            </TabsTrigger>
            <TabsTrigger value="assignments" className="flex items-center gap-2 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <UserCog2 className="w-4 h-4" />
              <span className="hidden sm:inline">Assignments</span>
            </TabsTrigger>
            <TabsTrigger value="overrides" className="flex items-center gap-2 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Sliders className="w-4 h-4" />
              <span className="hidden sm:inline">Overrides</span>
            </TabsTrigger>
            <TabsTrigger 
              value="categories" 
              className="flex items-center gap-2 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              disabled={!isSuperAdminUser && !isPracticeAdminUser}
            >
              <Layers className="w-4 h-4" />
              <span className="hidden sm:inline">Categories</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="users" className="space-y-4">
          <UserManagementTab practiceId={practiceId} isSuperAdmin={isSuperAdminUser} />
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <RolesTab practiceId={practiceId} isSuperAdmin={isSuperAdminUser} />
        </TabsContent>



        <TabsContent value="assignments" className="space-y-4">
          <UserAssignmentsTab practiceId={practiceId} isSuperAdmin={isSuperAdminUser} />
        </TabsContent>

        <TabsContent value="overrides" className="space-y-4">
          <PermissionOverridesTab practiceId={practiceId} isSuperAdmin={isSuperAdminUser} />
        </TabsContent>
        
        <TabsContent value="categories" className="space-y-4">
          <PermissionCategoriesTab practiceId={practiceId} isSuperAdmin={isSuperAdminUser} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
