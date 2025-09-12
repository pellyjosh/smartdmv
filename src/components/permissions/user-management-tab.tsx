import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useRoles } from "@/hooks/use-roles";
import { formatPermissionName, isPermissionGranted } from "@/lib/permission-utils";
import { useUser } from '@/context/UserContext';
import { 
  Search, Plus, UserCog2, UserPlus, Loader2, XCircle, 
  RefreshCw, UsersRound, Users2, MoreHorizontal, LockKeyhole,
  Key, Trash2, ShieldCheck, ShieldAlert, CheckCircle, XCircle as XCircleIcon
} from "lucide-react";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Password reset form schema
const passwordResetSchema = z.object({
  newPassword: z.string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password is too long"),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Define validation schema for user data
const userFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  // Allow both standard roles and custom roles format (CUSTOM-123)
  role: z.string().refine(value => {
    const standardRoles = ["SUPER_ADMIN", "PRACTICE_ADMIN", "VETERINARIAN", "TECHNICIAN", "RECEPTIONIST", "ACCOUNTANT", "CLIENT", "PRACTICE_STAFF", "CUSTOM"];
    return standardRoles.includes(value) || value.startsWith("CUSTOM-");
  }, { message: "Invalid role selected" }),
  username: z.string().min(3, { message: "Username must be at least 3 characters." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  practiceId: z.number().optional(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zipCode: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
});

// For editing existing users (no password required)
const userUpdateSchema = userFormSchema.partial().omit({ password: true });

interface UserManagementTabProps {
  practiceId: number;
  isSuperAdmin: boolean;
}

const UserManagementTab = ({ practiceId, isSuperAdmin }: UserManagementTabProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [isPasswordResetDialogOpen, setIsPasswordResetDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedPracticeId, setSelectedPracticeId] = useState<number | string>("");
  const queryClient = useQueryClient();
  
  // Get current user from UserContext
  const { user: currentUser } = useUser();
  
  // Fetch roles for the dropdown using our shared hook
  const { roles } = useRoles(practiceId);
  
  // Fetch role assignment statistics using the new endpoint
  const { data: roleStats, isLoading: roleStatsLoading } = useQuery<any>({
    queryKey: ["/api/user-roles/statistics", { practiceId }],
    queryFn: async () => {
      const response = await fetch(`/api/user-roles/statistics?practiceId=${practiceId}`);
      if (!response.ok) throw new Error('Failed to fetch role statistics');
      return response.json();
    },
    enabled: !!practiceId,
  });
  
  // Log roles data during development - verbose debug for role data structure
  console.log("🔍 DEBUG: All roles data from API:", JSON.stringify(roles, null, 2));
  console.log("🔍 DEBUG: Role statistics from new endpoint:", JSON.stringify(roleStats, null, 2));

  // Define the user type for better TypeScript support
  interface User {
    id: number;
    name?: string;
    email: string;
    username: string;
    role: string;
    customRoleId?: number | null;
    practiceId?: number;
    practiceName?: string;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
    country?: string | null;
  }
  
  // Define user practice assignment type
  interface UserPractice {
    id: number;
    userId: number;
    practiceId: number;
    isActive: boolean;
    isPrimary: boolean;
    createdAt?: string;
    createdById?: number | null;
    // Additional fields added by our enhanced API responses
    practiceName?: string;
    practiceDetails?: Practice;
  }
  
  // Define practice type
  interface Practice {
    id: number;
    name: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    email?: string;
    phone?: string;
    organizationId?: number;
    isHeadOffice?: boolean;
  }

  // Handle password reset dialog for a user
  const handlePasswordReset = (user: User) => {
    setSelectedUser(user);
    setIsPasswordResetDialogOpen(true);
  };

  // Determine the appropriate endpoint and query parameters based on user role
  const getUsersQueryConfig = () => {
    if (isSuperAdmin) {
      // Super admin can see all users across all practices
      return {
        endpoint: "/api/users",
        queryKey: ["/api/users"],
        queryParams: ""
      };
    } else if (currentUser?.role === "PRACTICE_ADMINISTRATOR") {
      // Practice admin endpoint with practice filter
      return {
        endpoint: "/api/practice-admin/users",
        queryKey: ["/api/practice-admin/users", practiceId],
        queryParams: `?practiceId=${practiceId}`
      };
    } else {
      // Standard users see users from their practice only
      return {
        endpoint: "/api/users",
        queryKey: ["/api/users", practiceId],
        queryParams: `?practiceId=${practiceId}`
      };
    }
  };

  const { endpoint, queryKey, queryParams } = getUsersQueryConfig();
  console.log(`Using endpoint for user data: ${endpoint}${queryParams}`);

  // Fetch users based on role and practice
  const { data: users, isLoading, error } = useQuery<User[]>({
    queryKey: queryKey,
    queryFn: async () => {
      const response = await fetch(`${endpoint}${queryParams}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: true,
  });
  
  // Skip the generic users endpoint for practice admins to avoid confusion
  const skipGenericUsersFetch = currentUser?.role === "PRACTICE_ADMINISTRATOR";
  
  // Remove duplicate user fetch with a separate API call
  useEffect(() => {
    if (skipGenericUsersFetch) {
      queryClient.cancelQueries({ queryKey: ["/api/users"] });
    }
  }, [skipGenericUsersFetch, queryClient]);

  // Create a new user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: z.infer<typeof userFormSchema>) => {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          practiceId: practiceId,
        }),
      });
      if (!response.ok) throw new Error("Failed to create user");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User created successfully",
      });
      setIsAddDialogOpen(false);
      addUserForm.reset();
      // Invalidate users query based on current configuration
      const { queryKey: currentQueryKey } = getUsersQueryConfig();
      queryClient.invalidateQueries({ queryKey: currentQueryKey });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  // Update an existing user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (data: z.infer<typeof userUpdateSchema> & { id: number }) => {
      const { id, ...userData } = data;
      const response = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });
      if (!response.ok) throw new Error("Failed to update user");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      // Invalidate users query based on current configuration
      const { queryKey: currentQueryKey } = getUsersQueryConfig();
      queryClient.invalidateQueries({ queryKey: currentQueryKey });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });
  
  // Password reset mutation
  const passwordResetMutation = useMutation({
    mutationFn: async (data: { userId: number; newPassword: string }) => {
      const response = await fetch(`/api/password-reset/reset/${data.userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: data.newPassword }),
      });
      if (!response.ok) throw new Error("Failed to reset password");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password has been reset successfully",
      });
      setIsPasswordResetDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    }
  });
  
  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      });
      if (!response.ok && response.status !== 204) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete user");
      }
      return userId;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      setSelectedUser(null);
      // Invalidate users query based on current configuration
      const { queryKey: currentQueryKey } = getUsersQueryConfig();
      queryClient.invalidateQueries({ queryKey: currentQueryKey });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  // Form for adding new users
  const addUserForm = useForm<z.infer<typeof userFormSchema>>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
      role: "PRACTICE_STAFF",
      practiceId: practiceId,
      phone: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
    },
  });

  // Form for editing existing users
  const editUserForm = useForm<z.infer<typeof userUpdateSchema>>({
    resolver: zodResolver(userUpdateSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      role: "PRACTICE_STAFF",
    },
  });
  
  // Form for password reset
  const resetForm = useForm<z.infer<typeof passwordResetSchema>>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });
  
  // Password reset form submission handler
  const onPasswordResetSubmit = (data: z.infer<typeof passwordResetSchema>) => {
    if (selectedUser) {
      passwordResetMutation.mutate({
        userId: selectedUser.id,
        newPassword: data.newPassword
      });
    }
  };

  // Fetch available practices based on user role
  const { data: allPractices = [], isLoading: practicesLoading } = useQuery<Practice[]>({
    queryKey: ["/api/practices", currentUser?.role === "PRACTICE_ADMINISTRATOR" ? { organizationId: (currentUser as any)?.organizationId } : undefined],
    // For practice admins, only fetch practices in their organization
    queryFn: async ({ queryKey }) => {
      const [_, params] = queryKey;
      let url = "/api/practices";
      
      // If user is a practice admin, include organization filter
      if (currentUser?.role === "PRACTICE_ADMINISTRATOR" && (currentUser as any)?.organizationId) {
        url = `/api/practices?organizationId=${(currentUser as any).organizationId}`;
        console.log(`Practice Admin: Fetching practices for organization ${(currentUser as any).organizationId}`);
      } else {
        console.log("SuperAdmin or other role: Fetching all practices");
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch practices");
      return await response.json();
    },
    // Always enable for authenticated users
    enabled: !!currentUser,
  });
  
  // For a selected user, fetch their practice assignments
  const { data: userPractices = [], isLoading: userPracticesLoading, refetch: refetchUserPractices } = useQuery<UserPractice[]>({
    queryKey: ["/api/user-practices", selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser) return [];
      const response = await fetch(`/api/user-practices/${selectedUser.id}`);
      if (!response.ok) throw new Error("Failed to fetch user practices");
      return await response.json();
    },
    enabled: !!selectedUser && (isSuperAdmin || currentUser?.role === "PRACTICE_ADMINISTRATOR"),
  });
  
  // Assign practice to user mutation
  const assignPracticeMutation = useMutation({
    mutationFn: async (data: { userId: number; practiceId: number; isPrimary?: boolean }) => {
      const response = await fetch("/api/user-practices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to assign practice");
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Practice assigned to user successfully",
      });
      refetchUserPractices();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign practice to user",
        variant: "destructive",
      });
    },
  });
  
  // Update practice assignment mutation (for setting primary practice)
  const updatePracticeAssignmentMutation = useMutation({
    mutationFn: async (data: { id: number; isPrimary: boolean }) => {
      const response = await fetch(`/api/user-practices/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPrimary: data.isPrimary }),
      });
      if (!response.ok) throw new Error("Failed to update practice assignment");
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Practice assignment updated successfully",
      });
      refetchUserPractices();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update practice assignment",
        variant: "destructive",
      });
    },
  });
  
  // Remove practice assignment mutation
  const removePracticeAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: number) => {
      const response = await fetch(`/api/user-practices/${assignmentId}`, {
        method: "DELETE",
      });
      if (!response.ok && response.status !== 204) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to remove practice assignment");
      }
      return assignmentId;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Practice assignment removed successfully",
      });
      refetchUserPractices();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove practice assignment",
        variant: "destructive",
      });
    },
  });
  
  // Set up the edit form when a user is selected
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    
    // Process role field for custom roles
    let roleValue = user.role;
    
    // If user has a CUSTOM role and a customRoleId, format it as CUSTOM-{id}
    if (user.role === "CUSTOM" && user.customRoleId) {
      roleValue = `CUSTOM-${user.customRoleId}`;
      console.log(`Converting CUSTOM role with ID ${user.customRoleId} to format: ${roleValue}`);
      // Also log the available roles for debugging
      console.log("Available roles for selection:", roles);
    }
    
    // Create an object with the form data
    const formData = {
      name: user.name,
      email: user.email,
      username: user.username,
      role: roleValue,
      phone: user.phone,
      address: user.address,
      city: user.city,
      state: user.state,
      zipCode: user.zipCode,
      country: user.country,
    };
    
    console.log("Setting edit form with values:", formData);
    
    // Reset the form with the data
    editUserForm.reset(formData);
    
    // Also set the role field directly to ensure it's properly selected
    editUserForm.setValue("role", roleValue);
    
    // Reset practice selection
    setSelectedPracticeId("");
    
    setIsEditDialogOpen(true);
  };

  // Handle opening the permissions dialog for a user
  const handleManagePermissions = (user: User) => {
    setSelectedUser(user);
    setIsPermissionsDialogOpen(true);
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const onAddSubmit = (data: z.infer<typeof userFormSchema>) => {
    // Process the role field to handle custom roles correctly
    const formData = { ...data };
    
    // Check if the role is a custom role (format: "CUSTOM-123")
    if (data.role && typeof data.role === 'string' && data.role.startsWith("CUSTOM-")) {
      const customRoleId = parseInt(data.role.split("-")[1]);
      // Set the customRoleId field and revert role field back to "CUSTOM"
      const userData = {
        ...formData,
        customRoleId,
        role: "CUSTOM"
      };
      console.log("Setting custom role for new user:", customRoleId, userData);
      createUserMutation.mutate(userData);
    } else {
      // For system roles, ensure customRoleId is null
      const userData = {
        ...formData,
        customRoleId: null
      };
      createUserMutation.mutate(userData);
    }
  };

  const onEditSubmit = (data: z.infer<typeof userUpdateSchema>) => {
    if (selectedUser) {
      // Process the role field to handle custom roles correctly
      
      // Check if the role is a custom role (format: "CUSTOM-123")
      if (data.role && typeof data.role === 'string' && data.role.startsWith("CUSTOM-")) {
        const customRoleId = parseInt(data.role.split("-")[1]);
        // Set the customRoleId field and revert role field back to "CUSTOM"
        const userData = {
          ...data, 
          id: selectedUser.id,
          customRoleId,
          role: "CUSTOM"
        };
        console.log("Setting custom role:", customRoleId, userData);
        updateUserMutation.mutate(userData);
      } else {
        // For system roles, ensure customRoleId is null
        const userData = {
          ...data, 
          id: selectedUser.id,
          customRoleId: null
        };
        updateUserMutation.mutate(userData);
      }
    }
  };

  const filteredUsers = users ? users.filter((user) => 
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  // Define standard user roles
  const UserRole = {
    SUPER_ADMIN: "SUPER_ADMIN",
    PRACTICE_ADMIN: "PRACTICE_ADMIN",
    VETERINARIAN: "VETERINARIAN",
    TECHNICIAN: "TECHNICIAN",
    RECEPTIONIST: "RECEPTIONIST",
    ACCOUNTANT: "ACCOUNTANT",
    CLIENT: "CLIENT",
    PRACTICE_STAFF: "PRACTICE_STAFF",
    CUSTOM: "CUSTOM"
  };

  // Helper function to get role label
  const getRoleLabel = (roleValue: string, user?: User) => {
    // For custom roles, try to find the role name in our roles array
    if (roleValue === "CUSTOM" && user?.customRoleId && roles) {
      const customRole = roles.find((role: any) => role.id === user.customRoleId);
      return customRole?.name || "Custom Role";
    }
    
    // For system roles, format them nicely
    switch (roleValue) {
      case "SUPER_ADMIN": return "Super Admin";
      case "PRACTICE_ADMIN": return "Practice Admin";
      case "VETERINARIAN": return "Veterinarian";
      case "TECHNICIAN": return "Technician";
      case "RECEPTIONIST": return "Receptionist";
      case "ACCOUNTANT": return "Accountant";
      case "CLIENT": return "Client";
      case "PRACTICE_STAFF": return "Practice Staff";
      default: return roleValue.replace(/_/g, " ");
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* User overview card */}
      <Card className="md:col-span-1">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-full">
              <Users2 className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-lg">User Overview</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading || roleStatsLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-primary/70" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Users</span>
                <Badge variant="outline" className="font-medium">{roleStats?.totalUsers || users?.length || 0}</Badge>
              </div>
              <Separator />
              <div className="space-y-1">
                <span className="text-sm font-medium">Role Distribution</span>
                {/* Role distribution list using accurate role assignment statistics */}
                <div className="space-y-1 mt-2">
                  {roleStats?.roleDistribution?.map((roleData: any) => {
                    if (roleData.userCount === 0) return null;
                    return (
                      <div key={roleData.roleName} className="flex items-center justify-between py-1">
                        <span className="text-xs text-muted-foreground">
                          {roleData.roleDisplayName || roleData.roleName}
                          {roleData.source === 'assignments'}
                          {roleData.source === 'legacy'}
                        </span>
                        <Badge variant="secondary" className="text-xs">{roleData.userCount}</Badge>
                      </div>
                    );
                  })}
                  {/* {roleStats?.unassignedUsers > 0 && (
                    <div className="flex items-center justify-between py-1">
                      <span className="text-xs text-muted-foreground">Unassigned Users</span>
                      <Badge variant="destructive" className="text-xs">{roleStats.unassignedUsers}</Badge>
                    </div>
                  )} */}
                  {/* Show summary statistics */}
                  {roleStats?.summary && (
                    <>
                      <Separator className="my-2" />
                      <div className="space-y-1">
                        <div className="flex items-center justify-between py-1">
                          <span className="text-xs text-muted-foreground">Total Roles</span>
                          <Badge variant="outline" className="text-xs">{roleStats.summary.totalRoles}</Badge>
                        </div>
                        <div className="flex items-center justify-between py-1">
                          <span className="text-xs text-muted-foreground">Custom Roles</span>
                          <Badge variant="outline" className="text-xs">{roleStats.summary.customRoles}</Badge>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <Separator />
              <Button 
                variant="outline" 
                className="w-full mt-2 flex gap-2 justify-center"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <UserPlus className="h-4 w-4" />
                Add New User
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* User Directory card */}
      <Card className="md:col-span-3">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 p-2 rounded-full">
                <UsersRound className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg">User Directory</CardTitle>
            </div>
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search users by name, email, or role..."
                className="pl-8"
                value={searchQuery}
                onChange={handleSearch}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-[400px]">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 text-primary/70 animate-spin" />
                <span className="text-sm text-muted-foreground">Loading users...</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex justify-center items-center h-[400px]">
              <div className="flex flex-col items-center gap-2 max-w-md text-center">
                <div className="bg-destructive/10 p-3 rounded-full">
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
                <h3 className="font-medium">Failed to load user data</h3>
                <p className="text-sm text-muted-foreground">
                  There was an error loading the user list. Please try refreshing or contact support.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-2"
                  onClick={() => {
                    const { queryKey: currentQueryKey } = getUsersQueryConfig();
                    queryClient.invalidateQueries({ queryKey: currentQueryKey });
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    {isSuperAdmin && <TableHead>Practice</TableHead>}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="bg-primary/10 w-10 h-10 rounded-full flex items-center justify-center">
                              <span className="font-semibold text-sm text-primary">
                                {user.name?.charAt(0) || user.email?.charAt(0) || '?'}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium">{user.name || "—"}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize px-2 py-0.5 font-normal">
                            {getRoleLabel(user.role, user)}
                          </Badge>
                        </TableCell>
                        {isSuperAdmin && (
                          <TableCell>{user.practiceName || "System"}</TableCell>
                        )}
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                <UserCog2 className="h-4 w-4 mr-2" />
                                Edit User
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleManagePermissions(user)}>
                                <Key className="h-4 w-4 mr-2" />
                                Manage Permissions
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePasswordReset(user)}>
                                <LockKeyhole className="h-4 w-4 mr-2" />
                                Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete User
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirm User Deletion</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this user? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => deleteUserMutation.mutate(user.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      {deleteUserMutation.isPending && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      )}
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={isSuperAdmin ? 4 : 3} className="h-32 text-center">
                        {searchQuery ? (
                          <div className="flex flex-col items-center justify-center py-8">
                            <Search className="h-8 w-8 text-muted-foreground mb-2" />
                            <p className="text-muted-foreground">No users match your search criteria</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-8">
                            <UsersRound className="h-8 w-8 text-muted-foreground mb-2" />
                            <p className="text-muted-foreground">No users found</p>
                            <Button
                              variant="outline"
                              className="mt-4"
                              onClick={() => setIsAddDialogOpen(true)}
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Add First User
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Dialogs */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user in your practice.
            </DialogDescription>
          </DialogHeader>
          <Form {...addUserForm}>
            <form onSubmit={addUserForm.handleSubmit(onAddSubmit)} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addUserForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addUserForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="john@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addUserForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="johndoe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addUserForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="********" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={addUserForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
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
                        {/* System roles section */}
                        <div className="p-1">
                          <p className="px-2 pb-1 text-xs font-semibold text-muted-foreground">System Roles</p>
                          {isSuperAdmin && <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>}
                          <SelectItem value="PRACTICE_ADMIN">Practice Admin</SelectItem>
                          <SelectItem value="VETERINARIAN">Veterinarian</SelectItem>
                          <SelectItem value="TECHNICIAN">Technician</SelectItem>
                          <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
                          <SelectItem value="PRACTICE_STAFF">Practice Staff</SelectItem>
                          <SelectItem value="CLIENT">Client</SelectItem>
                        </div>
                        
                        {/* Custom roles section - ALWAYS show this section */}
                        <div className="p-1 pt-2 border-t">
                          <p className="px-2 pb-1 text-xs font-semibold text-muted-foreground">Custom Roles</p>
                          
                          {/* Map and display each custom role */}
                          {Array.isArray(roles) && roles.filter((role: any) => !role.role && role.id).map((role: any) => (
                            <SelectItem key={`CUSTOM-${role.id}`} value={`CUSTOM-${role.id}`}>
                              {role.name}
                            </SelectItem>
                          ))}
                          
                          {/* Fallback message if no custom roles are found */}
                          {(!Array.isArray(roles) || roles.filter((role: any) => !role.role && role.id).length === 0) && (
                            <SelectItem value="diagnostic-placeholder" disabled>
                              No custom roles available
                            </SelectItem>
                          )}
                        </div>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addUserForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="(555) 123-4567" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createUserMutation.isPending}>
                  {createUserMutation.isPending ? "Creating..." : "Create User"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information.
            </DialogDescription>
          </DialogHeader>
          <Form {...editUserForm}>
            <form onSubmit={editUserForm.handleSubmit(onEditSubmit)} className="space-y-4 py-4">
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="general">General Info</TabsTrigger>
                  {(isSuperAdmin || currentUser?.role === "PRACTICE_ADMINISTRATOR") && (
                    <TabsTrigger value="access">Practice Access</TabsTrigger>
                  )}
                </TabsList>
                
                <TabsContent value="general">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editUserForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editUserForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editUserForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editUserForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role</FormLabel>
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
                              {/* System roles section */}
                              <div className="p-1">
                                <p className="px-2 pb-1 text-xs font-semibold text-muted-foreground">System Roles</p>
                                {isSuperAdmin && <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>}
                                <SelectItem value="PRACTICE_ADMIN">Practice Admin</SelectItem>
                                <SelectItem value="VETERINARIAN">Veterinarian</SelectItem>
                                <SelectItem value="TECHNICIAN">Technician</SelectItem>
                                <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
                                <SelectItem value="PRACTICE_STAFF">Practice Staff</SelectItem>
                                <SelectItem value="CLIENT">Client</SelectItem>
                              </div>
                              
                              {/* Custom roles section - ALWAYS show this section */}
                              <div className="p-1 pt-2 border-t">
                                <p className="px-2 pb-1 text-xs font-semibold text-muted-foreground">Custom Roles</p>
                                
                                {/* Map and display each custom role */}
                                {Array.isArray(roles) && roles.filter((role: any) => !role.role && role.id).map((role: any) => (
                                  <SelectItem key={`CUSTOM-${role.id}`} value={`CUSTOM-${role.id}`}>
                                    {role.name}
                                  </SelectItem>
                                ))}
                                
                                {/* Fallback message if no custom roles are found */}
                                {(!Array.isArray(roles) || roles.filter((role: any) => !role.role && role.id).length === 0) && (
                                  <SelectItem value="diagnostic-placeholder" disabled>
                                    No custom roles available
                                  </SelectItem>
                                )}
                              </div>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={editUserForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
                
                {(isSuperAdmin || currentUser?.role === "PRACTICE_ADMINISTRATOR") && (
                  <TabsContent value="access">
                    <div className="space-y-4">
                      <div className="flex flex-col space-y-1.5">
                        <h3 className="text-md font-semibold">Practice Access Management</h3>
                        <p className="text-sm text-muted-foreground">
                          Manage which practices this user can access. Each user must have at least one practice and a designated primary practice.
                        </p>
                      </div>
                      
                      {userPracticesLoading || practicesLoading ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          <span className="ml-2 text-muted-foreground">Loading practice data...</span>
                        </div>
                      ) : (
                        <>
                          {/* Add practice section */}
                          <div className="flex space-x-2">
                            <Select
                              value={selectedPracticeId.toString()}
                              onValueChange={(value) => setSelectedPracticeId(parseInt(value))}
                            >
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Select a practice to add" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.isArray(allPractices) && allPractices
                                  .filter((practice: Practice) => 
                                    !userPractices.some(up => up.practiceId === practice.id)
                                  )
                                  .map((practice: Practice) => (
                                    <SelectItem key={practice.id} value={practice.id.toString()}>
                                      {practice.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              onClick={() => {
                                if (selectedUser && selectedPracticeId) {
                                  assignPracticeMutation.mutate({
                                    userId: selectedUser.id,
                                    practiceId: parseInt(selectedPracticeId.toString()),
                                    isPrimary: userPractices.length === 0 // Set as primary if it's the first practice
                                  });
                                  setSelectedPracticeId("");
                                }
                              }}
                              disabled={!selectedPracticeId || assignPracticeMutation.isPending}
                            >
                              {assignPracticeMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>Add Access</>
                              )}
                            </Button>
                          </div>

                          {/* Current practice assignments */}
                          <div className="border rounded-md overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Practice</TableHead>
                                  <TableHead>Primary</TableHead>
                                  <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {userPracticesLoading ? (
                                  <TableRow>
                                    <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                                      <span className="block mt-2">Loading practice assignments...</span>
                                    </TableCell>
                                  </TableRow>
                                ) : userPractices.length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                                      No practices assigned yet
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  userPractices.map(assignment => {
                                    // Get the practice name from the enhanced assignment objects 
                                    // that come back from our modified API endpoints
                                    const practiceName = 
                                      (assignment as any).practiceName || // If server sends practiceName directly
                                      ((assignment as any).practiceDetails?.name) || // If server sent details object
                                      // Try to find it in allPractices array as fallback
                                      (Array.isArray(allPractices) && allPractices.length > 0 
                                        ? allPractices.find(p => p.id === assignment.practiceId)?.name 
                                        : null) ||
                                      `Practice ${assignment.practiceId}`; // Final fallback
                                      
                                    // Check for missing practice data and log for debugging
                                    if (!practiceName || practiceName === `Practice ${assignment.practiceId}`) {
                                      console.warn(`Missing practice data for practice ID ${assignment.practiceId}`, 
                                                  `Assignment data:`, assignment,
                                                  `Available practices:`, allPractices);
                                    }
                                    
                                    // Log debug info for practice lookup
                                    console.log(`Practice assignment: practiceId=${assignment.practiceId}, practiceName=${practiceName}`);
                                    
                                    return (
                                      <TableRow key={assignment.id}>
                                        <TableCell>{practiceName}</TableCell>
                                        <TableCell>
                                          {assignment.isPrimary ? (
                                            <Badge variant="default" className="bg-primary">Primary</Badge>
                                          ) : (
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => {
                                                updatePracticeAssignmentMutation.mutate({
                                                  id: assignment.id,
                                                  isPrimary: true
                                                });
                                              }}
                                              disabled={updatePracticeAssignmentMutation.isPending}
                                            >
                                              {updatePracticeAssignmentMutation.isPending ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                              ) : (
                                                <>Set as Primary</>
                                              )}
                                            </Button>
                                          )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          {!assignment.isPrimary && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => {
                                                removePracticeAssignmentMutation.mutate(assignment.id);
                                              }}
                                              disabled={removePracticeAssignmentMutation.isPending}
                                              className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                            >
                                              {removePracticeAssignmentMutation.isPending ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                              ) : (
                                                <>Remove</>
                                              )}
                                            </Button>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </>
                      )}
                    </div>
                  </TabsContent>
                )}
              </Tabs>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateUserMutation.isPending}>
                  {updateUserMutation.isPending ? "Updating..." : "Update User"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={isPasswordResetDialogOpen} onOpenChange={setIsPasswordResetDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              {selectedUser?.name ? (
                <>Reset password for {selectedUser.name}</>
              ) : (
                <>Loading user details...</>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <Form {...resetForm}>
              <form onSubmit={resetForm.handleSubmit(onPasswordResetSubmit)} className="space-y-4 py-4">
                <FormField
                  control={resetForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter new password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={resetForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Confirm new password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsPasswordResetDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={passwordResetMutation.isPending}>
                    {passwordResetMutation.isPending ? "Resetting..." : "Reset Password"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* Permissions Management Dialog */}
      <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage User Permissions</DialogTitle>
            <DialogDescription>
              {selectedUser && (
                <div className="flex flex-col mt-2">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-primary/10 w-10 h-10 rounded-full flex items-center justify-center">
                      <span className="font-semibold text-sm text-primary">
                        {selectedUser.name?.charAt(0) || selectedUser.email?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium">{selectedUser.name || "—"}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <span>{selectedUser.email}</span>
                        <span className="inline-block mx-1">•</span>
                        <Badge variant="outline" className="capitalize px-2 py-0.5 font-normal">
                          {getRoleLabel(selectedUser.role, selectedUser)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="text-center py-8">
            <ShieldAlert className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Permission Management</h3>
            <p className="text-muted-foreground">
              Advanced permission management features will be implemented here.
            </p>
          </div>
          
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsPermissionsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagementTab;
