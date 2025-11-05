"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Database,
  Server,
  Trash,
  Shield,
  Lock,
  Activity,
  HardDrive,
  Plus,
  Edit,
  Trash2,
  Building,
  AlertCircle,
} from "lucide-react";
import { usePractice } from "@/hooks/use-practice";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCachedTenantData } from "@/lib/offline/storage/tenant-storage";


// Import new offline components and hooks
import {
  OfflineIndicator,
  SyncStatus,
  PermissionGuard,
  StorageUsage,
} from "@/components/offline";
import { useOfflineStorage } from "@/hooks/use-offline-storage";
import { useOfflinePermissions } from "@/hooks/use-offline-permissions";
import { useOfflineAuth } from "@/hooks/use-offline-auth";
import { useSyncQueue } from "@/hooks/use-sync-queue";
import { useUser } from "@/context/UserContext";
import { useTenant } from "@/context/TenantContext";
import { EntityType } from "@/lib/offline/types/storage.types";

// Define Pet type for demo
interface Pet {
  id?: string;
  name: string;
  species: string;
  breed: string;
  age?: number;
  ownerId: string;
  medicalHistory?: string;
}

export default function OfflineDemoPage() {
  const { isOnline, wasOnline, isTransitioning, downlink, effectiveType } =
    useNetworkStatus();
  const { toast } = useToast();
  const { practice } = usePractice();
  const { user: onlineUser } = useUser();
  const { tenant } = useTenant();
  const [activeTab, setActiveTab] = useState("tenant");
  const [permissionTestResults, setPermissionTestResults] = useState<any>(null);

  // Offline hooks - context already set at login
  const { session, isAuthenticated, isTokenValid, logout, refreshAuth } =
    useOfflineAuth();
  const {
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    hasRole,
    roles,
    permissions,
    isCacheValid: isPermissionCacheValid,
    refresh: refreshPermissions,
  } = useOfflinePermissions();
  const {
    stats,
    pendingOperations,
    failedOperations,
    conflictedOperations,
    addOperation,
    retryFailed,
    clearCompleted,
  } = useSyncQueue();

  // Offline storage for pets
  const {
    data: pets,
    isLoading: isLoadingPets,
    error: petsError,
    save: savePet,
    update: updatePet,
    remove: removePet,
    getById: getPetById,
    refetch: refetchPets,
    clear: clearPets,
  } = useOfflineStorage<Pet>({ entityType: "pet", autoLoad: true });

  // Form state for pet operations
  const [petForm, setPetForm] = useState<Pet>({
    name: "",
    species: "Dog",
    breed: "",
    age: 0,
    ownerId: "",
    medicalHistory: "",
  });
  const [editingPetId, setEditingPetId] = useState<string | null>(null);

  // State for cached tenant/practice data
  const [cachedTenant, setCachedTenant] = useState<any>(null);
  const [cachedPractice, setCachedPractice] = useState<any>(null);

  // Auto-load cached data on component mount
  useEffect(() => {
    const loadCachedDataOnMount = async () => {
      if (session?.tenantId && session?.userId && session?.practiceId) {
        try {
          // Initialize offline system with tenant context
          const { initializeOfflineSystem } = await import('@/lib/offline/utils/offline-init');
          await initializeOfflineSystem({
            tenantId: session.tenantId,
            practiceId: session.practiceId,
            userId: session.userId,
          });
          console.log('[OfflineDemo] Offline system initialized');

          // Load tenant data from cache
          const tenantData = await getCachedTenantData(session.tenantId);
          if (tenantData) {
            setCachedTenant(tenantData);
            console.log('[OfflineDemo] Auto-loaded tenant from cache:', tenantData.name);
          }

          // Load practice data from cache
          const { indexedDBManager } = await import('@/lib/offline/db');
          const cachedPracticeData = (await indexedDBManager.get(
            "cache",
            `practice_${session.practiceId}`
          )) as { data?: any } | null;

          if (cachedPracticeData?.data) {
            setCachedPractice(cachedPracticeData.data);
            console.log('[OfflineDemo] Auto-loaded practice from cache:', cachedPracticeData.data.name);
          }
        } catch (error) {
          console.warn('[OfflineDemo] Failed to auto-load cached data:', error);
        }
      }
    };

    loadCachedDataOnMount();
  }, [session?.tenantId, session?.userId, session?.practiceId]);

  // Handle pet form submission
  const handleSavePet = async () => {
    try {
      if (editingPetId) {
        await updatePet(editingPetId, petForm);
        toast({
          title: "Pet updated",
          description: `${petForm.name} has been updated successfully.`,
        });
        setEditingPetId(null);
      } else {
        const savedPet = await savePet(petForm);

        // Add to sync queue if save was successful
        if (savedPet && savedPet.id) {
          await addOperation("pet", savedPet.id, "create", savedPet, "normal");
        }

        toast({
          title: "Pet created",
          description: `${petForm.name} has been saved offline.`,
        });
      }

      // Reset form
      setPetForm({
        name: "",
        species: "Dog",
        breed: "",
        age: 0,
        ownerId: "",
        medicalHistory: "",
      });
      refetchPets();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to save pet",
        variant: "destructive",
      });
    }
  };

  // Handle pet edit
  const handleEditPet = (pet: Pet) => {
    setPetForm(pet);
    setEditingPetId(pet.id!);
    setActiveTab("operations");
  };

  // Handle pet delete
  const handleDeletePet = async (petId: string) => {
    try {
      await removePet(petId);

      // Add to sync queue
      await addOperation("pet", petId, "delete", undefined, "normal");

      toast({
        title: "Pet deleted",
        description: "Pet has been deleted offline.",
      });
      refetchPets();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete pet",
        variant: "destructive",
      });
    }
  };



  // Test permission functions
  const testPermissions = async () => {
    const results = {
      canCreatePet: await canCreate("pet"),
      canReadPet: await canRead("pet"),
      canUpdatePet: await canUpdate("pet"),
      canDeletePet: await canDelete("pet"),
      canReadUser: await canRead("user"),
      canUpdateUser: await canUpdate("user"),
      canManageUsers: (await canRead("user")) && (await canUpdate("user")),
      hasAdminRole: await hasRole("ADMINISTRATOR"),
      hasVetRole: await hasRole("VETERINARIAN"),
      hasPracticeAdminRole: await hasRole("PRACTICE_ADMINISTRATOR"),
      hasSuperAdminRole: await hasRole("SUPER_ADMIN"),
      currentUser: {
        email: session?.email || onlineUser?.email || "N/A",
        role: session?.role || onlineUser?.role || "N/A",
        roles:
          session?.roles ||
          (onlineUser as any)?.roles?.map((r: any) => r.name) ||
          [],
      },
      offlineContext: session
        ? {
            userId: session.userId,
            userIdType: typeof session.userId,
            tenantId: session.tenantId,
            practiceId: session.practiceId,
          }
        : null,
      cacheStatus: {
        isPermissionCacheValid,
        isOnline,
        isAuthenticated,
        rolesCount: roles.length,
        roleNames: roles,
      },
    };

    setPermissionTestResults(results);

    toast({
      title: "Permission Test Completed",
      description: "Check the results below and console logs",
    });
  };

  return (
    <div className="container py-6">
      {/* Global offline indicator */}
      <OfflineIndicator />

      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">
          Offline Mode - Complete Demo
        </h1>
        <p className="text-muted-foreground">
          Comprehensive testing of all offline features including storage, sync,
          auth, and permissions
        </p>
      </div>

      {/* Network Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              Network Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isOnline ? "Online" : "Offline"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isTransitioning && "Transitioning..."}
              {!isTransitioning && wasOnline !== isOnline && "Status changed"}
              {effectiveType && ` • ${effectiveType.toUpperCase()}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              Sync Queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.pending ?? 0} pending • {stats?.failed ?? 0} failed •{" "}
              {stats?.conflicted ?? 0} conflicts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Lock className="h-4 w-4 text-purple-500" />
              Authentication
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isAuthenticated ? "Active" : "Inactive"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Token: {isTokenValid ? "Valid" : "Invalid"}
              {session?.name && ` • ${session.name}`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs
        defaultValue="tenant"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="mb-4 grid grid-cols-5 w-full">
          <TabsTrigger value="tenant">Tenant/Practice</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="auth">Authentication</TabsTrigger>
          <TabsTrigger value="sync">Sync Queue</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
        </TabsList>

        {/* Tab 0: Tenant & Practice Info */}
        <TabsContent value="tenant" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Tenant Information
              </CardTitle>
              <CardDescription>
                Tenant data from IndexedDB cache
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cachedTenant ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">
                        Tenant Name
                      </Label>
                      <div className="text-lg font-semibold mt-1">
                        {cachedTenant.name}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">
                        Subdomain
                      </Label>
                      <div className="text-lg font-mono mt-1">
                        {cachedTenant.subdomain || cachedTenant.slug}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">
                        Status
                      </Label>
                      <div className="mt-1">
                        <Badge
                          variant={
                            cachedTenant.status === "active"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {(cachedTenant.status || "unknown").toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">
                        Database Name
                      </Label>
                      <div className="text-lg font-mono mt-1">
                        {cachedTenant.databaseName}
                      </div>
                    </div>
                    {cachedTenant.domain && (
                      <div>
                        <Label className="text-sm text-muted-foreground">
                          Custom Domain
                        </Label>
                        <div className="text-lg mt-1">
                          {cachedTenant.domain}
                        </div>
                      </div>
                    )}
                    <div>
                      <Label className="text-sm text-muted-foreground">
                        Storage Path
                      </Label>
                      <div className="text-sm font-mono mt-1">
                        {cachedTenant.storagePath}
                      </div>
                    </div>
                  </div>

                  {cachedTenant.settings && (
                    <div className="border-t pt-4">
                      <Label className="text-sm text-muted-foreground">
                        Settings
                      </Label>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">
                            Timezone:
                          </span>
                          <span className="ml-2 font-mono">
                            {cachedTenant.settings.timezone || "UTC"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Theme:</span>
                          <span className="ml-2">
                            {cachedTenant.settings.theme || "default"}
                          </span>
                        </div>
                        {cachedTenant.settings.features &&
                          cachedTenant.settings.features.length > 0 && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">
                                Features:
                              </span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {cachedTenant.settings.features.map(
                                  (feature: string) => (
                                    <Badge
                                      key={feature}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {feature}
                                    </Badge>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No Tenant Information</AlertTitle>
                  <AlertDescription>
                    No cached tenant data available. Data will be cached when you go online.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Current Practice
              </CardTitle>
              <CardDescription>
                Practice data from IndexedDB cache
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cachedPractice ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">
                        Practice Name
                      </Label>
                      <div className="text-lg font-semibold mt-1">
                        {cachedPractice.name}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">
                        Practice ID
                      </Label>
                      <div className="text-lg font-mono mt-1">
                        {cachedPractice.id}
                      </div>
                    </div>
                    {cachedPractice.email && (
                      <div>
                        <Label className="text-sm text-muted-foreground">
                          Email
                        </Label>
                        <div className="text-sm mt-1">
                          {cachedPractice.email}
                        </div>
                      </div>
                    )}
                    {cachedPractice.phone && (
                      <div>
                        <Label className="text-sm text-muted-foreground">
                          Phone
                        </Label>
                        <div className="text-sm mt-1">
                          {cachedPractice.phone}
                        </div>
                      </div>
                    )}
                    {cachedPractice.address && (
                      <div className="col-span-2">
                        <Label className="text-sm text-muted-foreground">
                          Address
                        </Label>
                        <div className="text-sm mt-1">
                          {cachedPractice.address}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No Practice Information</AlertTitle>
                  <AlertDescription>
                    No cached practice data available. Data will be cached when you go online.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Offline Database Information</CardTitle>
              <CardDescription>
                IndexedDB configuration for this tenant
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Database Name:</span>
                  <span className="font-mono">
                    SmartDMV_Tenant_{tenant?.subdomain || tenant?.slug}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">
                    Practice Store Prefix:
                  </span>
                  <span className="font-mono">practice_{practice?.id}_*</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">
                    Isolation Level:
                  </span>
                  <span className="font-semibold">Tenant + Practice</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Initialized:</span>
                  <Badge variant="default">Yes</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 1: Storage Overview */}
        <TabsContent value="storage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Storage Overview</CardTitle>
              <CardDescription>
                Monitor IndexedDB usage and quota for offline data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StorageUsage />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stored Pets ({pets?.length || 0})</CardTitle>
              <CardDescription>
                Data saved in IndexedDB for offline access
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPets ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading pets...
                </div>
              ) : petsError ? (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    {typeof petsError === "string"
                      ? petsError
                      : "Failed to load pets"}
                  </AlertDescription>
                </Alert>
              ) : pets && pets.length > 0 ? (
                <div className="space-y-2">
                  {pets.map((pet) => (
                    <div
                      key={pet.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium">{pet.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {pet.species} • {pet.breed} • {pet.age} years
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <PermissionGuard resource="pet" action="update">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditPet(pet)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </PermissionGuard>
                        <PermissionGuard resource="pet" action="delete">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeletePet(pet.id!)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </PermissionGuard>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No pets stored offline. Create one in the Operations tab.
                </div>
              )}
            </CardContent>
            {pets && pets.length > 0 && (
              <CardFooter>
                <Button
                  variant="outline"
                  onClick={refetchPets}
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        {/* Tab 2: Authentication Status */}
        <TabsContent value="auth" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Authentication Status</CardTitle>
              <CardDescription>
                View current offline authentication state
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Status
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={isAuthenticated ? "default" : "secondary"}>
                      {isAuthenticated ? "Authenticated" : "Not Authenticated"}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Token Valid
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={isTokenValid ? "default" : "destructive"}>
                      {isTokenValid ? "Valid" : "Invalid"}
                    </Badge>
                  </div>
                </div>
              </div>

              {session && (
                <div className="space-y-2 border rounded-lg p-4 bg-muted/30">
                  <h4 className="font-medium mb-2">Session Details</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">User:</span>
                      <span className="ml-2 font-semibold">
                        {session.name || session.email}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email:</span>
                      <span className="ml-2">{session.email}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Role:</span>
                      <span className="ml-2 font-mono">
                        {session.role.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tenant:</span>
                      <span className="ml-2 capitalize">
                        {session.tenantId}
                      </span>
                    </div>
                    {session.practiceId && (
                      <div>
                        <span className="text-muted-foreground">Practice:</span>
                        <span className="ml-2">
                          {practice?.name || `Practice ${session.practiceId}`}
                        </span>
                      </div>
                    )}
                    {session.currentPracticeId && (
                      <div>
                        <span className="text-muted-foreground">
                          Current Practice:
                        </span>
                        <span className="ml-2">
                          {practice?.name ||
                            `Practice ${session.currentPracticeId}`}
                        </span>
                      </div>
                    )}
                    <div className="col-span-2">
                      <span className="text-muted-foreground">
                        Session Expires:
                      </span>
                      <span className="ml-2">
                        {new Date(session.expiresAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">
                        Last Activity:
                      </span>
                      <span className="ml-2">
                        {new Date(session.lastActivity).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={refreshAuth}
                  disabled={!isAuthenticated}
                  variant="outline"
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Token
                </Button>
                <Button
                  onClick={logout}
                  disabled={!isAuthenticated}
                  variant="destructive"
                  className="flex-1"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Token Security</CardTitle>
              <CardDescription>
                Offline tokens are obfuscated for basic protection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertTitle>Security Note</AlertTitle>
                <AlertDescription>
                  Offline authentication uses token obfuscation (base64 +
                  character substitution) for basic security. Tokens expire
                  after 24 hours and refresh tokens after 7 days. Sensitive
                  operations should always verify with the server when online.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Sync Queue Viewer */}
        <TabsContent value="sync" className="space-y-4">
          <SyncStatus />

          <Card>
            <CardHeader>
              <CardTitle>Sync Management</CardTitle>
              <CardDescription>
                Control synchronization operations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                onClick={retryFailed}
                disabled={failedOperations.length === 0 || !isOnline}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry All Failed Operations ({failedOperations.length})
              </Button>
              <Button
                onClick={clearCompleted}
                variant="outline"
                className="w-full"
              >
                <Trash className="h-4 w-4 mr-2" />
                Clear Completed Operations
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: CRUD Operations */}
        <TabsContent value="operations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {editingPetId ? "Edit Pet" : "Create New Pet"}
              </CardTitle>
              <CardDescription>
                {editingPetId
                  ? "Update existing pet information"
                  : "Add a new pet to offline storage"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Pet Name</Label>
                  <Input
                    id="name"
                    value={petForm.name}
                    onChange={(e) =>
                      setPetForm({ ...petForm, name: e.target.value })
                    }
                    placeholder="Enter pet name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="species">Species</Label>
                  <Select
                    value={petForm.species}
                    onValueChange={(value) =>
                      setPetForm({ ...petForm, species: value })
                    }
                  >
                    <SelectTrigger id="species">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Dog">Dog</SelectItem>
                      <SelectItem value="Cat">Cat</SelectItem>
                      <SelectItem value="Bird">Bird</SelectItem>
                      <SelectItem value="Rabbit">Rabbit</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="breed">Breed</Label>
                  <Input
                    id="breed"
                    value={petForm.breed}
                    onChange={(e) =>
                      setPetForm({ ...petForm, breed: e.target.value })
                    }
                    placeholder="Enter breed"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age">Age (years)</Label>
                  <Input
                    id="age"
                    type="number"
                    value={petForm.age}
                    onChange={(e) =>
                      setPetForm({
                        ...petForm,
                        age: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="Enter age"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ownerId">Owner ID</Label>
                  <Input
                    id="ownerId"
                    value={petForm.ownerId}
                    onChange={(e) =>
                      setPetForm({ ...petForm, ownerId: e.target.value })
                    }
                    placeholder="Enter owner ID"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="medicalHistory">Medical History</Label>
                <Textarea
                  id="medicalHistory"
                  value={petForm.medicalHistory}
                  onChange={(e) =>
                    setPetForm({ ...petForm, medicalHistory: e.target.value })
                  }
                  placeholder="Enter medical history..."
                  rows={4}
                />
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
              {editingPetId && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingPetId(null);
                    setPetForm({
                      name: "",
                      species: "Dog",
                      breed: "",
                      age: 0,
                      ownerId: "",
                      medicalHistory: "",
                    });
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              )}
              <PermissionGuard
                resource="pet"
                action={editingPetId ? "update" : "create"}
                showMessage
              >
                <Button onClick={handleSavePet} className="flex-1">
                  {editingPetId ? (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
                      Update Pet
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Pet
                    </>
                  )}
                </Button>
              </PermissionGuard>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
              <CardDescription>
                Understanding the offline operations flow
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Database className="h-4 w-4" />
                <AlertTitle>Offline Storage</AlertTitle>
                <AlertDescription>
                  All pet data is stored in IndexedDB with tenant isolation.
                  Each entity gets metadata tracking (version, sync status,
                  timestamps) for conflict resolution.
                </AlertDescription>
              </Alert>

              <Alert>
                <Activity className="h-4 w-4" />
                <AlertTitle>Sync Queue</AlertTitle>
                <AlertDescription>
                  Create, update, and delete operations are queued with
                  dependencies tracked. When back online, operations sync in
                  topological order respecting relationships.
                </AlertDescription>
              </Alert>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertTitle>Permission Enforcement</AlertTitle>
                <AlertDescription>
                  All operations check offline permissions before execution. The
                  permission tree is cached with effective permissions
                  calculated for O(1) lookups.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
