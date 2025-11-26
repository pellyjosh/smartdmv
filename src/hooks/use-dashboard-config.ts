// Mock hook for dashboard configuration
export interface WidgetConfig {
  id: string;
  title: string;
  type: "appointments" | "whiteboard" | "notifications" | "healthPlans" | "petStats" | "practiceStats" | "chart";
  size: "small" | "medium" | "large";
  position: { x: number; y: number; w: number; h: number };
  settings: Record<string, any>;
}

export interface DashboardConfigData {
  widgets: WidgetConfig[];
}

export interface DashboardConfig {
  id: number;
  name: string;
  userId: number;
  practiceId: number;
  config: string;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface RoleTemplate {
  id: number;
  name: string;
  role: string;
  config: string;
  userId: number;
  practiceId: number;
  isSystem?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UseDashboardConfigsReturn {
  dashboardConfigs: DashboardConfig[] | undefined;
  defaultConfig: DashboardConfig | undefined;
  isLoading: boolean;
  isPending: boolean;
  createConfig: (data: any) => void;
  updateConfig: (params: { id: number; config: any }) => void;
  deleteConfig: (id: number) => void;
  setDefaultConfig: (id: number) => void;
  createRoleTemplate: (data: RoleTemplate) => void;
  generateDefaultWidgetsForRole: (role: string) => WidgetConfig[];
  getRoleBasedConfigTemplate: (role: string) => Promise<RoleTemplate | null>;
}

// Mock hook that provides empty data and no-op functions
export function useDashboardConfigs(): UseDashboardConfigsReturn {
  return {
    dashboardConfigs: [],
    defaultConfig: undefined,
    isLoading: false,
    isPending: false,
    createConfig: () => {},
    updateConfig: () => {},
    deleteConfig: () => {},
    setDefaultConfig: () => {},
    createRoleTemplate: () => {},
    generateDefaultWidgetsForRole: () => [],
    getRoleBasedConfigTemplate: async () => null,
  };
}
