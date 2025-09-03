'use client';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, Search, Edit, Trash2, Shield, Users, 
  Settings, MoreHorizontal, Check, X, Loader2 
} from 'lucide-react';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Accordion, AccordionContent, AccordionItem, AccordionTrigger 
} from '@/components/ui/accordion';

interface Role {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  isCustom: boolean;
  isSystemDefined: boolean;
  practiceId?: number;
  userCount: number;
  createdAt: string;
  permissions: Permission[];
}

interface Permission {
  id: string;
  resource: string;
  action: string;
  granted: boolean;
  category: string;
}

interface RolesTabProps {
  practiceId: number;
  isSuperAdmin: boolean;
}

const PERMISSION_CATEGORIES = [
  {
    name: 'Users & Access',
    resources: ['users', 'roles', 'permissions', 'authentication']
  },
  {
    name: 'Patients & Records',
    resources: ['patients', 'medical_records', 'appointments', 'treatments']
  },
  {
    name: 'Practice Management',
    resources: ['practice_settings', 'billing', 'inventory', 'reports']
  },
  {
    name: 'Laboratory',
    resources: ['lab_orders', 'lab_results', 'lab_providers']
  },
  {
    name: 'Communication',
    resources: ['messages', 'notifications', 'referrals', 'telemedicine']
  }
];

const ACTIONS = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE'];

