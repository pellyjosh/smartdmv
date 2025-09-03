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
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, Search, Edit, Trash2, Sliders, Shield, 
  AlertTriangle, Check, X, Calendar, Filter, MoreHorizontal 
} from 'lucide-react';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

interface PermissionOverride {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  resource: string;
  action: string;
  granted: boolean;
  reason: string;
  expiresAt?: string;
  createdAt: string;
  createdBy: string;
  status: 'active' | 'expired' | 'revoked';
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface PermissionOverridesTabProps {
  practiceId: number;
  isSuperAdmin: boolean;
}

const RESOURCES = [
  'users', 'roles', 'permissions', 'patients', 'appointments', 
  'medical_records', 'billing', 'inventory', 'reports', 'settings'
];

const ACTIONS = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE'];

export default function PermissionOverridesTab({ practiceId, isSuperAdmin }: PermissionOverridesTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingOverride, setEditingOverride] = useState<PermissionOverride | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch permission overrides
  const { data: overrides = [], isLoading, error } = useQuery<PermissionOverride[]>({
    queryKey: ['permission-overrides', practiceId],
    queryFn: async () => {
      const response = await fetch(`/api/permission-overrides?practiceId=${practiceId}`);
      if (!response.ok) throw new Error('Failed to fetch permission overrides');
      return response.json();
    },
  });

