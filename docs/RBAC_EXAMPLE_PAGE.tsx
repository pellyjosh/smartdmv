// Example of enhanced admin page with RBAC
'use client';
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/context/UserContext";
import { usePractice } from "@/hooks/use-practice";
import { UserRoleEnum } from "@/db/schema";
import { useQuery } from "@tanstack/react-query";
import { 
  CircleUser, Shield, UserCog2, ShieldCheck, 
  Sliders, Users2, Share2, FileBarChart2, Settings, Loader2,
  Layers
} from "lucide-react";

// Import RBAC components and hooks
import { 
  AdminOnly, 
  WithPermission, 
  useFeatureFlags, 
  useRole,
  ResourceType, 
  StandardAction,
  PermissionDebugger
} from "@/lib/rbac";

import UserManagementTab from "@/components/permissions/user-management-tab";
import RolesTab from "@/components/permissions/roles-tab";
import UserAssignmentsTab from "@/components/permissions/user-assignments-tab";
import PermissionOverridesTab from "@/components/permissions/permission-overrides-tab";
import PermissionCategoriesTab from "@/components/permissions/permission-categories-tab";

export default function UsersAndPermissionsPage() {
  return (
    <AdminOnly level="practice" fallback={<AccessDeniedFallback />}>
      <UsersAndPermissionsContent />
      <PermissionDebugger />
    </AdminOnly>
  );
}

function UsersAndPermissionsContent() {
  const [activeTab, setActiveTab] = useState("users");
  const { toast } = useToast();
  const { user } = useUser();
  const { practice } = usePractice();
  
  // Use RBAC feature flags
  const { 
    canManageUsers, 
    canManageRoles, 
    canViewAuditLogs 
  } = useFeatureFlags();
  
  const { isAdmin, isPracticeAdmin } = useRole();

  // Get metrics with permission checks
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['admin-metrics', practice?.id],
    queryFn: async () => {
      const response = await fetch('/api/admin/metrics');
      if (!response.ok) throw new Error('Failed to fetch metrics');
      return response.json();
    },
    enabled: !!practice?.id && canViewAuditLogs
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header with permission-based visibility */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users and Permissions</h1>
          <p className="text-gray-600 mt-1">
            Manage user access, roles, and permissions for {practice?.name || 'your practice'}
          </p>
        </div>
        
        <WithPermission 
          resource={ResourceType.SYSTEM_SETTING} 
          action={StandardAction.UPDATE}
        >
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <Settings className="w-4 h-4 mr-2 inline" />
            System Settings
          </button>
        </WithPermission>
      </div>

      {/* Metrics Cards - Only show if user can view audit logs */}
      {canViewAuditLogs && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Users"
            value={metrics?.totalUsers || 0}
            icon={Users2}
            loading={metricsLoading}
          />
          <MetricCard
            title="Active Roles"
            value={metrics?.activeRoles || 0}
            icon={Shield}
            loading={metricsLoading}
          />
          <MetricCard
            title="Permission Overrides"
            value={metrics?.permissionOverrides || 0}
            icon={ShieldCheck}
            loading={metricsLoading}
          />
          <MetricCard
            title="Login Sessions"
            value={metrics?.activeSessions || 0}
            icon={CircleUser}
            loading={metricsLoading}
          />
        </div>
      )}

      {/* Main Tabs with Permission-Based Visibility */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          {/* User Management Tab - Only for those who can manage users */}
          {canManageUsers && (
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users2 className="w-4 h-4" />
              Users
            </TabsTrigger>
          )}
          
          {/* Roles Tab - Only for those who can manage roles */}
          {canManageRoles && (
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Roles
            </TabsTrigger>
          )}
          
          {/* User Assignments - For practice admins+ */}
          <WithPermission 
            resource={ResourceType.USER} 
            action={StandardAction.UPDATE}
            fallback={null}
          >
            <TabsTrigger value="assignments" className="flex items-center gap-2">
              <UserCog2 className="w-4 h-4" />
              Assignments
            </TabsTrigger>
          </WithPermission>
          
          {/* Permission Overrides - For system admins */}
          <WithPermission 
            resource={ResourceType.PERMISSION} 
            action={StandardAction.CREATE}
            fallback={null}
          >
            <TabsTrigger value="overrides" className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Overrides
            </TabsTrigger>
          </WithPermission>
          
          {/* Categories - Always available but may be read-only */}
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Categories
          </TabsTrigger>
        </TabsList>

        {/* Tab Contents with Permission Wrapping */}
        {canManageUsers && (
          <TabsContent value="users" className="space-y-6">
            <UserManagementTab 
              practiceId={practice?.id || 0}
              isSuperAdmin={user?.role === UserRoleEnum.SUPER_ADMIN}
            />
          </TabsContent>
        )}

        {canManageRoles && (
          <TabsContent value="roles" className="space-y-6">
            <RolesTab 
              practiceId={practice?.id || 0}
              isSuperAdmin={user?.role === UserRoleEnum.SUPER_ADMIN}
            />
          </TabsContent>
        )}

        <WithPermission 
          resource={ResourceType.USER} 
          action={StandardAction.UPDATE}
        >
          <TabsContent value="assignments" className="space-y-6">
            <UserAssignmentsTab 
              practiceId={practice?.id || 0}
              isSuperAdmin={user?.role === UserRoleEnum.SUPER_ADMIN}
            />
          </TabsContent>
        </WithPermission>

        <WithPermission 
          resource={ResourceType.PERMISSION} 
          action={StandardAction.CREATE}
        >
          <TabsContent value="overrides" className="space-y-6">
            <PermissionOverridesTab 
              practiceId={practice?.id || 0}
              isSuperAdmin={user?.role === UserRoleEnum.SUPER_ADMIN}
            />
          </TabsContent>
        </WithPermission>

        <TabsContent value="categories" className="space-y-6">
          <PermissionCategoriesTab 
            practiceId={practice?.id || 0}
            isSuperAdmin={user?.role === UserRoleEnum.SUPER_ADMIN}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Access denied fallback component
function AccessDeniedFallback() {
  return (
    <div className="container mx-auto py-12">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <Shield className="h-6 w-6 text-red-600" />
        </div>
        <h3 className="mt-2 text-sm font-semibold text-gray-900">Access Denied</h3>
        <p className="mt-1 text-sm text-gray-500">
          You don't have permission to access the Users and Permissions management area.
        </p>
        <div className="mt-6">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}

// Metric card component
function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  loading 
}: { 
  title: string; 
  value: number; 
  icon: any; 
  loading: boolean; 
}) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          {loading ? (
            <div className="animate-pulse bg-gray-200 h-8 w-16 rounded mt-2"></div>
          ) : (
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
          )}
        </div>
        <Icon className="h-8 w-8 text-blue-600" />
      </div>
    </div>
  );
}
