import { useState, useEffect } from "react";
import { useUser } from '@/context/UserContext';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Trash2, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { ResourceType, StandardAction } from "@/lib/rbac/types";
import { useForm } from "react-hook-form";
import { z } from "zod";

interface PermissionOverridesTabProps {
  practiceId: number;
  isSuperAdmin: boolean;
}

// Define schema for permission override form
const overrideFormSchema = z.object({
  userId: z.string().min(1, "User is required"),
  resourceType: z.string().min(1, "Resource type is required"),
  action: z.string().min(1, "Action is required"),
  granted: z.boolean().default(true),
});

type OverrideFormValues = z.infer<typeof overrideFormSchema>;

const PermissionOverridesTab = ({ practiceId, isSuperAdmin }: PermissionOverridesTabProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  
  // Form setup for the add override dialog
  const form = useForm<OverrideFormValues>({
    defaultValues: {
      userId: "",
      resourceType: "",
      action: "",
      granted: true,
    },
  });

  // Fetch authenticated user state
  const { user: currentUser, isLoading: isLoadingAuth } = useUser();
  
  // Fetch users for the dropdown - use the correct users API endpoint
  const { 
    data: users = [], 
    isLoading: isLoadingUsers, 
    error: usersError,
    refetch: refetchUsers
  } = useQuery<any[]>({
    queryKey: ["/api/users", { practiceId }], // Use correct endpoint with practiceId
    queryFn: async () => {
      const response = await fetch(`/api/users?practiceId=${practiceId}`);
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
    enabled: !!practiceId, // Only fetch when we have a practiceId
    // Force refetch to avoid caching issues
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 1
  });
  
  // Handle errors from user fetch
  useEffect(() => {
    if (usersError) {
      console.error('Error fetching practice users:', usersError);
      // Check if it's an authentication error
      if (usersError instanceof Error && 
          (usersError.message?.includes("Not authenticated") || 
           (usersError as any).status === 401)) {
        toast({
          title: "Authentication error",
          description: "Your session may have expired. Please log in again.",
          variant: "destructive",
        });
      }
    }
  }, [usersError, toast]);

  // Handle retry after authentication error
  const handleAuthRetry = async () => {
    try {
      // Invalidate all relevant queries to refresh data with new session
      queryClient.invalidateQueries({ queryKey: ["/api/users", { practiceId }] });
      queryClient.invalidateQueries({ queryKey: ["/api/permission-overrides"] });
      
      // Explicitly trigger refetches
      refetchUsers();
      refetch();
      
      toast({
        title: "Retrying",
        description: "Attempting to refresh data...",
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: "Authentication failed",
        description: "Please log in again to continue.",
        variant: "destructive",
      });
    }
  };

  // Log users data for debugging when it changes
  useEffect(() => {
    console.log('Practice users data:', users);
    if (usersError) {
      console.error('Error fetching practice users:', usersError);
    }
  }, [users, usersError]);

  // Fetch permission overrides
  const { data: overrides = [], isLoading, error, refetch } = useQuery<any[]>({
    queryKey: ["/api/permission-overrides", { practiceId, userId: selectedUser }],
    queryFn: async () => {
      const params = new URLSearchParams({ practiceId: practiceId.toString() });
      if (selectedUser) params.set('userId', selectedUser);
      const response = await fetch(`/api/permission-overrides?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch permission overrides');
      return response.json();
    },
    enabled: true,
    retry: 1,
    retryDelay: 1000,
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleUserFilter = (value: string) => {
    setSelectedUser(value === "all" ? null : value);
  };

  // Create mutation for adding permission override
  const addOverrideMutation = useMutation({
    mutationFn: async (data: OverrideFormValues) => {
      const response = await apiRequest("POST", "/api/permission-overrides", {
        userId: parseInt(data.userId),
        resourceType: data.resourceType,
        action: data.action,
        granted: data.granted,
        practiceId,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create permission override");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Override created",
        description: "Permission override has been successfully created",
      });
      setDialogOpen(false);
      // Reset form
      form.reset();
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/permission-overrides"] });
    },
    onError: (error: Error) => {
      console.error("Error creating permission override:", error);
      
      // Check if the error is due to authentication issues
      if (error.message?.includes("Not authenticated") || (error as any).status === 401) {
        toast({
          title: "Authentication error",
          description: "Your session may have expired. Attempting to refresh...",
          variant: "destructive",
        });
        
        // Try to refresh authentication
        handleAuthRetry();
      } else {
        toast({
          title: "Failed to create override",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  // Delete mutation for removing permission override
  const deleteOverrideMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/permission-overrides/${id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete permission override");
      }
      
      return id;
    },
    onSuccess: () => {
      toast({
        title: "Override deleted",
        description: "Permission override has been successfully removed",
      });
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/permission-overrides"] });
    },
    onError: (error: Error) => {
      console.error("Error deleting permission override:", error);
      
      // Check if the error is due to authentication issues
      if (error.message?.includes("Not authenticated") || (error as any).status === 401) {
        toast({
          title: "Authentication error",
          description: "Your session may have expired. Attempting to refresh...",
          variant: "destructive",
        });
        
        // Try to refresh authentication
        handleAuthRetry();
      } else {
        toast({
          title: "Failed to delete override",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  // Effect to force refresh of user data when dialog opens
  useEffect(() => {
    if (dialogOpen) {
      // Force refresh of users data
      queryClient.invalidateQueries({ queryKey: ["/api/users", { practiceId }] });
    }
  }, [dialogOpen, queryClient, practiceId]);
  
  const onSubmit = (data: OverrideFormValues) => {
    addOverrideMutation.mutate(data);
  };

  const handleDeleteOverride = (id: number) => {
    if (confirm("Are you sure you want to delete this permission override?")) {
      deleteOverrideMutation.mutate(id);
    }
  };

  const filteredOverrides = Array.isArray(overrides) && overrides.length > 0 
    ? overrides.filter((override: any) => 
        override.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        override.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        override.resourceType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        override.action?.toLowerCase().includes(searchQuery.toLowerCase())
      ) 
    : [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Permission Overrides</CardTitle>
          <CardDescription>
            Manage individual permission exceptions for specific users
          </CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          if (open && (!Array.isArray(users) || users.length === 0)) {
            // Don't open dialog if no users are available
            toast({
              title: "Cannot create permission override",
              description: "No users available. Please try again later.",
              variant: "destructive",
            });
          } else {
            setDialogOpen(open);
          }
        }}>
          <DialogTrigger asChild>
            <Button 
              className="flex items-center gap-1"
              onClick={() => {
                // Pre-emptively refresh the users data before the dialog opens
                queryClient.invalidateQueries({ queryKey: ["/api/users", { practiceId }] });
              }}
            >
              <Plus className="h-4 w-4" />
              Add Override
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Permission Override</DialogTitle>
              <DialogDescription>
                Grant or deny specific permissions for individual users
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
                <FormField
                  control={form.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            {isLoadingUsers ? (
                              <div className="flex items-center">
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                <span>Loading users...</span>
                              </div>
                            ) : (
                              <SelectValue placeholder="Select a user" />
                            )}
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingUsers ? (
                            <div className="flex items-center justify-center p-4">
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              <span>Loading users...</span>
                            </div>
                          ) : usersError ? (
                            <div className="text-destructive p-4 text-center space-y-2">
                              <p>Failed to load users.</p>
                              {usersError instanceof Error && 
                               (usersError.message?.includes("Not authenticated") || 
                                (usersError as any).status === 401) ? (
                                <>
                                  <p className="text-sm">Your session may have expired.</p>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={handleAuthRetry}
                                    className="mt-2"
                                  >
                                    <span className="mr-2">Refresh Session</span>
                                  </Button>
                                </>
                              ) : (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => refetchUsers()}
                                  className="mt-2"
                                >
                                  Try Again
                                </Button>
                              )}
                            </div>
                          ) : users && Array.isArray(users) && users.length > 0 ? (
                            users.map((user: any) => (
                              <SelectItem key={user.id} value={user.id.toString()}>
                                {user.name || user.email}
                              </SelectItem>
                            ))
                          ) : (
                            <div className="p-4 text-center text-muted-foreground">
                              No users available.
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="resourceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Resource Type</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a resource type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(ResourceType).map((type) => (
                            <SelectItem key={type} value={type}>
                              {type.replace(/_/g, ' ').toLowerCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="action"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Action</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an action" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(StandardAction).map((action) => (
                            <SelectItem key={action} value={action}>
                              {action.toLowerCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="granted"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Grant Permission
                        </FormLabel>
                        <FormDescription>
                          Toggle to grant or deny this permission
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="submit" disabled={addOverrideMutation.isPending}>
                    {addOverrideMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : "Create Override"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by user or permission..."
              className="pl-8"
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>
          <div className="w-full md:w-64">
            <Select onValueChange={handleUserFilter} defaultValue="all">
              <SelectTrigger>
                {isLoadingUsers ? (
                  <div className="flex items-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span>Loading users...</span>
                  </div>
                ) : (
                  <SelectValue placeholder="Filter by user" />
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {isLoadingUsers ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span>Loading users...</span>
                  </div>
                ) : usersError ? (
                  <div className="text-destructive p-4 text-center space-y-2">
                    <p>Failed to load users.</p>
                    {usersError instanceof Error && 
                     (usersError.message?.includes("Not authenticated") || 
                      (usersError as any).status === 401) ? (
                      <>
                        <p className="text-sm">Your session may have expired.</p>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={handleAuthRetry}
                          className="mt-2"
                        >
                          <span className="mr-2">Refresh Session</span>
                        </Button>
                      </>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => refetchUsers()}
                        className="mt-2"
                      >
                        Try Again
                      </Button>
                    )}
                  </div>
                ) : users && Array.isArray(users) && users.length > 0 ? (
                  users.map((user: any) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name || user.email}
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    No users available.
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="bg-destructive/10 text-destructive p-4 rounded-md space-y-3">
            <p>Failed to load permission overrides.</p>
            {error instanceof Error && 
             (error.message?.includes("Not authenticated") || 
              (error as any).status === 401) ? (
              <>
                <p className="text-sm">Your session may have expired.</p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleAuthRetry}
                  className="mt-1"
                >
                  <span className="mr-2">Refresh Session</span>
                </Button>
              </>
            ) : (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ["/api/permission-overrides"] });
                }}
                className="mt-1"
              >
                Try Again
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Resource Type</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Override</TableHead>
                  {isSuperAdmin && <TableHead>Practice</TableHead>}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOverrides.length > 0 ? (
                  filteredOverrides.map((override: any) => (
                    <TableRow key={override.id}>
                      <TableCell className="font-medium">
                        {override.userName || override.userEmail || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {override.resource?.replace(/_/g, ' ').toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">
                        {override.action?.replace(/_/g, ' ').toLowerCase()}
                      </TableCell>
                      <TableCell>
                        {override.granted ? (
                          <div className="flex items-center text-green-600">
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Granted
                          </div>
                        ) : (
                          <div className="flex items-center text-red-600">
                            <XCircle className="h-4 w-4 mr-1" />
                            Denied
                          </div>
                        )}
                      </TableCell>
                      {isSuperAdmin && (
                        <TableCell>{override.practiceName || "System"}</TableCell>
                      )}
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive"
                          onClick={() => handleDeleteOverride(override.id)}
                          disabled={deleteOverrideMutation.isPending}
                        >
                          {deleteOverrideMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          <span className="sr-only">Delete</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={isSuperAdmin ? 6 : 5} className="text-center py-6 text-muted-foreground">
                      {searchQuery ? "No overrides match your search" : "No permission overrides found"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PermissionOverridesTab;