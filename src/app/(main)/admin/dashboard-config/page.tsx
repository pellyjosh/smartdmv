"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDashboardConfigs, type WidgetConfig, type DashboardConfigData } from '@/hooks/use-dashboard-config';
import { useUser } from '@/context/UserContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CustomizableDashboard } from '@/components/dashboard/customizable-dashboard';
import { Loader2, Plus, Save, Edit, Settings2, FileText, Copy, Star } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

// Inline UserRole definitions
const UserRole = {
  VETERINARIAN: 'VETERINARIAN',
  TECHNICIAN: 'TECHNICIAN',
  RECEPTIONIST: 'RECEPTIONIST',
  PRACTICE_MANAGER: 'PRACTICE_MANAGER',
  PRACTICE_ADMIN: 'PRACTICE_ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
  CLIENT: 'CLIENT'
} as const;

// Form schemas definitions
const widgetFormSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Widget title is required"),
  type: z.enum(["appointments", "whiteboard", "notifications", "healthPlans", "petStats", "practiceStats", "chart"]),
  size: z.enum(["small", "medium", "large"]),
  settings: z.record(z.any()).optional()
});

const configFormSchema = z.object({
  name: z.string().min(1, "Configuration name is required"),
  isDefault: z.boolean()
});

const roleTemplateFormSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  role: z.string().min(1, "Role is required")
});

