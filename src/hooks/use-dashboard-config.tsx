import React, { useMemo } from "react"; // Added React and useMemo
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { UserRole, UserRoleEnum } from "@/db/schemas/usersSchema";

const safeStringify = (obj: any) =>
  JSON.stringify(obj, (_key, value) => {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "bigint") return Number(value);
    if (typeof value === "function") return undefined;
    return value;
  });

export type WidgetType =
  | "appointments"
  | "whiteboard"
  | "notifications"
  | "healthPlans"
  | "petStats"
  | "practiceStats"
  | "chart";

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  size: "small" | "medium" | "large";
  position: { x: number; y: number; w: number; h: number };
  settings?: Record<string, any>;
}

export interface DashboardConfigData {
  widgets: WidgetConfig[];
  layout?: string;
  theme?: string;
}

export interface DashboardConfig {
  id: number;
  config: string; // or DashboardConfigData if you stringify on the way out.
  isDefault: boolean;
}

// Generate default widgets for specific roles
export function generateDefaultWidgetsForRole(role: string): WidgetConfig[] {
  const baseWidgets: WidgetConfig[] = [
    {
      id: "widget1",
      type: "notifications",
      title: "Recent Notifications",
      size: "small",
      position: { x: 0, y: 0, w: 4, h: 2 },
      settings: {},
    },
  ];

  // Add role-specific widgets
  switch (
    role as UserRole // use string enum values directly
  ) {
    case UserRoleEnum.VETERINARIAN:
      return [
        ...baseWidgets,
        {
          id: "widget2",
          type: "appointments",
          title: "Today's Appointments",
          size: "medium",
          position: { x: 4, y: 0, w: 8, h: 2 },
          settings: {},
        },
        {
          id: "widget3",
          type: "petStats",
          title: "Patient Overview",
          size: "medium",
          position: { x: 0, y: 2, w: 6, h: 3 },
          settings: {},
        },
        {
          id: "widget4",
          type: "healthPlans",
          title: "Health Plans",
          size: "medium",
          position: { x: 6, y: 2, w: 6, h: 3 },
          settings: {},
        },
      ];

    case UserRoleEnum.TECHNICIAN:
      return [
        ...baseWidgets,
        {
          id: "widget2",
          type: "appointments",
          title: "Today's Appointments",
          size: "medium",
          position: { x: 4, y: 0, w: 8, h: 2 },
          settings: {},
        },
        {
          id: "widget3",
          type: "petStats",
          title: "Patient Stats",
          size: "small",
          position: { x: 0, y: 2, w: 6, h: 2 },
          settings: {},
        },
        {
          id: "widget4",
          type: "practiceStats",
          title: "Technical Tasks",
          size: "medium",
          position: { x: 6, y: 2, w: 6, h: 2 },
          settings: {},
        },
      ];

    case UserRoleEnum.RECEPTIONIST:
      return [
        ...baseWidgets,
        {
          id: "widget2",
          type: "appointments",
          title: "Upcoming Appointments",
          size: "large",
          position: { x: 4, y: 0, w: 8, h: 3 },
          settings: {},
        },
        {
          id: "widget3",
          type: "whiteboard",
          title: "Practice Whiteboard",
          size: "medium",
          position: { x: 0, y: 3, w: 12, h: 3 },
          settings: {},
        },
      ];

    case UserRoleEnum.PRACTICE_MANAGER:
      return [
        ...baseWidgets,
        {
          id: "widget2",
          type: "practiceStats",
          title: "Practice Overview",
          size: "large",
          position: { x: 4, y: 0, w: 8, h: 3 },
          settings: {},
        },
        {
          id: "widget3",
          type: "chart",
          title: "Monthly Statistics",
          size: "medium",
          position: { x: 0, y: 3, w: 6, h: 3 },
          settings: { chartType: "revenue" },
        },
        {
          id: "widget4",
          type: "appointments",
          title: "Appointment Schedule",
          size: "medium",
          position: { x: 6, y: 3, w: 6, h: 3 },
          settings: {},
        },
      ];

    case UserRoleEnum.PRACTICE_ADMIN:
    case UserRoleEnum.PRACTICE_ADMINISTRATOR:
      return [
        ...baseWidgets,
        {
          id: "widget2",
          type: "practiceStats",
          title: "Practice Overview",
          size: "large",
          position: { x: 4, y: 0, w: 8, h: 3 },
          settings: {},
        },
        {
          id: "widget3",
          type: "chart",
          title: "Practice Analytics",
          size: "large",
          position: { x: 0, y: 3, w: 12, h: 4 },
          settings: { chartType: "revenue" },
        },
      ];

    case UserRoleEnum.ADMINISTRATOR:
      return [
        {
          id: "admin-widget1",
          type: "notifications",
          title: "System Notifications",
          size: "medium",
          position: { x: 0, y: 0, w: 6, h: 2 },
          settings: {},
        },
        {
          id: "admin-widget2",
          type: "practiceStats", // Consider if a more admin-specific stats widget is needed
          title: "Platform Activity Overview",
          size: "medium",
          position: { x: 6, y: 0, w: 6, h: 2 },
          settings: {},
        },
        {
          id: "admin-widget3",
          type: "chart",
          title: "Platform Analytics",
          size: "large",
          position: { x: 0, y: 2, w: 12, h: 3 },
          settings: { chartType: "revenue" }, // Default chart type
        },
      ];

    // Client role
    case UserRoleEnum.CLIENT:
      return [
        {
          id: "widget1",
          type: "petStats",
          title: "My Pets",
          size: "medium",
          position: { x: 0, y: 0, w: 6, h: 3 },
          settings: {},
        },
        {
          id: "widget2",
          type: "appointments",
          title: "Upcoming Appointments",
          size: "medium",
          position: { x: 6, y: 0, w: 6, h: 3 },
          settings: {},
        },
        {
          id: "widget3",
          type: "healthPlans",
          title: "Health Plans",
          size: "large",
          position: { x: 0, y: 3, w: 12, h: 3 },
          settings: {},
        },
      ];

    // Default case
    default:
      return baseWidgets;
  }
}