export default function RolesTab({ practiceId, isSuperAdmin }: RolesTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch roles
  const { data: roles = [], isLoading, error } = useQuery<Role[]>({
    queryKey: ['roles', practiceId],
    queryFn: async () => {
      const response = await fetch(`/api/roles?practiceId=${practiceId}`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch roles:', response.status, errorText);
        throw new Error(`Failed to fetch roles: ${response.status}`);
      }
      const data = await response.json();
      return data;
    },
    enabled: practiceId > 0, // Only enable if practiceId is a positive number
  });

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (roleData: any) => {
      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...roleData, practiceId }),
      });
      if (!response.ok) throw new Error('Failed to create role');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles', practiceId] });
      setIsCreateDialogOpen(false);
      toast({ title: 'Success', description: 'Role created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, ...roleData }: any) => {
      const response = await fetch(`/api/roles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleData),
      });
      if (!response.ok) throw new Error('Failed to update role');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles', practiceId] });
      setEditingRole(null);
      toast({ title: 'Success', description: 'Role updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const response = await fetch(`/api/roles/${roleId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete role');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles', practiceId] });
      toast({ title: 'Success', description: 'Role deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Filter roles
  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateRole = (data: any) => {
    createRoleMutation.mutate(data);
  };

  const handleUpdateRole = (data: any) => {
    updateRoleMutation.mutate({ id: editingRole?.id, ...data });
  };

  const handleDeleteRole = (roleId: string) => {
    if (confirm('Are you sure you want to delete this role? This action cannot be undone.')) {
      deleteRoleMutation.mutate(roleId);
    }
  };

  const systemRoles = roles.filter(role => role.isSystemDefined);
  const customRoles = roles.filter(role => role.isCustom);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <div>Loading roles...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Error loading roles: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Roles & Permissions
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage system and custom roles with their permissions
              </p>
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Custom Role
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Custom Role</DialogTitle>
                </DialogHeader>
                <RoleForm onSubmit={handleCreateRole} isLoading={createRoleMutation.isPending} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search roles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* System Roles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">System Roles</CardTitle>
          <p className="text-sm text-muted-foreground">
            Built-in roles with predefined permissions
          </p>
        </CardHeader>
        <CardContent>
          {systemRoles.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No system roles found</h3>
              <p className="text-muted-foreground">
                System roles should be automatically available. Please check your database or contact support.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {systemRoles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <Shield className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium">{role.displayName || role.name.replace(/_/g, ' ')}</div>
                            {role.description && (
                              <div className="text-sm text-muted-foreground">{role.description}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          <Users className="h-3 w-3 mr-1" />
                          {role.userCount}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {role.permissions.length} permissions
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setEditingRole(role)}>
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custom Roles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Custom Roles</CardTitle>
          <p className="text-sm text-muted-foreground">
            Practice-specific roles with customizable permissions
          </p>
        </CardHeader>
        <CardContent>
          {customRoles.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No custom roles yet</h3>
              <p className="text-muted-foreground mb-4">
                Create custom roles to define specific permission sets for your practice
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Custom Role
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customRoles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                            <Settings className="h-4 w-4 text-purple-600" />
                          </div>
                          <div>
                            <div className="font-medium">{role.displayName || role.name}</div>
                            {role.description && (
                              <div className="text-sm text-muted-foreground">{role.description}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          <Users className="h-3 w-3 mr-1" />
                          {role.userCount}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {role.permissions.filter(p => p.granted).length} / {role.permissions.length} permissions
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(role.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setEditingRole(role)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteRole(role.id)}
                              className="text-red-600"
                              disabled={role.userCount > 0}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={!!editingRole} onOpenChange={() => setEditingRole(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRole?.isSystemDefined ? 'View Role Details' : 'Edit Custom Role'}
            </DialogTitle>
          </DialogHeader>
          {editingRole && (
            <RoleForm 
              initialData={editingRole} 
              onSubmit={handleUpdateRole} 
              isLoading={updateRoleMutation.isPending}
              readOnly={editingRole.isSystemDefined}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Role Form Component
function RoleForm({ 
  initialData, 
  onSubmit, 
  isLoading, 
  readOnly = false 
}: { 
  initialData?: Role; 
  onSubmit: (data: any) => void; 
  isLoading: boolean; 
  readOnly?: boolean;
}) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    displayName: (initialData as any)?.displayName || '',
    description: initialData?.description || '',
    permissions: initialData?.permissions || generateDefaultPermissions(),
  });

  function generateDefaultPermissions(): Permission[] {
    const permissions: Permission[] = [];
    PERMISSION_CATEGORIES.forEach(category => {
      category.resources.forEach(resource => {
        ACTIONS.forEach(action => {
          permissions.push({
            id: `${resource}_${action}`,
            resource,
            action,
            granted: false,
            category: category.name,
          });
        });
      });
    });
    return permissions;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!readOnly) {
      onSubmit(formData);
    }
  };

  const handlePermissionChange = (permissionId: string, granted: boolean) => {
    if (readOnly) return;
    
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.map(p =>
        p.id === permissionId ? { ...p, granted } : p
      )
    }));
  };

  const toggleAllPermissions = (category: string, granted: boolean) => {
    if (readOnly) return;
    
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.map(p =>
        p.category === category ? { ...p, granted } : p
      )
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Role Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter role name (e.g., vet_assistant)"
            required
            disabled={readOnly}
          />
          <p className="text-sm text-muted-foreground">
            Internal identifier for the role (lowercase, underscores allowed)
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="displayName">Display Name</Label>
          <Input
            id="displayName"
            value={formData.displayName}
            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
            placeholder="Enter display name (e.g., Veterinary Assistant)"
            required
            disabled={readOnly}
          />
          <p className="text-sm text-muted-foreground">
            Human-readable name shown in the interface
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe this role's purpose and responsibilities"
            rows={3}
            disabled={readOnly}
          />
        </div>
      </div>

      {/* Permissions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">Permissions</Label>
          {!readOnly && (
            <div className="text-sm text-muted-foreground">
              {formData.permissions.filter(p => p.granted).length} / {formData.permissions.length} granted
            </div>
          )}
        </div>
        
        <Accordion type="multiple" className="w-full">
          {PERMISSION_CATEGORIES.map(category => {
            const categoryPermissions = formData.permissions.filter(p => p.category === category.name);
            const grantedCount = categoryPermissions.filter(p => p.granted).length;
            const totalCount = categoryPermissions.length;
            
            return (
              <AccordionItem key={category.name} value={category.name}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between w-full mr-4">
                    <span>{category.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={grantedCount === totalCount ? "default" : "secondary"}>
                        {grantedCount} / {totalCount}
                      </Badge>
                      {!readOnly && (
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleAllPermissions(category.name, true);
                            }}
                            className="h-6 px-2 text-xs"
                          >
                            All
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleAllPermissions(category.name, false);
                            }}
                            className="h-6 px-2 text-xs"
                          >
                            None
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                    {category.resources.map(resource => (
                      <div key={resource} className="space-y-2">
                        <h4 className="font-medium text-sm capitalize">
                          {resource.replace(/_/g, ' ')}
                        </h4>
                        <div className="space-y-2">
                          {ACTIONS.map(action => {
                            const permission = formData.permissions.find(
                              p => p.resource === resource && p.action === action
                            );
                            return (
                              <div key={action} className="flex items-center space-x-2">
                                <Switch
                                  id={`${resource}_${action}`}
                                  checked={permission?.granted || false}
                                  onCheckedChange={(checked) => 
                                    handlePermissionChange(permission?.id || '', checked)
                                  }
                                  disabled={readOnly}
                                />
                                <Label 
                                  htmlFor={`${resource}_${action}`}
                                  className="text-sm font-normal"
                                >
                                  {action}
                                </Label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
      
      {!readOnly && (
        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : initialData ? 'Update Role' : 'Create Role'}
          </Button>
        </div>
      )}
    </form>
  );
}