// Simple UUID generation - using Date-based ID for simplicity
const uuidv4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export default function DashboardConfigPage() {
  const { user, userPracticeId } = useUser();
  const { toast } = useToast();
  const {
    dashboardConfigs,
    defaultConfig,
    isLoading,
    createConfig,
    updateConfig,
    deleteConfig,
    setDefaultConfig,
    createRoleTemplate,
    generateDefaultWidgetsForRole,
    getRoleBasedConfigTemplate,
    isPending
  } = useDashboardConfigs();

  const [activeTab, setActiveTab] = useState('personal');
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [currentConfig, setCurrentConfig] = useState<DashboardConfigData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showWidgetModal, setShowWidgetModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showRoleTemplateModal, setShowRoleTemplateModal] = useState(false);
  const [editingWidget, setEditingWidget] = useState<WidgetConfig | null>(null);
  const [isNewConfig, setIsNewConfig] = useState(false);

  const widgetForm = useForm<z.infer<typeof widgetFormSchema>>({
    resolver: zodResolver(widgetFormSchema),
    defaultValues: {
      title: '',
      type: 'appointments',
      size: 'medium',
    }
  });

  const configForm = useForm<z.infer<typeof configFormSchema>>({
    resolver: zodResolver(configFormSchema),
    defaultValues: {
      name: '',
      isDefault: false,
    }
  });

  const roleTemplateForm = useForm<z.infer<typeof roleTemplateFormSchema>>({
    resolver: zodResolver(roleTemplateFormSchema),
    defaultValues: {
      name: '',
      role: '',
    }
  });

  useEffect(() => {
    if (dashboardConfigs && dashboardConfigs.length > 0) {
      if (defaultConfig) {
        setSelectedConfigId(defaultConfig.id);
        try {
          setCurrentConfig(JSON.parse(defaultConfig.config as unknown as string) as DashboardConfigData);
        } catch (e) {
          console.error('Error parsing dashboard config', e);
          setCurrentConfig({ widgets: [] });
        }
      }
    }
  }, [dashboardConfigs, defaultConfig]);

  const handleSelectConfig = (configId: number) => {
    setSelectedConfigId(configId);
    const config = dashboardConfigs?.find(c => c.id === configId);
    if (config) {
      try {
        setCurrentConfig(JSON.parse(config.config as unknown as string) as DashboardConfigData);
      } catch (e) {
        console.error('Error parsing dashboard config', e);
        setCurrentConfig({ widgets: [] });
      }
    }
  };

  const handleEditWidget = (widget: WidgetConfig) => {
    setEditingWidget(widget);
    widgetForm.reset({
      id: widget.id,
      title: widget.title,
      type: widget.type,
      size: widget.size,
      settings: widget.settings
    });
    setShowWidgetModal(true);
  };

  const handleRemoveWidget = (widgetId: string) => {
    if (!currentConfig) return;

    setCurrentConfig({
      ...currentConfig,
      widgets: currentConfig.widgets.filter(w => w.id !== widgetId)
    });
  };

  const handleAddWidget = () => {
    setEditingWidget(null);
    widgetForm.reset({
      title: '',
      type: 'appointments',
      size: 'medium',
    });
    setShowWidgetModal(true);
  };

  const handleSaveWidget = (data: z.infer<typeof widgetFormSchema>) => {
    if (!currentConfig) return;

    const widgetId = data.id || uuidv4();
    const newWidget: WidgetConfig = {
      id: widgetId,
      title: data.title,
      type: data.type,
      size: data.size,
      position: editingWidget?.position || { x: 0, y: 0, w: 6, h: 2 },
      settings: data.settings || {}
    };

    let updatedWidgets;
    if (editingWidget) {
      updatedWidgets = currentConfig.widgets.map(w =>
        w.id === widgetId ? newWidget : w
      );
    } else {
      updatedWidgets = [...currentConfig.widgets, newWidget];
    }

    setCurrentConfig({
      ...currentConfig,
      widgets: updatedWidgets
    });

    setShowWidgetModal(false);
  };

  const handleSaveLayout = () => {
    if (!currentConfig || !selectedConfigId) return;

    updateConfig({
      id: selectedConfigId,
      config: JSON.stringify(currentConfig)
    });
  };

  const handleCreateConfig = () => {
    setIsNewConfig(true);
    configForm.reset({
      name: '',
      isDefault: dashboardConfigs?.length === 0
    });
    setShowConfigModal(true);
  };

  const handleEditConfig = () => {
    if (!selectedConfigId) return;

    const config = dashboardConfigs?.find(c => c.id === selectedConfigId);
    if (!config) return;

    setIsNewConfig(false);
    configForm.reset({
      name: config.name,
      isDefault: config.isDefault || false
    });
    setShowConfigModal(true);
  };

  const handleSaveConfig = (data: z.infer<typeof configFormSchema>) => {
    if (isNewConfig) {
      createConfig({
        name: data.name,
        userId: user?.id,
        practiceId: userPracticeId,
        config: JSON.stringify(currentConfig || { widgets: [] }),
        isDefault: data.isDefault
      });
    } else if (selectedConfigId) {
      updateConfig({
        id: selectedConfigId,
        config: {
          name: data.name,
          isDefault: data.isDefault
        }
      });
    }

    setShowConfigModal(false);
  };

  const handleSetDefaultConfig = () => {
    if (!selectedConfigId) return;
    setDefaultConfig(selectedConfigId);
  };

  const handleToggleEdit = () => {
    setIsEditing(!isEditing);
    if (isEditing) {
      handleSaveLayout();
    }
  };

  const handleCreateRoleTemplate = () => {
    setShowRoleTemplateModal(true);
    roleTemplateForm.reset({
      name: '',
      role: '',
    });
  };

  const handleSaveRoleTemplate = async (data: z.infer<typeof roleTemplateFormSchema>) => {
    if (!userPracticeId || !user?.id) {
      toast({
        title: 'Error',
        description: 'Missing user or practice information',
        variant: 'destructive'
      });
      return;
    }

    const roleWidgets = generateDefaultWidgetsForRole(data.role);
    const templateConfig: DashboardConfigData = {
      widgets: roleWidgets
    };

    createRoleTemplate({
      id: Date.now(),
      role: data.role,
      name: data.name,
      config: JSON.stringify(templateConfig),
      userId: Number(user.id),
      practiceId: Number(userPracticeId)
    });

    setShowRoleTemplateModal(false);
  };

  const handleApplyRoleTemplate = async (role: string) => {
    if (!userPracticeId) return;

    try {
      const template = await getRoleBasedConfigTemplate(role);

      if (template) {
        try {
          const parsedConfig = JSON.parse(template.config as unknown as string) as DashboardConfigData;
          setCurrentConfig(parsedConfig);
          toast({
            title: 'Template Applied',
            description: `The ${getRoleName(role)} template has been applied. Save your changes to keep them.`
          });
        } catch (e) {
          console.error('Error parsing template config', e);
          toast({
            title: 'Error',
            description: 'Could not parse template configuration',
            variant: 'destructive'
          });
        }
      } else {
        const roleWidgets = generateDefaultWidgetsForRole(role);
        setCurrentConfig({ widgets: roleWidgets });
        toast({
          title: 'Default Template Applied',
          description: `A default ${getRoleName(role)} template has been applied. Save your changes to keep them.`
        });
      }
    } catch (error) {
      console.error('Error applying role template:', error);
      toast({
        title: 'Error',
        description: 'Could not apply role template',
        variant: 'destructive'
      });
    }
  };

  const getRoleName = (role: string): string => {
    switch (role) {
      case UserRole.VETERINARIAN:
        return 'Veterinarian';
      case UserRole.TECHNICIAN:
        return 'Technician';
      case UserRole.RECEPTIONIST:
        return 'Receptionist';
      case UserRole.PRACTICE_MANAGER:
        return 'Practice Manager';
      case UserRole.PRACTICE_ADMIN:
        return 'Practice Administrator';
      case UserRole.SUPER_ADMIN:
        return 'Super Administrator';
      case UserRole.CLIENT:
        return 'Client';
      default:
        return role;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isPracticeAdmin = (user?.role === 'ADMINISTRATOR' || user?.role === 'PRACTICE_ADMINISTRATOR' || user?.role === UserRole.SUPER_ADMIN);

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard Configuration</h1>
          <p className="text-muted-foreground">
            Customize your dashboard by adding, removing, and arranging widgets
          </p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleCreateConfig}>
            <Plus className="w-4 h-4 mr-2" />
            New Config
          </Button>
          <Button variant={isEditing ? 'secondary' : 'default'} onClick={handleToggleEdit}>
            {isEditing ? (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Layout
              </>
            ) : (
              <>
                <Edit className="w-4 h-4 mr-2" />
                Edit Layout
              </>
            )}
          </Button>
        </div>
      </div>

      {isPracticeAdmin && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="personal">Personal Dashboards</TabsTrigger>
            <TabsTrigger value="role">Role Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="mt-4">
            {dashboardConfigs && dashboardConfigs.length > 0 ? (
              <div className="bg-card rounded-lg shadow-sm border p-3 mb-6">
                <div className="flex flex-wrap gap-2">
                  <div className="flex-1 min-w-[200px]">
                    <Select
                      value={selectedConfigId?.toString()}
                      onValueChange={(value) => handleSelectConfig(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a configuration" />
                      </SelectTrigger>
                      <SelectContent>
                        {dashboardConfigs.map((config) => (
                          <SelectItem key={config.id} value={config.id.toString()}>
                            {config.name} {config.isDefault && <Star className="inline w-3 h-3 ml-1" />}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedConfigId && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleEditConfig}>
                        <Settings2 className="w-4 h-4 mr-1" />
                        Edit Config
                      </Button>
                      {dashboardConfigs.find(c => c.id === selectedConfigId)?.isDefault === false && (
                        <Button variant="outline" size="sm" onClick={handleSetDefaultConfig}>
                          <Star className="w-4 h-4 mr-1" />
                          Set as Default
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-card rounded-lg shadow-sm border p-6 mb-6 text-center">
                <h3 className="text-lg font-medium mb-2">No Dashboard Configurations Found</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first dashboard configuration to get started.
                </p>
                <Button onClick={handleCreateConfig}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Dashboard Configuration
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="role" className="mt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Role-Based Dashboard Templates</h3>
              <Button variant="outline" onClick={handleCreateRoleTemplate}>
                <FileText className="w-4 h-4 mr-2" />
                Create Template
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <RoleTemplateCard
                title="Veterinarian"
                description="Dashboard optimized for veterinarians"
                role={UserRole.VETERINARIAN}
                onApply={handleApplyRoleTemplate}
              />
              <RoleTemplateCard
                title="Technician"
                description="Dashboard optimized for veterinary technicians"
                role={UserRole.TECHNICIAN}
                onApply={handleApplyRoleTemplate}
              />
              <RoleTemplateCard
                title="Receptionist"
                description="Dashboard optimized for front desk staff"
                role={UserRole.RECEPTIONIST}
                onApply={handleApplyRoleTemplate}
              />
              <RoleTemplateCard
                title="Practice Manager"
                description="Dashboard optimized for practice managers"
                role={UserRole.PRACTICE_MANAGER}
                onApply={handleApplyRoleTemplate}
              />
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Non-practice admin section */}
      {!isPracticeAdmin && dashboardConfigs && dashboardConfigs.length > 0 && (
        <div className="bg-card rounded-lg shadow-sm border p-3 mb-6">
          <div className="flex flex-wrap gap-2">
            <div className="flex-1 min-w-[200px]">
              <Select
                value={selectedConfigId?.toString()}
                onValueChange={(value) => handleSelectConfig(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a configuration" />
                </SelectTrigger>
                <SelectContent>
                  {dashboardConfigs.map((config) => (
                    <SelectItem key={config.id} value={config.id.toString()}>
                      {config.name} {config.isDefault && <Star className="inline w-3 h-3 ml-1" />}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedConfigId && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleEditConfig}>
                  <Settings2 className="w-4 h-4 mr-1" />
                  Edit Config
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {!isPracticeAdmin && (!dashboardConfigs || dashboardConfigs.length === 0) && (
        <div className="bg-card rounded-lg shadow-sm border p-6 mb-6 text-center">
          <h3 className="text-lg font-medium mb-2">No Dashboard Configurations Found</h3>
          <p className="text-muted-foreground mb-4">
            Create your first dashboard configuration to get started.
          </p>
          <Button onClick={handleCreateConfig}>
            <Plus className="w-4 h-4 mr-2" />
            Create Dashboard Configuration
          </Button>
        </div>
      )}

      <CustomizableDashboard />

      {/* Widget Edit/Add Modal */}
      <Dialog open={showWidgetModal} onOpenChange={setShowWidgetModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingWidget ? 'Edit Widget' : 'Add Widget'}</DialogTitle>
            <DialogDescription>
              Configure your dashboard widget
            </DialogDescription>
          </DialogHeader>
          <Form {...widgetForm}>
            <form onSubmit={widgetForm.handleSubmit(handleSaveWidget)} className="space-y-4">
              <FormField
                control={widgetForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Widget Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={widgetForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Widget Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select widget type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="appointments">Appointments</SelectItem>
                        <SelectItem value="whiteboard">Whiteboard</SelectItem>
                        <SelectItem value="notifications">Notifications</SelectItem>
                        <SelectItem value="healthPlans">Health Plans</SelectItem>
                        <SelectItem value="petStats">Pet Statistics</SelectItem>
                        <SelectItem value="practiceStats">Practice Statistics</SelectItem>
                        <SelectItem value="chart">Chart</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={widgetForm.control}
                name="size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Widget Size</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select widget size" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="small">Small</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="large">Large</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit">Save Widget</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Config Edit/Add Modal */}
      <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isNewConfig ? 'Create Dashboard Configuration' : 'Edit Dashboard Configuration'}
            </DialogTitle>
            <DialogDescription>
              {isNewConfig
                ? 'Create a new dashboard configuration'
                : 'Update your dashboard configuration settings'}
            </DialogDescription>
          </DialogHeader>
          <Form {...configForm}>
            <form onSubmit={configForm.handleSubmit(handleSaveConfig)} className="space-y-4">
              <FormField
                control={configForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Configuration Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Dashboard" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={configForm.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Default Configuration</FormLabel>
                      <FormDescription>
                        Make this your default dashboard configuration
                      </FormDescription>
                    </div>
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="accent-primary h-4 w-4"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit">{isNewConfig ? 'Create' : 'Save'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Role Template Create Modal */}
      <Dialog open={showRoleTemplateModal} onOpenChange={setShowRoleTemplateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Role Template</DialogTitle>
            <DialogDescription>
              Create a dashboard template that will be used as the default for a specific role
            </DialogDescription>
          </DialogHeader>
          <Form {...roleTemplateForm}>
            <form onSubmit={roleTemplateForm.handleSubmit(handleSaveRoleTemplate)} className="space-y-4">
              <FormField
                control={roleTemplateForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Standard Veterinarian Dashboard" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={roleTemplateForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Role</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Staff Roles</SelectLabel>
                          <SelectItem value={UserRole.VETERINARIAN}>Veterinarian</SelectItem>
                          <SelectItem value={UserRole.TECHNICIAN}>Technician</SelectItem>
                          <SelectItem value={UserRole.RECEPTIONIST}>Receptionist</SelectItem>
                          <SelectItem value={UserRole.PRACTICE_MANAGER}>Practice Manager</SelectItem>
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel>Other</SelectLabel>
                          <SelectItem value={UserRole.CLIENT}>Client</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      This template will be available for users with this role
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit">Create Template</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper component for role template cards
function RoleTemplateCard({
  title,
  description,
  role,
  onApply
}: {
  title: string;
  description: string;
  role: string;
  onApply: (role: string) => void;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{title}</CardTitle>
          <Badge variant="outline" className="h-6 capitalize">
            {title.toLowerCase().includes('practice manager') ? 'Manager' : title.toLowerCase().includes('receptionist') ? 'Staff' : 'Staff'}
          </Badge>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0 pb-2">
        <p className="text-sm text-muted-foreground">
          Includes relevant widgets and metrics for this role
        </p>
      </CardContent>
      <CardFooter>
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => onApply(role)}
        >
          <Copy className="w-4 h-4 mr-2" />
          Apply Template
        </Button>
      </CardFooter>
    </Card>
  );
}
