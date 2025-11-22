import { useState } from "react";
import { useUser } from "@/context/UserContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { encryptStringDS, decryptStringDS } from '@/lib/offline/utils/encryption';
import { Search, Plus, UserCheck, UserMinus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";

// Type definitions
interface Role {
  id?: number;
  role?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
  practiceId?: number;
}

interface User {
  id: number;
  name: string;
  email: string;
}

interface UserAssignment {
  id?: number;
  userId: number;
  roleId?: number;
  role:
    | string
    | {
        id: number;
        name: string;
      };
  customRoleId?: number;
  practiceId: number;
  practiceName?: string;
  user?: User;
}

interface CurrentUser {
  id: number;
  role: string;
  name: string;
}

interface UserAssignmentsTabProps {
  practiceId: number;
  isSuperAdmin: boolean;
}

// Form schemas
const roleAssignmentSchema = z.object({
  userId: z.number().positive(),
  roleId: z.string().or(z.number()),
  practiceId: z.number().positive(),
});

const changeRoleSchema = z.object({
  userId: z.number().positive(),
  roleId: z.string().or(z.number()),
  practiceId: z.number().positive(),
});

// Main component
const UserAssignmentsTab = ({
  practiceId,
  isSuperAdmin,
}: UserAssignmentsTabProps) => {
  // State hooks
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isChangeRoleDialogOpen, setIsChangeRoleDialogOpen] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserAssignment | null>(null);

  // Utility hooks
  const { toast } = useToast();
  const { isOnline } = useNetworkStatus();
  const queryClient = useQueryClient();

  // Authentication check - use the existing useAuth hook
  const { user: currentUser, isLoading: isAuthLoading } = useUser();
  const isAuthenticated = !!currentUser;

  // Data fetching queries
  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ["/api/roles", { practiceId }],
    queryFn: async () => {
      // If offline, skip API call and load from cache immediately
      if (!isOnline) {
        console.log(
          "[UserAssignments] 🔌 Offline mode detected, loading from cache"
        );
        const cached = localStorage.getItem(`roles_cache_${practiceId}`);
        if (cached) {
          const cacheData = JSON.parse(await decryptStringDS(cached));
          return Array.isArray(cacheData) ? cacheData : cacheData.data;
        }
        return [];
      }

      // Online mode - try API with cache fallback
      try {
        const response = await fetch(`/api/roles?practiceId=${practiceId}`);
        if (!response.ok) {
          const cached = localStorage.getItem(`roles_cache_${practiceId}`);
          if (cached) {
            console.log("[UserAssignments] Using cached roles data");
            const cacheData = JSON.parse(await decryptStringDS(cached));
            return Array.isArray(cacheData) ? cacheData : cacheData.data;
          }
          throw new Error("Failed to fetch roles");
        }
        const data = await response.json();
        if (data && typeof window !== "undefined") {
          const cacheData = {
            data: data,
            timestamp: Date.now(),
            cachedAt: new Date().toISOString(),
          };
          const payload = await encryptStringDS(JSON.stringify(cacheData));
          localStorage.setItem(`roles_cache_${practiceId}`, payload);
        }
        return data;
      } catch (error) {
        const cached = localStorage.getItem(`roles_cache_${practiceId}`);
        if (cached) {
          console.log("[UserAssignments] Network error, using cached roles");
          const cacheData = JSON.parse(await decryptStringDS(cached));
          return Array.isArray(cacheData) ? cacheData : cacheData.data;
        }
        return [];
      }
    },
    enabled: isAuthenticated && practiceId !== undefined,
    retry: false,
  });

  const { data: availableUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users", { practiceId, unassigned: true }],
    queryFn: async () => {
      const params = new URLSearchParams({
        practiceId: practiceId.toString(),
        unassigned: "true",
      });
      const response = await fetch(`/api/users?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch available users");
      return response.json();
    },
    enabled: isAuthenticated && practiceId !== undefined,
  });

  // Fetch user role assignments with the search/filter parameters
  const {
    data: userAssignments = [],
    isLoading: isRolesLoading,
    error: rolesError,
  } = useQuery<UserAssignment[]>({
    queryKey: ["/api/user-assignments", { practiceId, roleId: selectedRole }],
    queryFn: async () => {
      const params = new URLSearchParams({ practiceId: practiceId.toString() });
      if (selectedRole) params.set("roleId", selectedRole);
      const response = await fetch(
        `/api/user-assignments?${params.toString()}`
      );
      if (!response.ok)
        throw new Error("Failed to fetch user role assignments");
      return response.json();
    },
    enabled: isAuthenticated && practiceId !== undefined,
  }); // Handle errors separately
  if (rolesError) {
    console.error("Error fetching user role assignments:", rolesError);
    toast({
      title: "Error loading role assignments",
      description:
        "There was a problem loading the role assignments. Please try refreshing the page.",
      variant: "destructive",
    });
  }

  // Form handling
  const assignRoleForm = useForm({
    resolver: zodResolver(roleAssignmentSchema),
    defaultValues: {
      userId: 0,
      roleId: "",
      practiceId,
    },
  });

  const changeRoleForm = useForm({
    resolver: zodResolver(changeRoleSchema),
    defaultValues: {
      userId: 0,
      roleId: "",
      practiceId,
    },
  });

  // Mutations
  const assignRoleMutation = useMutation({
    mutationFn: async (data: z.infer<typeof roleAssignmentSchema>) => {
      // Use the API endpoint that expects userId, roleId, and practiceId
      const assignmentData = {
        userId: (data.userId as number).toString(),
        roleId: (data.roleId as string | number).toString(),
        practiceId: data.practiceId,
      };

      const response = await apiRequest(
        "POST",
        "/api/user-assignments",
        assignmentData
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Role assigned successfully",
      });
      setIsAssignDialogOpen(false);
      assignRoleForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/user-assignments"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign role",
        variant: "destructive",
      });
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: async (assignmentId: number) => {
      // We need the full assignment details for the deletion endpoint
      const assignment = (userAssignments as UserAssignment[]).find(
        (a: UserAssignment) => a.id === assignmentId
      );

      if (!assignment) {
        throw new Error("Assignment not found");
      }

      // Get the role ID from the role object
      let roleId: string;
      if (typeof assignment.role === "object" && assignment.role?.id) {
        roleId = assignment.role.id.toString();
      } else if (typeof assignment.role === "string") {
        // Find role ID by name for system roles
        const role = roles.find((r) => r.name === assignment.role);
        roleId = role?.id?.toString() || "";
      } else {
        throw new Error("Invalid role format in assignment");
      }

      if (!roleId) {
        throw new Error("Could not determine role ID");
      }

      // Use the DELETE method of user-assignments endpoint
      await apiRequest("DELETE", "/api/user-assignments", {
        userId: assignment.userId,
        roleId: roleId,
        practiceId: assignment.practiceId,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Role assignment removed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user-assignments"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove role assignment",
        variant: "destructive",
      });
    },
  });

  const changeRoleMutation = useMutation({
    mutationFn: async (data: z.infer<typeof changeRoleSchema>) => {
      // First, remove existing role if any
      if (selectedUser && selectedUser.role) {
        try {
          let roleId: string;
          if (typeof selectedUser.role === "object" && selectedUser.role.id) {
            roleId = selectedUser.role.id.toString();
          } else if (typeof selectedUser.role === "string") {
            // Find role ID by name for system roles
            const role = roles.find((r) => r.name === selectedUser.role);
            roleId = role?.id?.toString() || "";
          } else {
            roleId = "";
          }

          if (roleId) {
            await apiRequest("DELETE", "/api/user-assignments", {
              userId: (data.userId as number).toString(),
              roleId: roleId,
              practiceId: data.practiceId,
            });
          }
        } catch (error) {
          console.error("Error removing existing role:", error);
          // Continue with assignment even if removal fails
        }
      }

      // Then assign the new role
      const assignmentData = {
        userId: (data.userId as number).toString(),
        roleId: (data.roleId as string | number).toString(),
        practiceId: data.practiceId,
      };

      const response = await apiRequest(
        "POST",
        "/api/user-assignments",
        assignmentData
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Role updated successfully",
      });
      setIsChangeRoleDialogOpen(false);
      changeRoleForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/user-assignments"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    },
  });

  // Event handlers
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleRoleFilter = (value: string) => {
    setSelectedRole(value === "all" ? null : value);
  };

  const handleAssignRoleClick = () => {
    assignRoleForm.reset({
      userId: 0,
      roleId: "",
      practiceId,
    });
    setIsAssignDialogOpen(true);
  };

  const handleChangeRoleClick = (user: UserAssignment) => {
    setSelectedUser(user);

    let roleIdValue: string | number = "";

    // Handle the roleId based on the type of role
    if (typeof user.role === "string") {
      roleIdValue =
        user.role === "CUSTOM"
          ? user.customRoleId?.toString() || ""
          : user.role;
    } else if (typeof user.role === "object" && user.role?.id) {
      roleIdValue = user.role.id.toString();
    }

    changeRoleForm.reset({
      userId: user.userId,
      roleId: roleIdValue,
      practiceId,
    });
    setIsChangeRoleDialogOpen(true);
  };

  const handleRemoveRoleClick = (assignment: UserAssignment) => {
    if (!assignment.id) {
      toast({
        title: "Error",
        description: "Cannot remove assignment: Missing assignment ID",
        variant: "destructive",
      });
      return;
    }

    setSelectedUser(assignment);
    setIsRemoveDialogOpen(true);
  };

  const confirmRemove = () => {
    if (selectedUser && selectedUser.id) {
      removeRoleMutation.mutate(selectedUser.id);
      setIsRemoveDialogOpen(false);
    }
  };

  const onAssignRoleSubmit = (data: z.infer<typeof roleAssignmentSchema>) => {
    assignRoleMutation.mutate(data);
  };

  const onChangeRoleSubmit = (data: z.infer<typeof changeRoleSchema>) => {
    changeRoleMutation.mutate(data);
  };

  // Filtered users for search
  const filteredUsers = (userAssignments as UserAssignment[]).filter(
    (assignment: UserAssignment) => {
      const roleName =
        typeof assignment.role === "object" && assignment.role?.name
          ? assignment.role.name
          : assignment.role;

      return (
        assignment.user?.name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        assignment.user?.email
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (typeof roleName === "string" &&
          roleName.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
  );

  // Loading state
  const isLoading = isAuthLoading || isRolesLoading;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>User Role Assignments</CardTitle>
          <CardDescription>
            Manage which roles are assigned to each user
          </CardDescription>
        </div>
        <Button
          className="flex items-center gap-1"
          onClick={handleAssignRoleClick}
          disabled={!isAuthenticated}
        >
          <Plus className="h-4 w-4" />
          Assign Role
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by user name or email..."
              className="pl-8"
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>
          <div className="w-full md:w-64">
            <Select onValueChange={handleRoleFilter} defaultValue="all">
              <SelectTrigger>
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map((role: Role) => (
                  <SelectItem
                    key={role.id || role.role}
                    value={role.id?.toString() || role.role || ""}
                  >
                    {role.name || role.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : rolesError ? (
          <div className="bg-destructive/10 text-destructive p-4 rounded-md">
            Failed to load user assignments. Please try again.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Assigned Role</TableHead>
                  {isSuperAdmin && <TableHead>Practice</TableHead>}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers && filteredUsers.length > 0 ? (
                  filteredUsers.map((assignment: UserAssignment) => (
                    <TableRow
                      key={`${assignment.userId}-${
                        assignment.roleId || assignment.role
                      }`}
                    >
                      <TableCell className="font-medium">
                        {assignment.user?.name || "—"}
                      </TableCell>
                      <TableCell>{assignment.user?.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {typeof assignment.role === "object" &&
                          assignment.role.name
                            ? assignment.role.name
                            : String(assignment.role)}
                        </Badge>
                      </TableCell>
                      {isSuperAdmin && (
                        <TableCell>
                          {assignment.practiceName || "System"}
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex items-center gap-1"
                            onClick={() => handleChangeRoleClick(assignment)}
                          >
                            <UserCheck className="h-4 w-4" />
                            Change Role
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex items-center gap-1 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveRoleClick(assignment)}
                          >
                            <UserMinus className="h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={isSuperAdmin ? 5 : 4}
                      className="text-center py-6 text-muted-foreground"
                    >
                      {searchQuery
                        ? "No users match your search"
                        : "No user assignments found"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Assign Role Dialog */}
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Assign Role to User</DialogTitle>
              <DialogDescription>
                Select a user and a role to assign.
              </DialogDescription>
            </DialogHeader>
            <Form {...assignRoleForm}>
              <form
                onSubmit={assignRoleForm.handleSubmit(onAssignRoleSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={assignRoleForm.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User</FormLabel>
                      <Select
                        onValueChange={(value) =>
                          field.onChange(parseInt(value))
                        }
                        defaultValue={field.value.toString()}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select user" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableUsers.map((user: User) => (
                            <SelectItem
                              key={user.id}
                              value={user.id.toString()}
                            >
                              {user.name} ({user.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={assignRoleForm.control}
                  name="roleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value.toString()}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role: Role) => (
                            <SelectItem
                              key={role.id || role.role}
                              value={role.id?.toString() || role.role || ""}
                            >
                              {role.name || role.role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAssignDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={assignRoleMutation.isPending}>
                    {assignRoleMutation.isPending
                      ? "Assigning..."
                      : "Assign Role"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Change Role Dialog */}
        <Dialog
          open={isChangeRoleDialogOpen}
          onOpenChange={setIsChangeRoleDialogOpen}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Change User Role</DialogTitle>
              <DialogDescription>
                Assign a different role to {selectedUser?.user?.name}.
              </DialogDescription>
            </DialogHeader>
            <Form {...changeRoleForm}>
              <form
                onSubmit={changeRoleForm.handleSubmit(onChangeRoleSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={changeRoleForm.control}
                  name="roleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Role</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value.toString()}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role: Role) => (
                            <SelectItem
                              key={role.id || role.role}
                              value={role.id?.toString() || role.role || ""}
                            >
                              {role.name || role.role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsChangeRoleDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={changeRoleMutation.isPending}>
                    {changeRoleMutation.isPending
                      ? "Updating..."
                      : "Change Role"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Remove Role Confirmation Dialog */}
        <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Remove Role Assignment</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove {selectedUser?.user?.name}'s
                {typeof selectedUser?.role === "object" &&
                selectedUser?.role?.name
                  ? ` ${selectedUser.role.name}`
                  : selectedUser?.role
                  ? ` ${selectedUser.role}`
                  : ""}{" "}
                role?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRemoveDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={confirmRemove}
                disabled={removeRoleMutation.isPending}
              >
                {removeRoleMutation.isPending ? "Removing..." : "Remove Role"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default UserAssignmentsTab;