  // Fetch users for override assignment
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users-for-overrides', practiceId],
    queryFn: async () => {
      const response = await fetch(`/api/users?practiceId=${practiceId}&select=id,name,email,role`);
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
  });

  // Create override mutation
  const createOverrideMutation = useMutation({
    mutationFn: async (overrideData: any) => {
      const response = await fetch('/api/permission-overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...overrideData, practiceId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 400 && errorData.details) {
          // Handle validation errors
          const reasonError = errorData.details.find((err: any) => err.path.includes('reason'));
          if (reasonError) {
            throw new Error(reasonError.message);
          }
          throw new Error('Validation error: ' + errorData.details.map((err: any) => err.message).join(', '));
        }
        throw new Error(errorData.error || 'Failed to create permission override');
      }
      return response.json();
    },
    onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['permission-overrides', practiceId] });
  queryClient.invalidateQueries({ queryKey: ["/api/permission-overrides", { practiceId }] });
      setIsCreateDialogOpen(false);
      toast({ title: 'Success', description: 'Permission override created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Update override mutation
  const updateOverrideMutation = useMutation({
    mutationFn: async ({ id, ...overrideData }: any) => {
      const response = await fetch(`/api/permission-overrides/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(overrideData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 400 && errorData.details) {
          // Handle validation errors
          const reasonError = errorData.details.find((err: any) => err.path.includes('reason'));
          if (reasonError) {
            throw new Error(reasonError.message);
          }
          throw new Error('Validation error: ' + errorData.details.map((err: any) => err.message).join(', '));
        }
        throw new Error(errorData.error || 'Failed to update permission override');
      }
      return response.json();
    },
    onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['permission-overrides', practiceId] });
  queryClient.invalidateQueries({ queryKey: ["/api/permission-overrides", { practiceId }] });
      setEditingOverride(null);
      toast({ title: 'Success', description: 'Permission override updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Delete override mutation
  const deleteOverrideMutation = useMutation({
    mutationFn: async (overrideId: string) => {
      const response = await fetch(`/api/permission-overrides/${overrideId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete permission override');
      return response.json();
    },
    onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['permission-overrides', practiceId] });
  queryClient.invalidateQueries({ queryKey: ["/api/permission-overrides", { practiceId }] });
      toast({ title: 'Success', description: 'Permission override deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Revoke override mutation
  const revokeOverrideMutation = useMutation({
    mutationFn: async (overrideId: string) => {
      const response = await fetch(`/api/permission-overrides/${overrideId}/revoke`, { 
        method: 'POST' 
      });
      if (!response.ok) throw new Error('Failed to revoke permission override');
      return response.json();
    },
    onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['permission-overrides', practiceId] });
  queryClient.invalidateQueries({ queryKey: ["/api/permission-overrides", { practiceId }] });
      toast({ title: 'Success', description: 'Permission override revoked successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Filter overrides
  const filteredOverrides = overrides.filter(override => {
    const matchesSearch = override.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         override.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         override.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         override.action.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || override.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const handleCreateOverride = (data: any) => {
    createOverrideMutation.mutate(data);
  };

  const handleUpdateOverride = (data: any) => {
    updateOverrideMutation.mutate({ id: editingOverride?.id, ...data });
  };

  const handleDeleteOverride = (overrideId: string) => {
    if (confirm('Are you sure you want to delete this permission override?')) {
      deleteOverrideMutation.mutate(overrideId);
    }
  };

  const handleRevokeOverride = (overrideId: string) => {
    if (confirm('Are you sure you want to revoke this permission override?')) {
      revokeOverrideMutation.mutate(overrideId);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-yellow-100 text-yellow-800';
      case 'revoked': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionColor = (granted: boolean) => {
    return granted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Error loading permission overrides: {error instanceof Error ? error.message : 'Unknown error'}
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
                <Sliders className="h-5 w-5" />
                Permission Overrides
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Create temporary or permanent permission exceptions for specific users
              </p>
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Override
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Permission Override</DialogTitle>
                </DialogHeader>
                <OverrideForm 
                  users={users} 
                  onSubmit={handleCreateOverride} 
                  isLoading={createOverrideMutation.isPending} 
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search overrides..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="revoked">Revoked</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Warning Alert */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">Permission Override Warning</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Permission overrides bypass normal role-based permissions. Use them carefully and always 
                  include a clear reason for audit purposes.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overrides Table */}
      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Permission</TableHead>
                  <TableHead>Access</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading permission overrides...
                    </TableCell>
                  </TableRow>
                ) : filteredOverrides.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      No permission overrides found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOverrides.map((override) => (
                    <TableRow key={override.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium">
                              {override.userName.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">{override.userName}</div>
                            <div className="text-sm text-muted-foreground">
                              {override.userEmail}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium capitalize">
                            {override.resource.replace(/_/g, ' ')}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {override.action}
                          </Badge>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge className={getActionColor(override.granted)}>
                          {override.granted ? (
                            <>
                              <Check className="h-3 w-3 mr-1" />
                              Grant
                            </>
                          ) : (
                            <>
                              <X className="h-3 w-3 mr-1" />
                              Deny
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <Badge className={getStatusColor(override.status)}>
                          {override.status}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        {override.expiresAt ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3" />
                            {new Date(override.expiresAt).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm max-w-xs truncate" title={override.reason}>
                          {override.reason}
                        </div>
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
                            <DropdownMenuItem onClick={() => setEditingOverride(override)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {override.status === 'active' && (
                              <DropdownMenuItem 
                                onClick={() => handleRevokeOverride(override.id)}
                                className="text-orange-600"
                              >
                                <X className="h-4 w-4 mr-2" />
                                Revoke
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => handleDeleteOverride(override.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Override Dialog */}
      <Dialog open={!!editingOverride} onOpenChange={() => setEditingOverride(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Permission Override</DialogTitle>
          </DialogHeader>
          {editingOverride && (
            <OverrideForm 
              users={users}
              initialData={editingOverride} 
              onSubmit={handleUpdateOverride} 
              isLoading={updateOverrideMutation.isPending} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Override Form Component
function OverrideForm({ 
  users,
  initialData, 
  onSubmit, 
  isLoading 
}: { 
  users: User[];
  initialData?: PermissionOverride; 
  onSubmit: (data: any) => void; 
  isLoading: boolean; 
}) {
  const [formData, setFormData] = useState({
  userId: initialData?.userId ? String(initialData.userId) : '',
    resource: initialData?.resource || '',
    action: initialData?.action || '',
    granted: initialData?.granted ?? true,
    reason: initialData?.reason || '',
    expiresAt: initialData?.expiresAt ? new Date(initialData.expiresAt).toISOString().split('T')[0] : '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="user">User</Label>
        <Select 
          key={`user-select-${users.length}`}
          value={formData.userId} 
          onValueChange={(value) => setFormData({ ...formData, userId: value })}
          disabled={!!initialData}
        >
            <SelectTrigger>
              {/* Let Radix render the selected item's text so it matches the dropdown items */}
              <SelectValue placeholder="Select a user" />
            </SelectTrigger>
          <SelectContent>
            {users.map((user) => (
              <SelectItem key={user.id} value={String(user.id)}>
                {user.name} ({user.email})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="resource">Resource</Label>
          <Select 
            value={formData.resource} 
            onValueChange={(value) => setFormData({ ...formData, resource: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select resource" />
            </SelectTrigger>
            <SelectContent>
              {RESOURCES.map((resource) => (
                <SelectItem key={resource} value={resource}>
                  {resource.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="action">Action</Label>
          <Select 
            value={formData.action} 
            onValueChange={(value) => setFormData({ ...formData, action: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select action" />
            </SelectTrigger>
            <SelectContent>
              {ACTIONS.map((action) => (
                <SelectItem key={action} value={action}>
                  {action}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Switch
          id="granted"
          checked={formData.granted}
          onCheckedChange={(checked) => setFormData({ ...formData, granted: checked })}
        />
        <Label htmlFor="granted">
          {formData.granted ? 'Grant Permission' : 'Deny Permission'}
        </Label>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="expiresAt">Expiration Date (Optional)</Label>
        <Input
          id="expiresAt"
          type="date"
          value={formData.expiresAt}
          onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
          min={new Date().toISOString().split('T')[0]}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="reason">Reason * (minimum 10 characters)</Label>
        <Textarea
          id="reason"
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          placeholder="Explain why this override is necessary... (minimum 10 characters required)"
          rows={3}
          required
          className={formData.reason.length > 0 && formData.reason.length < 10 ? 'border-red-500' : ''}
        />
        {formData.reason.length > 0 && formData.reason.length < 10 && (
          <p className="text-sm text-red-500">
            Reason must be at least 10 characters long ({formData.reason.length}/10)
          </p>
        )}
      </div>
      
      <div className="flex justify-end gap-2 pt-4">
        <Button 
          type="submit" 
          disabled={isLoading || !formData.userId || !formData.resource || !formData.action || !formData.reason || formData.reason.length < 10}
        >
          {isLoading ? 'Saving...' : initialData ? 'Update Override' : 'Create Override'}
        </Button>
      </div>
    </form>
  );
}
