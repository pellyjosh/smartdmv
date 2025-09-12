import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useRoles } from "@/hooks/use-roles";
import { 
  Search, Plus, MoreHorizontal, Shield, Pencil, Trash2, ChevronDown, ChevronRight, ShieldCheck,
  Eye, FilePlus, Edit, Link, Settings, CheckCircle, Circle, Info as InfoIcon
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { categorizePermissions, formatPermissionName, isPermissionGranted } from "@/lib/permission-utils";

// Define validation schema for role data
const roleFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  description: z.string().optional(),
  practiceId: z.number(),
  // For backward compatibility, we'll keep isCustom field but it's not used in the API
  isCustom: z.boolean().default(true),
  // Add baseRole field to match what the API needs
  baseRole: z.enum(["SUPER_ADMIN", "PRACTICE_ADMIN", "PRACTICE_MANAGER", "VETERINARIAN", "TECHNICIAN", "RECEPTIONIST", "ACCOUNTANT", "CLIENT", "PRACTICE_STAFF", "CUSTOM"]).default("CUSTOM"),
});

interface RolesTabProps {
  practiceId: number;
  isSuperAdmin: boolean;
}

const RolesTab = ({ practiceId, isSuperAdmin }: RolesTabProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  // Role ID can be either a number (for custom roles) or a string (for predefined roles like "PRACTICE_ADMIN")
  const [expandedRoleId, setExpandedRoleId] = useState<number | string | null>(null);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>("details");
  
  // Local state to track permission changes (to avoid lag between UI and server updates)
  const [localPermissionStates, setLocalPermissionStates] = useState<{[key: string]: boolean}>(() => {
    // Try to restore from localStorage to maintain state across page refreshes
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('permissionStates');
        return saved ? JSON.parse(saved) : {};
      } catch (e) {
        console.error("Error loading permission states from localStorage:", e);
        return {};
      }
    }
    return {};
  });

  // Fetch permission categories for the permissions view
  const { data: permissionCategories = [] } = useQuery<any[]>({
    queryKey: ["/api/permission-categories", { practiceId }],
    queryFn: async () => {
      const response = await fetch(`/api/permission-categories?practiceId=${practiceId}`);
      if (!response.ok) throw new Error('Failed to fetch permission categories');
      return response.json();
    },
    enabled: !!practiceId,
  });

  // Fetch role permissions when a role is expanded
  const { data: rolePermissions = [], isLoading: isLoadingPermissions } = useQuery<any[]>({
    queryKey: ["/api/role-permissions", expandedRoleId],
    queryFn: async () => {
      if (!expandedRoleId) return [];
      const response = await fetch(`/api/role-permissions?roleId=${expandedRoleId}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!expandedRoleId,
  });
  
  // For debugging - check what's in the role permissions data
  console.log("Role permissions for role ID:", expandedRoleId);
  console.log("Role permissions data:", rolePermissions);

  // Fetch roles with the current practice context
  const { data: roles = [], isLoading, error } = useQuery<any[]>({
    queryKey: ["/api/roles", { practiceId }],
    queryFn: async () => {
      const response = await fetch(`/api/roles?practiceId=${practiceId}`);
      if (!response.ok) throw new Error('Failed to fetch roles');
      return response.json();
    },
    enabled: true,
  });

  // Create custom role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (data: z.infer<typeof roleFormSchema>) => {
      console.log("Creating custom role with form data:", data);
      
      // Add baseRole and ensure createdById will be set on the server-side
      const customRoleData = {
        ...data,
        baseRole: "CUSTOM" // Default base role for custom roles
      };
      
      console.log("Sending data to server:", customRoleData);
      
      try {
        // Use the dedicated endpoint for custom roles
        const response = await apiRequest("POST", "/api/custom-roles", customRoleData);
        const responseData = await response.json();
        console.log("Server response:", responseData);
        return responseData;
      } catch (error) {
        console.error("Error creating custom role:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Custom role created successfully",
      });
      setIsCreateDialogOpen(false);
      createRoleForm.reset();
      // Invalidate both endpoints to ensure data is refreshed properly
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/custom-roles"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create custom role",
        variant: "destructive",
      });
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async (data: any) => {
      const { id, ...roleData } = data;
      const response = await apiRequest("PATCH", `/api/roles/${id}`, roleData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Role updated successfully",
      });
      setIsEditDialogOpen(false);
      editRoleForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    },
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/roles/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Role deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setSelectedRole(null);
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete role",
        variant: "destructive",
      });
    },
  });

  // Update role permissions mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ roleId, permissionId, granted, permissions, resourceType, action }: { 
      roleId: number | string, // Can be either number for custom roles or string for predefined roles
      permissionId: number, 
      granted: boolean, 
      permissions: any[],
      resourceType?: string,
      action?: string
    }) => {
      // First try direct single permission update
      try {
        const permission = permissions?.find(p => p.id === permissionId);
        
        // If no permission is found, or permissions array is empty, create a new permission object
        let permData = permission;
        
        if (!permData && permissionId) {
          // Create a permission object using the provided ID and resource/action
          permData = {
            id: permissionId,
            resourceType: resourceType,
            action: action,
            granted: granted
          };
          console.log("Created new permission object for update:", permData);
        }
        
        if (permData) {
          // Determine if this is a custom role (numeric ID)
          const isCustomRole = typeof roleId === 'number' || !isNaN(Number(roleId));
          const customRoleId = isCustomRole ? Number(roleId) : null;
          
          console.log(`Updating permission for ${isCustomRole ? 'custom' : 'standard'} role. Role ID: ${roleId}, Custom Role ID: ${customRoleId}`);
          
          // Try to update a single permission first
          console.log(`Updating single permission ${permissionId} for role ${roleId} to granted=${granted}`);
          const directResponse = await apiRequest("PATCH", `/api/role-permissions/${permissionId}`, { 
            granted,
            roleId,
            customRoleId: customRoleId, // Send the customRoleId explicitly for custom roles
            resourceType: permData.resourceType, 
            action: permData.action 
          });
          
          if (directResponse.ok) {
            console.log("Successfully updated single permission");
            return directResponse.json();
          }
          console.log("Single permission update failed, trying batch update");
        }
      } catch (error) {
        console.error("Error updating single permission:", error);
      }
      
      // Fall back to batch update - ensure permissions is always an array
      console.log("Using batch permission update");
      
      // For each permission in the array, ensure we're setting the correct fields
      const preparedPermissions = Array.isArray(permissions) ? permissions.map(p => {
        // If this is the permission we're updating, make sure its granted state is correct
        if (p.id === permissionId) {
          return { ...p, granted };
        }
        return p;
      }) : [];
      
      // Add the current permission if it's not in the array
      if (permissionId && !preparedPermissions.some(p => p.id === permissionId)) {
        preparedPermissions.push({
          id: permissionId,
          resourceType,
          action,
          granted
        });
      }
      
      const response = await apiRequest("POST", `/api/roles/${roleId}/permissions`, { 
        permissions: preparedPermissions 
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update permissions");
      }
      
      return response.json();
    },
    onSuccess: (_data, variables: any) => {
      toast({
        title: "Success",
        description: "Role permissions updated successfully",
      });
      
      // Invalidate both general permissions query and specific role permissions query
      queryClient.invalidateQueries({ queryKey: ["/api/role-permissions"] });
      
      // This is the specific query key for this role's permissions
      if (variables?.roleId) {
        queryClient.invalidateQueries({ queryKey: ["/api/role-permissions", variables.roleId] });
        queryClient.invalidateQueries({ queryKey: [`/api/roles/${variables.roleId}/permissions`] });
      }
    },
    onError: (error: any, variables: any) => {
      console.error("Permission update failed:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update role permissions",
        variant: "destructive",
      });
      
      // Force refetch the permissions to ensure UI is updated
      queryClient.invalidateQueries({ queryKey: ["/api/role-permissions"] });
      
      if (variables?.roleId) {
        // Refresh the specific role's permissions
        queryClient.invalidateQueries({ queryKey: ["/api/role-permissions", variables.roleId] });
        queryClient.invalidateQueries({ queryKey: [`/api/roles/${variables.roleId}/permissions`] });
      }
    },
  });

  // Form for creating custom roles
  const createRoleForm = useForm<z.infer<typeof roleFormSchema>>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: "",
      description: "",
      practiceId: practiceId,
      isCustom: true,
      baseRole: "CUSTOM", // Make sure baseRole is properly set in the default values
    },
  });

  // Form for editing roles
  const editRoleForm = useForm<z.infer<typeof roleFormSchema>>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: "",
      description: "",
      practiceId: practiceId,
      isCustom: true,
      baseRole: "CUSTOM", // Make sure baseRole is properly set in the default values
    },
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const toggleRoleExpansion = (role: any) => {
    if (expandedRoleId === role.id) {
      // If already expanded, collapse it
      setExpandedRoleId(null);
      setSelectedRole(null);
    } else {
      // Otherwise expand it and load permissions
      // Handle either custom roles with numeric IDs or predefined roles with string IDs
      if (role.isCustom) {
        // For custom roles, use role.id
        setExpandedRoleId(role.id);
      } else {
        // For predefined roles, use role.role (like "PRACTICE_ADMIN")
        setExpandedRoleId(role.role);
      }
      setSelectedRole(role);
    }
  };

  const handleCreateRole = () => {
    setIsCreateDialogOpen(true);
  };

  const handleEditRole = (role: any) => {
    editRoleForm.reset({
      name: role.name,
      description: role.description || "",
      practiceId: role.practiceId || practiceId,
      isCustom: role.isCustom,
      baseRole: role.baseRole || "CUSTOM", // Make sure baseRole is properly set when editing
    });
    setSelectedRole(role);
    setIsEditDialogOpen(true);
  };

  const handleDeleteRole = (role: any) => {
    setSelectedRole(role);
    setIsDeleteDialogOpen(true);
  };

  const onCreateSubmit = (data: z.infer<typeof roleFormSchema>) => {
    createRoleMutation.mutate(data);
  };

  const onEditSubmit = (data: z.infer<typeof roleFormSchema>) => {
    if (selectedRole) {
      updateRoleMutation.mutate({
        id: selectedRole.id,
        ...data,
      });
    }
  };

  const onDeleteConfirm = () => {
    if (selectedRole && selectedRole.id) {
      deleteRoleMutation.mutate(selectedRole.id);
    }
  };

  // Handle permission changes
  const handlePermissionChange = (permissionId: number, granted: boolean, permissionObj: any) => {
    // Save to local state for immediate UI update
    const stateKey = `${expandedRoleId}_${permissionId}`;
    setLocalPermissionStates(prev => {
      const newState = { ...prev, [stateKey]: granted };
      // Save to localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('permissionStates', JSON.stringify(newState));
        } catch (e) {
          console.error("Error saving permission states to localStorage:", e);
        }
      }
      return newState;
    });
    
    // Call the mutation to update on the server
    updatePermissionsMutation.mutate({
      roleId: expandedRoleId!,
      permissionId,
      granted,
      permissions: rolePermissions,
      resourceType: permissionObj.resourceType,
      action: permissionObj.action
    });
  };

  // Filter roles based on search query
  const filteredRoles = searchQuery.trim() === "" 
    ? roles 
    : roles.filter((role: any) => {
        const roleNameLower = (role.name || role.role || "").toLowerCase();
        const searchLower = searchQuery.toLowerCase();
        return roleNameLower.includes(searchLower);
      });

  return (
    <>
      <Card>
        <CardHeader className="flex justify-between">
          <div>
            <CardTitle>Role Management</CardTitle>
            <CardDescription>Manage system and custom roles</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreateRole} size="sm" className="mt-1">
              <Plus className="h-4 w-4 mr-1" />
              Create Custom Role
            </Button>
          </div>
        </CardHeader>
        <CardContent>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="py-8 text-center text-destructive">
              Failed to load roles. Please try again.
            </div>
          ) : (
            <div>
              <div className="flex mb-4">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search roles..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={handleSearch}
                  />
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRoles && filteredRoles.length > 0 ? (
                    filteredRoles.map((role: any) => (
                      <React.Fragment key={role.id || role.role}>
                        <TableRow 
                          className="cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => toggleRoleExpansion(role)}
                        >
                          <TableCell className="w-[40px] pr-0 pl-4">
                            {expandedRoleId === role.id || expandedRoleId === role.role ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          
                          <TableCell>
                            <span className="font-medium">{role.name || role.role}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={role.isCustom ? "default" : "secondary"}>
                              {role.isCustom ? "Custom" : "System"}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {role.description || "No description available"}
                          </TableCell>
                          <TableCell>{role.userCount || 0}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Actions</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {role.isCustom ? (
                                  <>
                                    <DropdownMenuItem onClick={(e) => {
                                      e.stopPropagation(); // Prevent row expansion
                                      // For custom roles, use role.id as the roleId
                                      const roleId = role.id;
                                      setExpandedRoleId(roleId === expandedRoleId ? null : roleId);
                                      setSelectedRole(role);
                                      // Auto-select the permissions tab when clicking "View Permissions"
                                      setActiveTab("permissions");
                                    }}>
                                      <ShieldCheck className="h-4 w-4 mr-2" />
                                      View Permissions
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => {
                                      e.stopPropagation(); // Prevent row expansion
                                      handleEditRole(role);
                                    }}>
                                      <Pencil className="h-4 w-4 mr-2" />
                                      Edit Role
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation(); // Prevent row expansion
                                        handleDeleteRole(role);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete Role
                                    </DropdownMenuItem>
                                  </>
                                ) : (
                                  <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation(); // Prevent row expansion
                                    // For system roles, use role name directly as the roleId
                                    const roleId = role.role || role.id;
                                    setExpandedRoleId(roleId === expandedRoleId ? null : roleId);
                                    setSelectedRole(role);
                                    // Auto-select the permissions tab when clicking "View Permissions"
                                    setActiveTab("permissions");
                                  }}>
                                    <ShieldCheck className="h-4 w-4 mr-2" />
                                    View Permissions
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                        {(expandedRoleId === role.id || expandedRoleId === role.role) && (
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={6} className="p-0">
                              <div className="p-4">
                                <Tabs 
                                  value={activeTab} 
                                  onValueChange={setActiveTab} 
                                  className="w-full"
                                >
                                  <TabsList className="grid w-full max-w-[400px] grid-cols-2">
                                    <TabsTrigger value="details">
                                      Role Details
                                    </TabsTrigger>
                                    <TabsTrigger value="permissions">
                                      Permissions
                                    </TabsTrigger>
                                  </TabsList>
                                  
                                  <TabsContent value="details" className="space-y-4 py-4">
                                    <div className="space-y-2">
                                      <h3 className="text-sm font-medium">Name</h3>
                                      <p className="text-sm">{role.name}</p>
                                    </div>
                                    <div className="space-y-2">
                                      <h3 className="text-sm font-medium">Type</h3>
                                      <Badge variant={role.isCustom ? "default" : "secondary"}>
                                        {role.isCustom ? "Custom" : "System"}
                                      </Badge>
                                    </div>
                                    <div className="space-y-2">
                                      <h3 className="text-sm font-medium">Description</h3>
                                      <p className="text-sm">{role.description || "No description available"}</p>
                                    </div>
                                    {role.practiceId && (
                                      <div className="space-y-2">
                                        <h3 className="text-sm font-medium">Practice</h3>
                                        <p className="text-sm">{role.practiceName || `Practice ID: ${role.practiceId}`}</p>
                                      </div>
                                    )}
                                  </TabsContent>
                                  
                                  <TabsContent value="permissions" className="py-4">
                                    {isLoadingPermissions ? (
                                      <div className="flex justify-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                      </div>
                                    ) : (
                                      <ScrollArea className="h-[400px] pr-4">
                                        {/* Always show categories, even if permissions are empty */}
                                        <div className="space-y-6">
                                            {(() => {
                                              console.log(`Roles tab - Rendering permissions for role: ${expandedRoleId}`);
                                              console.log(`Roles tab - rolePermissions length: ${rolePermissions?.length || 0}`);
                                              
                                              // Use the categorizePermissions utility for consistent display
                                              const categorized = categorizePermissions(rolePermissions || []);
                                              
                                              return Object.entries(categorized);
                                            })().map(([categoryName, categoryPermissions]: [string, any[]]) => {
                                              
                                              // Check if all permissions are granted
                                              const allGranted = categoryPermissions.every((permission: any) => {
                                                const localStateKey = `${expandedRoleId}_${permission.id}`;
                                                const hasLocalState = localPermissionStates[localStateKey] !== undefined;
                                                
                                                // Find if this permission is granted in rolePermissions
                                                const permissionInRole = rolePermissions?.find((rp: any) => 
                                                  (rp.permissionId === permission.id) || 
                                                  (rp.resourceType === permission.resourceType && rp.action === permission.action)
                                                );
                                                
                                                return hasLocalState 
                                                  ? localPermissionStates[localStateKey] 
                                                  : isPermissionGranted(permissionInRole);
                                              });
                                              
                                              // Function to toggle all permissions in this category
                                              const toggleAllPermissions = (newGrantedState: boolean) => {
                                                categoryPermissions.forEach((permission: any) => {
                                                  // Find if this permission is granted in rolePermissions
                                                  const permissionInRole = rolePermissions?.find((rp: any) => 
                                                    (rp.permissionId === permission.id) || 
                                                    (rp.resourceType === permission.resourceType && rp.action === permission.action)
                                                  );
                                                  
                                                  // Create permission object for update
                                                  const permObj = {
                                                    id: permissionInRole?.id || -1,
                                                    permissionId: permission.id,
                                                    resourceType: permission.resourceType,
                                                    action: permission.action,
                                                    granted: newGrantedState,
                                                    category: categoryName
                                                  };
                                                  
                                                  // Check current state and only toggle if needed
                                                  const localStateKey = `${expandedRoleId}_${permission.id}`;
                                                  const hasLocalState = localPermissionStates[localStateKey] !== undefined;
                                                  const currentState = hasLocalState 
                                                    ? localPermissionStates[localStateKey] 
                                                    : isPermissionGranted(permissionInRole);
                                                  
                                                  if (currentState !== newGrantedState) {
                                                    handlePermissionChange(permission.id, newGrantedState, permObj);
                                                  }
                                                });
                                              };
                                              
                                              return (
                                                <div key={categoryName} className="border rounded-md p-4">
                                                  <div className="flex items-center justify-between mb-2">
                                                    <div>
                                                      <h4 className="text-sm font-semibold">{categoryName}</h4>
                                                      <p className="text-xs text-muted-foreground">{categoryName} permissions</p>
                                                    </div>
                                                    <div className="flex items-center">
                                                      <button
                                                        type="button"
                                                        onClick={() => toggleAllPermissions(!allGranted)}
                                                        className={`w-11 h-6 rounded-full cursor-pointer relative transition-colors duration-200 flex items-center focus:outline-none ${
                                                          allGranted 
                                                            ? 'bg-primary hover:bg-primary/90 active:bg-primary/80' 
                                                            : 'bg-slate-300 hover:bg-slate-400 active:bg-slate-500'
                                                        }`}
                                                      >
                                                        <span className="sr-only">
                                                          {allGranted ? 'Disable' : 'Enable'} all permissions
                                                        </span>
                                                        <span 
                                                          className={`inline-block rounded-full bg-white h-5 w-5 shadow-md transform transition-transform duration-200 ${
                                                            allGranted ? 'translate-x-5' : 'translate-x-0'
                                                          } flex items-center justify-center`}
                                                          style={{left: '2px', position: 'absolute'}}
                                                        >
                                                          {allGranted && (
                                                            <span className="w-2 h-2 rounded-full bg-primary/40 inline-block"></span>
                                                          )}
                                                        </span>
                                                      </button>
                                                    </div>
                                                  </div>
                                                  <div className="space-y-2 mt-2">
                                                    {(() => {
                                                      // Using the utility function for consistent permission name formatting
                                                      
                                                      // Group permissions by resource type to make the display cleaner
                                                      // Use an object instead of a Set to avoid compatibility issues
                                                      const resourceTypeMap: Record<string, boolean> = {};
                                                      categoryPermissions.forEach((p: any) => {
                                                        if (p.resourceType) resourceTypeMap[p.resourceType] = true;
                                                      });
                                                      const resourceTypes = Object.keys(resourceTypeMap);
                                                      
                                                      return resourceTypes.map((resourceType: string) => {
                                                        const resourcePermissions = categoryPermissions.filter((p: any) => p.resourceType === resourceType);
                                                        
                                                        return (
                                                          <div key={resourceType} className="mb-4 bg-muted/30 rounded-md p-3">
                                                            <h4 className="text-sm font-semibold mb-2 text-primary-foreground bg-primary/90 -mx-3 -mt-3 px-3 py-2 rounded-t-md flex items-center">
                                                              <ShieldCheck className="h-4 w-4 mr-2" />
                                                              {formatPermissionName(resourceType, "").split(' ')[1] || resourceType}
                                                            </h4>
                                                            
                                                            <div className="space-y-0 mt-3">
                                                              {resourcePermissions.map((permission: any) => {
                                                                // Find if this permission is granted in rolePermissions
                                                                const permissionInRole = rolePermissions?.find((rp: any) => 
                                                                  (rp.permissionId === permission.id) || 
                                                                  (rp.resourceType === permission.resourceType && rp.action === permission.action)
                                                                );
                                                                
                                                                // Check our local state first, then fall back to server data
                                                                const localStateKey = `${expandedRoleId}_${permission.id}`;
                                                                const hasLocalState = localPermissionStates[localStateKey] !== undefined;
                                                                const isGranted = hasLocalState 
                                                                  ? localPermissionStates[localStateKey] 
                                                                  : isPermissionGranted(permissionInRole);
                                                                
                                                                return (
                                                                  <div key={permission.id} 
                                                                    className={`flex items-center justify-between p-2 ${isGranted ? 'bg-primary/5' : 'bg-transparent'} 
                                                                      hover:bg-muted rounded-sm -mx-1 transition-colors duration-100`}
                                                                  >
                                                                    <div className="flex-1">
                                                                      <h5 className="text-sm font-medium flex items-center">
                                                                        {hasLocalState && (
                                                                          <span className="w-2 h-2 rounded-full bg-yellow-500 mr-1.5 inline-block" title="Local override"></span>
                                                                        )}
                                                                        {permission.name || formatPermissionName(permission.resourceType, permission.action)}
                                                                      </h5>
                                                                      <p className="text-xs text-muted-foreground">
                                                                        {permission.description || `Can ${permission.action.toLowerCase()} ${permission.resourceType.toLowerCase()}`}
                                                                      </p>
                                                                    </div>
                                                                    {/* Custom toggle button implementation that manages its own state */}
                                                                    <button
                                                                      type="button"
                                                                      onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        const newState = !isGranted;
                                                                        const permObj = {
                                                                          id: permissionInRole?.id || -1,
                                                                          permissionId: permission.id,
                                                                          resourceType: permission.resourceType,
                                                                          action: permission.action,
                                                                          granted: newState,
                                                                          category: categoryName
                                                                        };
                                                                        
                                                                        // Also update the DOM directly with a temporary visual indicator of success
                                                                        const button = e.currentTarget;
                                                                        button.classList.add(newState ? 'bg-green-500' : 'bg-slate-400');
                                                                        setTimeout(() => {
                                                                          button.classList.remove(newState ? 'bg-green-500' : 'bg-slate-400');
                                                                        }, 300);
                                                                        
                                                                        handlePermissionChange(permission.id, newState, permObj);
                                                                      }}
                                                                      className={`w-11 h-6 rounded-full cursor-pointer relative transition-colors duration-200 flex items-center focus:outline-none ${
                                                                        isGranted 
                                                                          ? 'bg-primary hover:bg-primary/90 active:bg-primary/80' 
                                                                          : 'bg-slate-300 hover:bg-slate-400 active:bg-slate-500'
                                                                      }`}
                                                                    >
                                                                      <span className="sr-only">
                                                                        {isGranted ? 'Disable' : 'Enable'} permission
                                                                      </span>
                                                                      <span 
                                                                        className={`inline-block rounded-full bg-white h-5 w-5 shadow-md transform transition-transform duration-200 ${
                                                                          isGranted ? 'translate-x-5' : 'translate-x-0'
                                                                        } flex items-center justify-center`}
                                                                        style={{left: '2px', position: 'absolute'}}
                                                                      >
                                                                        {isGranted && (
                                                                          <span className="w-2 h-2 rounded-full bg-primary/40 inline-block"></span>
                                                                        )}
                                                                      </span>
                                                                    </button>
                                                                  </div>
                                                                );
                                                              })}
                                                            </div>
                                                          </div>
                                                        );
                                                      });
                                                    })()}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                      </ScrollArea>
                                    )}
                                  </TabsContent>
                                </Tabs>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                        {searchQuery ? "No roles match your search" : "No roles found"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Update role details
            </DialogDescription>
          </DialogHeader>
          <Form {...editRoleForm}>
            <form onSubmit={editRoleForm.handleSubmit(onEditSubmit)} className="space-y-4 py-4">
              <FormField
                control={editRoleForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editRoleForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateRoleMutation.isPending}>
                  {updateRoleMutation.isPending ? "Updating..." : "Update Role"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Create Custom Role Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Custom Role</DialogTitle>
            <DialogDescription>
              Create a new custom role for your practice
            </DialogDescription>
          </DialogHeader>
          <Form {...createRoleForm}>
            <form onSubmit={createRoleForm.handleSubmit(onCreateSubmit)} className="space-y-4 py-4">
              <FormField
                control={createRoleForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter role name" {...field} />
                    </FormControl>
                    <FormDescription>
                      Choose a descriptive name for this role
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createRoleForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter role description"
                        {...field} 
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      Describe the purpose and responsibilities of this role
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createRoleMutation.isPending}>
                  {createRoleMutation.isPending ? "Creating..." : "Create Role"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Role Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the role "{selectedRole?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Users assigned to this role will need to be reassigned to a different role.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={onDeleteConfirm}
              disabled={deleteRoleMutation.isPending}
            >
              {deleteRoleMutation.isPending ? "Deleting..." : "Delete Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </>
  );
};

export default RolesTab;