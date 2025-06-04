import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, Plus, Save, Settings, X, PlusCircle, Calendar, Layout, Bell, 
  HeartPulse, PawPrint, BarChart3, ClipboardList, LineChart, Trash2
} from "lucide-react";
import { WidgetConfig, DashboardConfigData, useDashboardConfigs } from "@/hooks/use-dashboard-config";
import { AppointmentsWidget } from "./widgets/appointments-widget";
import { WhiteboardWidget } from "./widgets/whiteboard-widget";
import { NotificationsWidget } from "./widgets/notifications-widget";
import { HealthPlansWidget } from "./widgets/health-plans-widget";
import { PetStatsWidget } from "./widgets/pet-stats-widget";
import { PracticeStatsWidget } from "./widgets/practice-stats-widget";
import { ChartWidget } from "./widgets/chart-widget";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { UserRole } from "@shared/schema";

// Widget definition interface
interface WidgetDefinition {
  type: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  defaultSize: { w: number; h: number };
  component: React.FC<{ widget: WidgetConfig }>;
  allowedRoles: string[];
}

// Widget catalog
const WIDGET_CATALOG: Record<string, WidgetDefinition> = {
  appointments: {
    type: "appointments",
    title: "Appointments",
    description: "Shows today's and upcoming appointments with scheduling info",
    icon: <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600">
      <Calendar className="h-4 w-4" />
    </div>,
    defaultSize: { w: 6, h: 4 },
    component: AppointmentsWidget,
    allowedRoles: ["SUPER_ADMIN", "PRACTICE_ADMIN", "PRACTICE_MANAGER", "VETERINARIAN", "TECHNICIAN", "RECEPTIONIST"]
  },
  whiteboard: {
    type: "whiteboard",
    title: "Whiteboard",
    description: "Practice whiteboard with patient status and room assignments",
    icon: <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600">
      <Layout className="h-4 w-4" />
    </div>,
    defaultSize: { w: 6, h: 4 },
    component: WhiteboardWidget,
    allowedRoles: ["SUPER_ADMIN", "PRACTICE_ADMIN", "PRACTICE_MANAGER", "VETERINARIAN", "TECHNICIAN"]
  },
  notifications: {
    type: "notifications",
    title: "Notifications",
    description: "Latest alerts, reminders and system notifications",
    icon: <div className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
      <Bell className="h-4 w-4" />
    </div>,
    defaultSize: { w: 4, h: 3 },
    component: NotificationsWidget,
    allowedRoles: ["SUPER_ADMIN", "PRACTICE_ADMIN", "PRACTICE_MANAGER", "VETERINARIAN", "TECHNICIAN", "RECEPTIONIST"]
  },
  healthPlans: {
    type: "healthPlans",
    title: "Health Plans",
    description: "Upcoming and active patient health plans and wellness programs",
    icon: <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-600">
      <HeartPulse className="h-4 w-4" />
    </div>,
    defaultSize: { w: 6, h: 4 },
    component: HealthPlansWidget,
    allowedRoles: ["SUPER_ADMIN", "PRACTICE_ADMIN", "PRACTICE_MANAGER", "VETERINARIAN", "TECHNICIAN"]
  },
  petStats: {
    type: "petStats",
    title: "Pet Statistics",
    description: "Statistical overview of patients, species distribution, and check-ins",
    icon: <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-purple-600">
      <PawPrint className="h-4 w-4" />
    </div>,
    defaultSize: { w: 4, h: 3 },
    component: PetStatsWidget,
    allowedRoles: ["SUPER_ADMIN", "PRACTICE_ADMIN", "PRACTICE_MANAGER", "VETERINARIAN"]
  },
  practiceStats: {
    type: "practiceStats",
    title: "Practice Metrics",
    description: "Key performance indicators and operational metrics for your practice",
    icon: <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
      <BarChart3 className="h-4 w-4" />
    </div>,
    defaultSize: { w: 6, h: 4 },
    component: PracticeStatsWidget,
    allowedRoles: ["SUPER_ADMIN", "PRACTICE_ADMIN", "PRACTICE_MANAGER", "ACCOUNTANT"]
  },
  chart: {
    type: "chart",
    title: "Analytics",
    description: "Customizable analytics charts and financial performance visualizations",
    icon: <div className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-100 text-cyan-600">
      <LineChart className="h-4 w-4" />
    </div>,
    defaultSize: { w: 6, h: 4 },
    component: ChartWidget,
    allowedRoles: ["SUPER_ADMIN", "PRACTICE_ADMIN", "PRACTICE_MANAGER", "ACCOUNTANT"]
  }
};

