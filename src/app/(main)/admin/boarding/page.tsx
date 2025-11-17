"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Plus,
  Search,
  Calendar,
  PawPrint,
  Home,
  ClipboardCheck,
  SquarePen,
  Layers,
  WifiOff,
} from "lucide-react";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { useOfflineStorage } from "@/hooks/offline/use-offline-storage";
import { useOfflineBoarding } from "@/hooks/offline/boarding/use-offline-boarding";
import { useOfflineKennels } from "@/hooks/offline/boarding/use-offline-kennels";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { usePracticeId } from "@/hooks/use-practice-id";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import type { BoardingStay, Kennel } from "@/db/schemas/boardingSchema";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";

export default function BoardingPage() {
  const practiceId = usePracticeId();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("current");

  // Offline hooks
  const { isOnline } = useNetworkStatus();
  const {
    stays: offlineStays,
    isLoading: offlineStaysLoading,
    error: offlineStaysError,
  } = useOfflineBoarding();
  const {
    kennels: offlineKennels,
    isLoading: offlineKennelsLoading,
    error: offlineKennelsError,
  } = useOfflineKennels();

  // Fetch current boarding stays
  const { data: currentStays, isLoading: currentLoading } = useQuery({
    queryKey: ["/api/boarding/current", practiceId],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/boarding/stays?practiceId=${practiceId}&status=checked_in`
      );
      return await res.json();
    },
    enabled: !!practiceId && activeTab === "current",
  });

  // Fetch scheduled boarding stays
  const { data: scheduledStays, isLoading: scheduledLoading } = useQuery({
    queryKey: ["/api/boarding/scheduled", practiceId],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/boarding/stays?practiceId=${practiceId}&status=scheduled`
      );
      return await res.json();
    },
    enabled: !!practiceId && activeTab === "scheduled",
  });

  // Fetch kennels
  const { data: kennels, isLoading: kennelsLoading } = useQuery({
    queryKey: ["/api/boarding/kennels", practiceId],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/boarding/kennels?practiceId=${practiceId}`
      );
      return await res.json();
    },
    enabled: !!practiceId && activeTab === "kennels",
  });

  // Use API data when online, offline data when offline
  const displayCurrentStays = isOnline
    ? currentStays || []
    : offlineStays.filter((stay) => stay.status === "checked_in");
  const displayScheduledStays = isOnline
    ? scheduledStays || []
    : offlineStays.filter((stay) => stay.status === "scheduled");
  const displayKennels = isOnline ? kennels || [] : offlineKennels;

  // Combined loading states (online + offline)
  const currentStaysLoading = isOnline ? currentLoading : offlineStaysLoading;
  const scheduledStaysLoading = isOnline
    ? scheduledLoading
    : offlineStaysLoading;
  const combinedKennelsLoading = isOnline
    ? kennelsLoading
    : offlineKennelsLoading;

  const queryClient = useQueryClient();
  const { user } = useUser();
  const { toast } = useToast();
  const [checkInLoadingId, setCheckInLoadingId] = useState<number | null>(null);

  // Filter function for search
  const filterStays = (stays: any[], query: string, status: string) => {
    if (!stays || !Array.isArray(stays)) return [];
    return stays.filter((stay) => {
      const matchesSearch =
        !query ||
        stay.petName?.toLowerCase().includes(query.toLowerCase()) ||
        stay.ownerName?.toLowerCase().includes(query.toLowerCase()) ||
        stay.kennelName?.toLowerCase().includes(query.toLowerCase());

      const matchesStatus = status === "all" || stay.status === status;

      return matchesSearch && matchesStatus;
    });
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Render status badge with appropriate color
  const renderStatusBadge = (status: string) => {
    let variant = "outline";
    switch (status) {
      case "checked_in":
        variant = "default";
        break;
      case "checked_out":
        variant = "secondary";
        break;
      case "scheduled":
        variant = "outline";
        break;
      case "cancelled":
        variant = "destructive";
        break;
    }

    return <Badge variant={variant as any}>{status.replace("_", " ")}</Badge>;
  };

  // Handle check-in for scheduled stays
  const handleCheckIn = async (stayId: number) => {
    if (!user) {
      toast({
        title: "Not signed in",
        description: "You must be signed in to check in a pet.",
      });
      return;
    }

    try {
      setCheckInLoadingId(stayId);
      const res = await apiRequest(
        "POST",
        `/api/boarding/stays/${stayId}/check-in`,
        { checkInById: user.id }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        toast({
          title: "Check-in failed",
          description: err?.error || "Unable to check in pet",
        });
        return;
      }

      const data = await res.json();
      toast({
        title: "Checked in",
        description: `${data?.pet?.name || "Pet"} checked in successfully`,
      });

      // Refresh scheduled and current lists
      // Invalidate both scheduled and current boarding queries
      queryClient.invalidateQueries({
        queryKey: ["/api/boarding/scheduled", practiceId],
      } as any);
      queryClient.invalidateQueries({
        queryKey: ["/api/boarding/current", practiceId],
      } as any);
    } catch (error) {
      console.error("Check-in error", error);
      toast({
        title: "Check-in error",
        description: "An unexpected error occurred",
      });
    } finally {
      setCheckInLoadingId(null);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            Boarding Management
            {!isOnline && (
              <Badge variant="secondary" className="gap-1.5">
                <WifiOff className="h-3 w-3" />
                Offline Mode
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground">
            Manage pet boarding stays and kennels
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/boarding/boarding-reservation">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Reservation
            </Button>
          </Link>
          <Link href="/admin/boarding/boarding-kennel-management">
            <Button variant="outline">
              <Home className="h-4 w-4 mr-2" />
              Manage Kennels
            </Button>
          </Link>
        </div>
      </div>

      <Tabs
        defaultValue="current"
        className="w-full"
        onValueChange={setActiveTab}
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="current">
            <PawPrint className="h-4 w-4 mr-2" />
            Current Boarders
          </TabsTrigger>
          <TabsTrigger value="scheduled">
            <Calendar className="h-4 w-4 mr-2" />
            Scheduled Stays
          </TabsTrigger>
          <TabsTrigger value="kennels">
            <Home className="h-4 w-4 mr-2" />
            Kennels
          </TabsTrigger>
        </TabsList>

        {/* Current Boarding Stays Tab */}
        <TabsContent value="current">
          <Card>
            <CardHeader>
              <CardTitle>Current Boarding Stays</CardTitle>
              <CardDescription>
                Pets currently checked in for boarding
              </CardDescription>
              <div className="flex gap-2 mt-2">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search by pet, owner, or kennel..."
                    className="w-full pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="checked_in">Checked In</SelectItem>
                    <SelectItem value="checked_out">Checked Out</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {currentStaysLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : displayCurrentStays.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No current boarding stays found
                </div>
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {filterStays(
                    displayCurrentStays,
                    searchQuery,
                    statusFilter
                  ).map((stay) => (
                    <Card key={stay.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">
                            {stay.petName ||
                              stay.pet?.name ||
                              `Pet #${stay.petId}`}
                          </CardTitle>
                          {renderStatusBadge(stay.status)}
                        </div>
                        <CardDescription>
                          {stay.ownerName || "Unknown Owner"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">Kennel:</p>
                            <p className="font-medium">
                              {stay.kennelName || stay.kennel?.name || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Check-in:</p>
                            <p className="font-medium">
                              {stay.checkInDate
                                ? formatDate(stay.checkInDate.toString())
                                : "Pending"}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Check-out:</p>
                            <p className="font-medium">
                              {stay.plannedCheckOutDate
                                ? formatDate(
                                    stay.plannedCheckOutDate.toString()
                                  )
                                : "TBD"}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Daily Rate:</p>
                            <p className="font-medium">${stay.dailyRate}</p>
                          </div>
                        </div>
                        {stay.specialInstructions && (
                          <div className="mt-2">
                            <p className="text-muted-foreground text-sm">
                              Special Instructions:
                            </p>
                            <p className="text-sm">
                              {stay.specialInstructions}
                            </p>
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="flex justify-between pt-2">
                        <Link href={`/admin/boarding/boarding-stay/${stay.id}`}>
                          <Button variant="secondary" size="sm">
                            View Details
                          </Button>
                        </Link>
                        <div className="flex gap-1">
                          {/* <Link href={`/admin/boarding/boarding-stay/${stay.id}/activities`}>
                            <Button variant="outline" size="icon" title="Activities">
                              <ClipboardCheck className="h-4 w-4" />
                            </Button>
                          </Link> */}
                          <Link
                            href={`/admin/boarding/boarding-stay/${stay.id}/edit`}
                          >
                            <Button variant="outline" size="icon" title="Edit">
                              <SquarePen className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scheduled Boarding Stays Tab */}
        <TabsContent value="scheduled">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Boarding Stays</CardTitle>
              <CardDescription>Upcoming boarding reservations</CardDescription>
              <div className="flex gap-2 mt-2">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search by pet, owner, or kennel..."
                    className="w-full pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {scheduledStaysLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : displayScheduledStays.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No scheduled boarding stays found
                </div>
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {filterStays(
                    displayScheduledStays,
                    searchQuery,
                    statusFilter
                  ).map((stay) => (
                    <Card key={stay.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">
                            {stay.petName ||
                              stay.pet?.name ||
                              `Pet #${stay.petId}`}
                          </CardTitle>
                          {renderStatusBadge(stay.status)}
                        </div>
                        <CardDescription>
                          {stay.ownerName || "Unknown Owner"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">Kennel:</p>
                            <p className="font-medium">
                              {stay.kennelName || stay.kennel?.name || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Start Date:</p>
                            <p className="font-medium">
                              {stay.checkInDate
                                ? formatDate(stay.checkInDate.toString())
                                : "TBD"}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">End Date:</p>
                            <p className="font-medium">
                              {stay.plannedCheckOutDate
                                ? formatDate(
                                    stay.plannedCheckOutDate.toString()
                                  )
                                : "TBD"}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Daily Rate:</p>
                            <p className="font-medium">${stay.dailyRate}</p>
                          </div>
                        </div>
                        {stay.specialInstructions && (
                          <div className="mt-2">
                            <p className="text-muted-foreground text-sm">
                              Special Instructions:
                            </p>
                            <p className="text-sm">
                              {stay.specialInstructions}
                            </p>
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="flex justify-between pt-2">
                        <Link href={`/admin/boarding/boarding-stay/${stay.id}`}>
                          <Button variant="secondary" size="sm">
                            View Details
                          </Button>
                        </Link>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            title="Check In"
                            onClick={async (e) => {
                              e.preventDefault();
                              await handleCheckIn(stay.id);
                            }}
                            disabled={checkInLoadingId === stay.id}
                          >
                            {checkInLoadingId === stay.id ? (
                              <div className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                                <span>Checking in...</span>
                              </div>
                            ) : (
                              "Check In"
                            )}
                          </Button>
                          <Link
                            href={`/admin/boarding/boarding-stay/${stay.id}/edit`}
                          >
                            <Button variant="outline" size="icon" title="Edit">
                              <SquarePen className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Kennels Tab */}
        <TabsContent value="kennels">
          <Card>
            <CardHeader>
              <CardTitle>Kennel Inventory</CardTitle>
              <CardDescription>
                View and manage available kennels
              </CardDescription>
              <div className="flex gap-2 mt-2">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search kennels..."
                    className="w-full pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="deluxe">Deluxe</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="isolation">Isolation</SelectItem>
                    <SelectItem value="cats_only">Cats Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {combinedKennelsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : displayKennels.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No kennels found
                </div>
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {displayKennels
                    .filter(
                      (kennel: Kennel) =>
                        (!searchQuery ||
                          String(kennel.name)
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase())) &&
                        (statusFilter === "all" ||
                          String(kennel.type) === statusFilter)
                    )
                    .map((kennel: Kennel) => (
                      <Card key={kennel.id} className="overflow-hidden">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-lg">
                              {kennel.name}
                            </CardTitle>
                            <Badge
                              variant={
                                kennel.isActive ? "outline" : "secondary"
                              }
                            >
                              {kennel.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <CardDescription>{kennel.location}</CardDescription>
                        </CardHeader>
                        <CardContent className="pb-2">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <p className="text-muted-foreground">Type:</p>
                              <p className="font-medium capitalize">
                                {String(kennel.type).replace("_", " ")}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Size:</p>
                              <p className="font-medium capitalize">
                                {kennel.size}
                              </p>
                            </div>
                          </div>
                          {kennel.description && (
                            <div className="mt-2">
                              <p className="text-muted-foreground text-sm">
                                Description:
                              </p>
                              <p className="text-sm">{kennel.description}</p>
                            </div>
                          )}
                        </CardContent>
                        <CardFooter className="flex justify-between pt-2">
                          <Link
                            href={`/admin/boarding/boarding-kennel-management/${kennel.id}`}
                          >
                            <Button variant="secondary" size="sm">
                              View Details
                            </Button>
                          </Link>
                          <div className="flex gap-1">
                            <Link
                              href={`/admin/boarding/boarding-kennel-management/${kennel.id}/edit`}
                            >
                              <Button
                                variant="outline"
                                size="icon"
                                title="Edit"
                              >
                                <SquarePen className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="outline"
                              size="icon"
                              title="Occupancy History"
                            >
                              <Layers className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardFooter>
                      </Card>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
