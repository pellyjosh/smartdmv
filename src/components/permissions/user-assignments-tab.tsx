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
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, Search, Edit, Trash2, Mail, UserCog2, 
  Users, Shield, Filter, ArrowUpDown 
} from 'lucide-react';

interface UserAssignment {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  currentRole: string;
  assignedRoles: AssignedRole[];
  lastUpdated: string;
}

interface AssignedRole {
  roleId: string;
  roleName: string;
  roleType: 'system' | 'custom';
  assignedAt: string;
  assignedBy: string;
}

interface Role {
  id: string;
  name: string;
  type: 'system' | 'custom';
  isActive: boolean;
}

interface UserAssignmentsTabProps {
  practiceId: number;
  isSuperAdmin: boolean;
}

export default function UserAssignmentsTab({ practiceId, isSuperAdmin }: UserAssignmentsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user assignments
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery<UserAssignment[]>({
    queryKey: ['user-assignments', practiceId],
    queryFn: async () => {
      const response = await fetch(`/api/user-assignments?practiceId=${practiceId}`);
      if (!response.ok) throw new Error('Failed to fetch user assignments');
      return response.json();
    },
  });

  // Fetch available roles
  const { data: availableRoles = [] } = useQuery<Role[]>({
    queryKey: ['available-roles', practiceId],
    queryFn: async () => {
      const response = await fetch(`/api/roles?practiceId=${practiceId}&available=true`);
      if (!response.ok) throw new Error('Failed to fetch roles');
      return response.json();
    },
  });

  // Fetch users for assignment
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['users-for-assignment', practiceId],
    queryFn: async () => {
      const response = await fetch(`/api/users?practiceId=${practiceId}&select=id,name,email,role`);
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
  });

  // Assign role mutation
  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      const response = await fetch('/api/user-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, roleId, practiceId }),
      });
      if (!response.ok) throw new Error('Failed to assign role');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-assignments', practiceId] });
      setIsAssignDialogOpen(false);
      setSelectedUser('');
      toast({ title: 'Success', description: 'Role assigned successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Revoke role mutation
  const revokeRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      const response = await fetch('/api/user-assignments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, roleId, practiceId }),
      });
      if (!response.ok) throw new Error('Failed to revoke role');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-assignments', practiceId] });
      toast({ title: 'Success', description: 'Role revoked successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Filter assignments
  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = assignment.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assignment.userEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'all' || 
                       assignment.currentRole === selectedRole ||
                       assignment.assignedRoles.some(role => role.roleName === selectedRole);
    return matchesSearch && matchesRole;
  });

  const handleAssignRole = (data: { userId: string; roleId: string }) => {
    assignRoleMutation.mutate(data);
  };

  const handleRevokeRole = (userId: string, roleId: string) => {
    if (confirm('Are you sure you want to revoke this role assignment?')) {
      revokeRoleMutation.mutate({ userId, roleId });
    }
  };

  const getRoleTypeColor = (type: string) => {
    return type === 'system' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserCog2 className="h-5 w-5" />
                User Role Assignments
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage role assignments for users in your practice
              </p>
            </div>
            
            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Assign Role
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Role to User</DialogTitle>
                </DialogHeader>
                <AssignRoleForm 
                  users={users} 
                  roles={availableRoles} 
                  onSubmit={handleAssignRole} 
                  isLoading={assignRoleMutation.isPending} 
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
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {availableRoles.map((role) => (
                  <SelectItem key={role.id} value={role.name}>
                    {role.name} {role.type === 'custom' ? '(Custom)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Assignments Table */}
      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Primary Role</TableHead>
                  <TableHead>Additional Roles</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignmentsLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Loading assignments...
                    </TableCell>
                  </TableRow>
                ) : filteredAssignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      No role assignments found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium">
                              {assignment.userName.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">{assignment.userName}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {assignment.userEmail}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge className="bg-blue-100 text-blue-800">
                          {assignment.currentRole.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {assignment.assignedRoles.length === 0 ? (
                            <span className="text-sm text-muted-foreground">None</span>
                          ) : (
                            assignment.assignedRoles.map((role) => (
                              <Badge 
                                key={role.roleId} 
                                className={getRoleTypeColor(role.roleType)}
                              >
                                {role.roleName}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-4 w-4 p-0 ml-1 hover:bg-red-100"
                                  onClick={() => handleRevokeRole(assignment.userId, role.roleId)}
                                >
                                  ×
                                </Button>
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {new Date(assignment.lastUpdated).toLocaleDateString()}
                      </TableCell>
                      
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(assignment.userId);
                            setIsAssignDialogOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Assign Role
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-blue-100">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm font-medium">Total Users</div>
                <div className="text-2xl font-bold">{assignments.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-purple-100">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-sm font-medium">Multiple Roles</div>
                <div className="text-2xl font-bold">
                  {assignments.filter(a => a.assignedRoles.length > 0).length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-green-100">
                <ArrowUpDown className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-sm font-medium">Recent Changes</div>
                <div className="text-2xl font-bold">
                  {assignments.filter(a => {
                    const dayAgo = new Date();
                    dayAgo.setDate(dayAgo.getDate() - 1);
                    return new Date(a.lastUpdated) > dayAgo;
                  }).length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Assign Role Form Component
function AssignRoleForm({ 
  users, 
  roles, 
  onSubmit, 
  isLoading 
}: { 
  users: any[]; 
  roles: Role[]; 
  onSubmit: (data: { userId: string; roleId: string }) => void; 
  isLoading: boolean; 
}) {
  const [formData, setFormData] = useState({
    userId: '',
    roleId: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.userId && formData.roleId) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="user">Select User</Label>
        <Select value={formData.userId} onValueChange={(value) => setFormData({ ...formData, userId: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a user" />
          </SelectTrigger>
          <SelectContent>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                <div className="flex items-center gap-2">
                  <span>{user.name || user.username}</span>
                  <span className="text-sm text-muted-foreground">({user.email})</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="role">Select Role</Label>
        <Select value={formData.roleId} onValueChange={(value) => setFormData({ ...formData, roleId: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a role" />
          </SelectTrigger>
          <SelectContent>
            <div className="px-2 py-1 text-xs font-medium text-muted-foreground">System Roles</div>
            {roles.filter(role => role.type === 'system').map((role) => (
              <SelectItem key={role.id} value={role.id}>
                <div className="flex items-center gap-2">
                  <Shield className="h-3 w-3" />
                  {role.name.replace(/_/g, ' ')}
                </div>
              </SelectItem>
            ))}
            {roles.filter(role => role.type === 'custom').length > 0 && (
              <>
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground border-t mt-1 pt-2">
                  Custom Roles
                </div>
                {roles.filter(role => role.type === 'custom').map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    <div className="flex items-center gap-2">
                      <UserCog2 className="h-3 w-3" />
                      {role.name}
                    </div>
                  </SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={isLoading || !formData.userId || !formData.roleId}>
          {isLoading ? 'Assigning...' : 'Assign Role'}
        </Button>
      </div>
    </form>
  );
}