// Helper function to create a new widget
const createNewWidget = (type: string, id: string = `widget-${Date.now()}`): WidgetConfig => {
  const widgetDefinition = WIDGET_CATALOG[type];
  return {
    id,
    type: type as any,
    title: widgetDefinition.title,
    size: "medium",
    position: {
      x: 0,
      y: 0,
      w: widgetDefinition.defaultSize.w,
      h: widgetDefinition.defaultSize.h
    },
    settings: {}
  };
};

// Dashboard configuration interface
interface DashboardConfigSelectorProps {
  selectedConfigId: number | null;
  configs: any[];
  isLoading: boolean;
  onConfigChange: (configId: number) => void;
  onCreateConfig: () => void;
  onDeleteConfig?: (configId: number) => void;
  onSetAsDefault?: (configId: number) => void;
}

// Config selector component
const DashboardConfigSelector: React.FC<DashboardConfigSelectorProps> = ({
  selectedConfigId,
  configs,
  isLoading,
  onConfigChange,
  onCreateConfig,
  onDeleteConfig,
  onSetAsDefault
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSetDefaultConfirm, setShowSetDefaultConfirm] = useState(false);
  const { toast } = useToast();
  
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // If no config is selected, show a message
    if (!selectedConfigId) {
      toast({
        title: "No dashboard selected",
        description: "Please select a dashboard configuration to delete",
        variant: "destructive"
      });
      return;
    }
    
    // If selected config is default, show warning
    const isDefault = configs.find(c => c.id === selectedConfigId)?.isDefault;
    if (isDefault) {
      toast({
        title: "Cannot delete default dashboard",
        description: "Please set another dashboard as default before deleting this one",
        variant: "destructive"
      });
      return;
    }
    
    setShowDeleteConfirm(true);
  };
  
  const handleSetDefaultClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // If no config is selected, show a message
    if (!selectedConfigId) {
      toast({
        title: "No dashboard selected",
        description: "Please select a dashboard configuration to set as default",
        variant: "destructive"
      });
      return;
    }
    
    // If selected config is already default, no need to proceed
    const isDefault = configs.find(c => c.id === selectedConfigId)?.isDefault;
    if (isDefault) {
      toast({
        title: "Already default",
        description: "This dashboard is already set as default",
      });
      return;
    }
    
    setShowSetDefaultConfirm(true);
  };
  
  const confirmDelete = () => {
    if (selectedConfigId && onDeleteConfig) {
      onDeleteConfig(selectedConfigId);
    }
    setShowDeleteConfirm(false);
  };
  
  const confirmSetDefault = () => {
    if (selectedConfigId && onSetAsDefault) {
      onSetAsDefault(selectedConfigId);
    }
    setShowSetDefaultConfirm(false);
  };
  
  const selectedConfig = configs.find(c => c.id === selectedConfigId);
  const isSelectedDefault = selectedConfig?.isDefault;
  
  return (
    <div className="flex items-center gap-2 mb-4">
      <Select 
        disabled={isLoading || !configs?.length}
        value={selectedConfigId?.toString() || ""}
        onValueChange={(value) => onConfigChange(parseInt(value))}
      >
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="Select dashboard" />
        </SelectTrigger>
        <SelectContent>
          {configs?.map(config => (
            <SelectItem key={config.id} value={config.id.toString()}>
              {config.name} {config.isDefault && "(Default)"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Button variant="outline" size="icon" onClick={onCreateConfig} title="Create dashboard">
        <PlusCircle className="h-4 w-4" />
      </Button>
      
      {onSetAsDefault && selectedConfigId && !isSelectedDefault && (
        <Button 
          variant="outline" 
          size="icon" 
          onClick={handleSetDefaultClick}
          title="Set as default dashboard"
          className="text-primary"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-star">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </Button>
      )}
      
      {onDeleteConfig && (
        <Button 
          variant="outline" 
          size="icon" 
          onClick={handleDeleteClick}
          title="Delete dashboard"
          disabled={!selectedConfigId || configs.length <= 1 || isSelectedDefault}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      )}
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Dashboard Configuration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this dashboard configuration? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Set as default confirmation dialog */}
      <AlertDialog open={showSetDefaultConfirm} onOpenChange={setShowSetDefaultConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Set as Default Dashboard</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to set this dashboard as the default?
              This will make it the default dashboard for your practice.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmSetDefault}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Set as Default
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Dialog for adding a new widget
interface AddWidgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddWidget: (type: string) => void;
  userRole: string;
}

const AddWidgetDialog: React.FC<AddWidgetDialogProps> = ({
  open,
  onOpenChange,
  onAddWidget,
  userRole
}) => {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  
  const handleAddWidget = () => {
    if (selectedType) {
      onAddWidget(selectedType);
      onOpenChange(false);
      setSelectedType(null);
    }
  };
  
  const availableWidgets = Object.values(WIDGET_CATALOG).filter(
    widget => widget.allowedRoles.includes(userRole)
  );
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Widget</DialogTitle>
          <DialogDescription>
            Select a widget to add to your dashboard.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 gap-2">
            {availableWidgets.map((widget) => (
              <div
                key={widget.type}
                className={`flex items-center p-3 rounded-md cursor-pointer border ${
                  selectedType === widget.type ? "border-primary bg-primary/5" : "border-border"
                }`}
                onClick={() => setSelectedType(widget.type)}
              >
                {widget.icon}
                <div className="ml-3">
                  <h4 className="text-sm font-medium">{widget.title}</h4>
                  <p className="text-xs text-muted-foreground">{widget.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddWidget} disabled={!selectedType}>
            Add Widget
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Create dashboard dialog
interface CreateDashboardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateDashboard: (name: string, isDefault: boolean) => void;
  isLoading: boolean;
}

const CreateDashboardDialog: React.FC<CreateDashboardDialogProps> = ({
  open,
  onOpenChange,
  onCreateDashboard,
  isLoading
}) => {
  const [name, setName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  
  const handleCreate = () => {
    if (name.trim()) {
      onCreateDashboard(name, isDefault);
      setName("");
      setIsDefault(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Dashboard</DialogTitle>
          <DialogDescription>
            Create a new customizable dashboard layout.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="My Dashboard"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="default" className="text-right">
              Default
            </Label>
            <div className="col-span-3 flex items-center space-x-2">
              <input
                type="checkbox"
                id="default"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
              />
              <Label htmlFor="default">Set as default dashboard</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Main Dashboard component
export function CustomizableDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);
  const [addWidgetOpen, setAddWidgetOpen] = useState(false);
  const [createDashboardOpen, setCreateDashboardOpen] = useState(false);
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [currentConfig, setCurrentConfig] = useState<DashboardConfigData | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Use dashboard configs hook
  const {
    dashboardConfigs,
    defaultConfig,
    isLoading,
    createConfig,
    updateConfig,
    deleteConfig,
    setDefaultConfig,
    generateDefaultWidgetsForRole,
    isPending
  } = useDashboardConfigs();
  
  // Effect to set initial config
  useEffect(() => {
    if (defaultConfig && !selectedConfigId) {
      setSelectedConfigId(defaultConfig.id);
      
      try {
        const parsedConfig = typeof defaultConfig.config === 'string' 
          ? JSON.parse(defaultConfig.config) 
          : defaultConfig.config;
          
        setCurrentConfig(parsedConfig);
      } catch (error) {
        console.error("Error parsing dashboard config:", error);
        toast({
          title: "Error loading dashboard",
          description: "Failed to parse dashboard configuration",
          variant: "destructive"
        });
      }
    } else if (!dashboardConfigs || dashboardConfigs.length === 0) {
      // If no configs exist, set a default one based on role
      const roleBasedWidgets = generateDefaultWidgetsForRole(user?.role || "");
      setCurrentConfig({
        widgets: roleBasedWidgets,
        layout: "grid"
      });
    }
  }, [dashboardConfigs, defaultConfig, selectedConfigId, user, toast, generateDefaultWidgetsForRole]);
  
  // Handle config change
  const handleConfigChange = useCallback((configId: number) => {
    if (!dashboardConfigs) return;
    
    const config = dashboardConfigs.find(c => c.id === configId);
    if (!config) return;
    
    setSelectedConfigId(configId);
    
    try {
      const parsedConfig = typeof config.config === 'string' 
        ? JSON.parse(config.config) 
        : config.config;
      
      setCurrentConfig(parsedConfig);
      setHasChanges(false);
    } catch (error) {
      console.error("Error parsing dashboard config:", error);
      toast({
        title: "Error loading dashboard",
        description: "Failed to parse dashboard configuration",
        variant: "destructive"
      });
    }
  }, [dashboardConfigs, toast]);
  
  // Handle add widget
  const handleAddWidget = (type: string) => {
    if (!currentConfig) return;
    
    const newWidget = createNewWidget(type);
    
    // Add widget to current config
    const updatedConfig = {
      ...currentConfig,
      widgets: [...(currentConfig.widgets || []), newWidget]
    };
    
    setCurrentConfig(updatedConfig);
    setHasChanges(true);
  };
  
  // Handle remove widget
  const handleRemoveWidget = (widgetId: string) => {
    if (!currentConfig) return;
    
    // Remove widget from current config
    const updatedConfig = {
      ...currentConfig,
      widgets: currentConfig.widgets.filter((w: WidgetConfig) => w.id !== widgetId)
    };
    
    setCurrentConfig(updatedConfig);
    setHasChanges(true);
  };
  
  // Handle save layout
  const handleSaveLayout = () => {
    if (!currentConfig || !selectedConfigId) {
      // If no config is selected, create a new one
      setCreateDashboardOpen(true);
      return;
    }
    
    // Update the config in the database
    updateConfig({
      id: selectedConfigId,
      config: {
        config: JSON.stringify(currentConfig)
      }
    });
    
    setHasChanges(false);
  };
  
  // Handle create dashboard
  const handleCreateDashboard = (name: string, isDefault: boolean) => {
    if (!currentConfig || !user) return;
    
    // Create a new config in the database
    createConfig({
      name,
      userId: user.id,
      practiceId: user.practiceId || 1,
      config: JSON.stringify(currentConfig),
      isDefault,
      role: null
    });
    
    setCreateDashboardOpen(false);
    setHasChanges(false);
  };
  
  // Handle delete dashboard config
  const handleDeleteConfig = (configId: number) => {
    if (!dashboardConfigs) return;
    
    // Check if this config is the one we're currently viewing
    if (selectedConfigId === configId) {
      // Find another config to switch to
      const otherConfigs = dashboardConfigs.filter(c => c.id !== configId);
      if (otherConfigs.length > 0) {
        // Prefer the default config
        const defaultConfig = otherConfigs.find(c => c.isDefault);
        const nextConfig = defaultConfig || otherConfigs[0];
        
        // Update the selected config
        setSelectedConfigId(nextConfig.id);
        
        // Also update the current config with the next config's data
        try {
          const parsedConfig = typeof nextConfig.config === 'string' 
            ? JSON.parse(nextConfig.config) 
            : nextConfig.config;
            
          setCurrentConfig(parsedConfig);
        } catch (error) {
          console.error("Error parsing next dashboard config:", error);
        }
      }
    }
    
    // Delete the config
    deleteConfig(configId);
  };
  
  // Handle set as default dashboard
  const handleSetAsDefault = async (configId: number) => {
    if (!dashboardConfigs) return;
    
    try {
      // First, find all configs that are marked as default
      const defaultConfigs = dashboardConfigs.filter(c => c.isDefault);
      
      // For each default config, unmark it as default
      for (const config of defaultConfigs) {
        if (config.id !== configId) {
          // Update the config to not be default
          await updateConfig({
            id: config.id,
            config: {
              isDefault: false
            }
          });
        }
      }
      
      // Now set the selected config as default
      await setDefaultConfig(configId);
      
      toast({
        title: "Default dashboard updated",
        description: "The selected dashboard has been set as the default"
      });
    } catch (error) {
      console.error("Error setting default dashboard:", error);
      toast({
        title: "Error",
        description: "Failed to set dashboard as default",
        variant: "destructive"
      });
    }
  };
  
  // Render widget based on type
  const renderWidget = (widget: WidgetConfig) => {
    const widgetDef = WIDGET_CATALOG[widget.type];
    if (!widgetDef) return <div>Unknown widget type: {widget.type}</div>;
    
    const WidgetComponent = widgetDef.component;
    return <WidgetComponent widget={widget} />;
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }
  
  if (!currentConfig || !currentConfig.widgets || currentConfig.widgets.length === 0) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <div className="flex space-x-2">
            <DashboardConfigSelector
              selectedConfigId={selectedConfigId}
              configs={dashboardConfigs || []}
              isLoading={isLoading}
              onConfigChange={handleConfigChange}
              onCreateConfig={() => setCreateDashboardOpen(true)}
              onDeleteConfig={handleDeleteConfig}
              onSetAsDefault={handleSetAsDefault}
            />
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center h-[calc(100vh-250px)] text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary mb-6">
            <Layout className="h-10 w-10" />
          </div>
          <h3 className="text-2xl font-semibold mb-4">
            No widgets have been added to your dashboard yet
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            Add widgets to customize your dashboard and get a quick overview of your practice.
          </p>
          <Button onClick={() => setAddWidgetOpen(true)} className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Add Your First Widget
          </Button>
          
          <CreateDashboardDialog
            open={createDashboardOpen}
            onOpenChange={setCreateDashboardOpen}
            onCreateDashboard={handleCreateDashboard}
            isLoading={isPending}
          />
          
          <AddWidgetDialog
            open={addWidgetOpen}
            onOpenChange={setAddWidgetOpen}
            onAddWidget={handleAddWidget}
            userRole={user?.role || ""}
          />
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <div className="flex space-x-2">
            <DashboardConfigSelector
              selectedConfigId={selectedConfigId}
              configs={dashboardConfigs || []}
              isLoading={isLoading}
              onConfigChange={handleConfigChange}
              onCreateConfig={() => setCreateDashboardOpen(true)}
              onDeleteConfig={handleDeleteConfig}
              onSetAsDefault={handleSetAsDefault}
            />
            
            <Button
              variant={editMode ? "default" : "ghost"}
              onClick={() => setEditMode(!editMode)}
              className={`hover:bg-accent/50 transition-colors duration-300 ${!editMode ? 'border border-dashed' : ''}`}
            >
              <div className="flex items-center gap-2">
                {!editMode ? (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Settings className="h-3 w-3" />
                  </div>
                ) : (
                  <Settings className="h-4 w-4" />
                )}
                {editMode ? "Done Editing" : "Edit Dashboard"}
              </div>
            </Button>
            
            {hasChanges && (
              <Button onClick={handleSaveLayout} disabled={isPending}>
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            )}
          </div>
        </div>
        
        {/* Main dashboard content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentConfig.widgets.map((widget: WidgetConfig) => (
            <Card key={widget.id} className="shadow-md">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div className="flex items-start gap-2">
                  {WIDGET_CATALOG[widget.type]?.icon && 
                    <div className="hidden sm:flex mt-1">
                      {WIDGET_CATALOG[widget.type].icon}
                    </div>
                  }
                  <div>
                    <CardTitle className="text-lg">{widget.title}</CardTitle>
                    <p className="text-xs text-muted-foreground hidden sm:block">
                      {WIDGET_CATALOG[widget.type]?.description || ""}
                    </p>
                  </div>
                </div>
                {editMode && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveWidget(widget.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </CardHeader>
              <CardContent>{renderWidget(widget)}</CardContent>
            </Card>
          ))}
          
          {editMode && (
            <Card
              className="shadow-md flex flex-col items-center justify-center min-h-[200px] border-dashed cursor-pointer hover:bg-accent/50 transition-colors duration-300"
              onClick={() => setAddWidgetOpen(true)}
            >
              <div className="flex flex-col items-center justify-center p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
                  <PlusCircle className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-medium mb-1">Add Widget</h3>
                <p className="text-xs text-muted-foreground text-center max-w-[200px]">
                  Customize your dashboard with additional widgets
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
      
      {/* Add widget dialog */}
      <AddWidgetDialog
        open={addWidgetOpen}
        onOpenChange={setAddWidgetOpen}
        onAddWidget={handleAddWidget}
        userRole={user?.role || ""}
      />
      
      {/* Create dashboard dialog */}
      <CreateDashboardDialog
        open={createDashboardOpen}
        onOpenChange={setCreateDashboardOpen}
        onCreateDashboard={handleCreateDashboard}
        isLoading={isPending}
      />
    </div>
  );
}