export interface InsertDashboardConfig {
  name: string;
  userId: string;
  practiceId: string | null;
  config: string; // or DashboardConfigData if you stringify on the way out.
  role: string | null;
  isDefault: boolean;
}

export function useDashboardConfigs() {
  const { toast } = useToast();

  // Get all dashboard configurations for current user
  const {
    data: dashboardConfigs,
    isLoading: isLoadingConfigs,
    error: configsError,
  } = useQuery<DashboardConfig[]>({
    queryKey: ["/api/admin/dashboard-configs"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/dashboard-configs");
      return response.json();
    },
    refetchOnWindowFocus: false, // Prevent refetching dashboard structure on window focus
  });

  // Derive default dashboard config using useMemo for stability
  const defaultConfig = useMemo(() => {
    if (!dashboardConfigs || dashboardConfigs.length === 0) {
      return undefined;
    }
    return (
      dashboardConfigs.find((config) => config.isDefault) || dashboardConfigs[0]
    );
  }, [dashboardConfigs]);

  // Get role-based dashboard config template
  const getRoleBasedConfigTemplate = async (role: string) => {
    try {
      const response = await apiRequest(
        "GET",
        `/api/admin/dashboard-configs/role/${role}`
      );
      return await response.json();
    } catch (error) {
      console.error("Error fetching role config template:", error);
      // Return null instead of undefined to differentiate from "not loaded yet"
      return null;
    }
  };

  // Create a new dashboard configuration
  const createConfigMutation = useMutation({
    mutationFn: async (config: InsertDashboardConfig) => {
      const response = await apiRequest(
        "POST",
        "/api/admin/dashboard-configs",
        config
      );
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/dashboard-configs"],
      });
      toast({
        title: "Dashboard configuration created",
        description:
          "Your dashboard configuration has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create configuration",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update a dashboard configuration
  const updateConfigMutation = useMutation({
    mutationFn: async ({
      id,
      name,
      config,
      isDefault,
      role,
    }: {
      id: number;
      name?: string;
      config?: string | DashboardConfigData;
      isDefault?: boolean;
      role?: string | null;
    }) => {
      const payload: any = {};
      if (name !== undefined) payload.name = name;
      if (config !== undefined)
        payload.config =
          typeof config === "string" ? config : safeStringify(config);
      if (isDefault !== undefined) payload.isDefault = isDefault;
      if (role !== undefined) payload.role = role;
      const response = await apiRequest(
        "PATCH",
        `/api/admin/dashboard-configs/${id}`,
        payload
      );
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/dashboard-configs"],
      });
      toast({
        title: "Dashboard configuration updated",
        description:
          "Your dashboard configuration has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update configuration",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete a dashboard configuration
  const deleteConfigMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/dashboard-configs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/dashboard-configs"],
      });
      toast({
        title: "Dashboard configuration deleted",
        description:
          "The dashboard configuration has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete configuration",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Set a configuration as default
  const setDefaultConfigMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(
        "PATCH",
        `/api/admin/dashboard-configs/${id}`,
        { isDefault: true }
      );
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/dashboard-configs"],
      });
      toast({
        title: "Default configuration set",
        description: "Your default dashboard configuration has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to set default configuration",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create a role-based template
  const createRoleTemplateMutation = useMutation({
    mutationFn: async ({
      role,
      name,
      config,
      userId,
      practiceId,
    }: {
      role: string;
      name: string;
      config: DashboardConfigData;
      userId: string;
      practiceId: string;
    }) => {
      const templateConfig: InsertDashboardConfig = {
        name,
        userId,
        practiceId,
        config: JSON.stringify(config),
        role,
        isDefault: true, // Make it the default for this role
      };

      const response = await apiRequest(
        "POST",
        "/api/admin/dashboard-configs",
        templateConfig
      );
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/dashboard-configs"],
      });
      toast({
        title: "Role template created",
        description:
          "The role-based dashboard template has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create role template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    dashboardConfigs,
    defaultConfig,
    isLoading: isLoadingConfigs, // isLoadingDefault is implicitly covered by isLoadingConfigs
    error: configsError,
    createConfig: createConfigMutation.mutate,
    updateConfig: updateConfigMutation.mutate,
    deleteConfig: deleteConfigMutation.mutate,
    setDefaultConfig: setDefaultConfigMutation.mutate,
    createRoleTemplate: createRoleTemplateMutation.mutate,
    getRoleBasedConfigTemplate,
    generateDefaultWidgetsForRole,
    isPending:
      createConfigMutation.isPending ||
      updateConfigMutation.isPending ||
      deleteConfigMutation.isPending ||
      setDefaultConfigMutation.isPending ||
      createRoleTemplateMutation.isPending,
  };
}
