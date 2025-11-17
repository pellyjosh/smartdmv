"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { MarketplaceFeatureContainer } from "@/components/features/marketplace-feature-message";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Calendar,
  Clock,
  User,
  PenBox,
  Check,
  X,
  WifiOff,
  Wifi,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input"; // Input is not used, can be removed if not needed elsewhere in future
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/context/UserContext";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { useOfflineAppointments } from "@/hooks/offline/appointments";
import {
  approveAppointmentRequest,
  rejectAppointmentRequest,
} from "@/lib/offline/managers/sync-queue-manager";
import { syncEventEmitter } from "@/lib/offline/events/sync-events";

type AppointmentRequest = {
  id: number;
  practiceId: number;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  petName: string;
  petType: string;
  petBreed: string | null;
  petAge: string | null;
  reason: string;
  date: string; // ISO string format
  time: string; // HH:mm format
  requestNotes: string | null;
  preferredDoctor: string | null;
  source: string;
  status: string; // e.g., "PENDING_APPROVAL", "APPROVED", "REJECTED"
  createdAt: string;
  updatedAt: string | null;
  appointmentId: number | null;
  rejectionReason: string | null;
};

export default function AppointmentRequestsPage() {
  const { toast } = useToast();
  const { user, userPracticeId } = useUser();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] =
    useState<AppointmentRequest | null>(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [sourceFilter, setSourceFilter] = useState("all"); // Add source filter state

  // Use offline appointments hook
  const {
    appointments: offlineAppointments,
    isLoading: isLoadingOffline,
    isOnline,
    getAppointmentsByStatus,
    refresh: refreshOfflineAppointments,
  } = useOfflineAppointments();

  // Keep ref in sync with isOnline state for mutations
  const isOnlineRef = useRef(isOnline);
  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  // Fetch appointment requests from API (when online)
  const { data: apiRequests, isLoading: isLoadingApi } = useQuery<
    AppointmentRequest[]
  >({
    queryKey: ["appointment-requests", userPracticeId, activeTab, sourceFilter],
    enabled: !!userPracticeId && isOnline,
    queryFn: async () => {
      const statusParam =
        activeTab === "all" ? "" : `&status=${activeTab.toLowerCase()}`;
      const sourceParam =
        sourceFilter === "all" ? "" : `&source=${sourceFilter}`;
      const res = await apiRequest(
        "GET",
        `/api/appointment-requests?practiceId=${userPracticeId}${statusParam}${sourceParam}`
      );
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return await res.json();
    },
  });

  // Transform offline appointments to match AppointmentRequest format
  const offlineRequests: AppointmentRequest[] = useMemo(() => {
    if (!offlineAppointments.length) return [];

    let filtered = offlineAppointments;

    // Filter by status
    if (activeTab !== "all") {
      const statusMap: Record<string, string> = {
        pending: "pending",
        approved: "approved",
        rejected: "rejected",
      };
      const targetStatus = statusMap[activeTab];
      filtered = filtered.filter((apt) => apt.status === targetStatus);
    }

    // Filter by source
    if (sourceFilter !== "all") {
      filtered = filtered.filter((apt) => apt.source === sourceFilter);
    }

    // Transform to AppointmentRequest format
    // Sync pull enriches appointments with flattened fields: clientName, clientEmail, petName, petType
    return filtered.map((apt) => {
      const aptDate = new Date(apt.date);
      const aptAny = apt as any;

      // Generate unique ID - use original ID or create from tempId
      let uniqueId: number;
      if (typeof apt.id === "number" && apt.id > 0) {
        uniqueId = apt.id;
      } else if (typeof apt.id === "string" && apt.id.startsWith("temp_")) {
        // Generate consistent numeric ID from temp string for React keys
        uniqueId =
          parseInt(apt.id.replace(/\D/g, "").slice(-9), 10) ||
          Math.floor(Math.random() * 1000000000);
      } else {
        // Fallback to random ID
        uniqueId = Math.floor(Math.random() * 1000000000);
      }

      return {
        id: uniqueId,
        practiceId: Number(apt.practiceId || userPracticeId || 0),
        clientName: aptAny.clientName || aptAny.client?.name || "N/A",
        clientEmail: aptAny.clientEmail || aptAny.client?.email || "",
        clientPhone: aptAny.clientPhone || aptAny.client?.phone || "",
        petName: aptAny.petName || aptAny.pet?.name || "N/A",
        petType: aptAny.petType || aptAny.pet?.species || "N/A",
        petBreed: aptAny.pet?.breed || null,
        petAge: null,
        reason: apt.description || apt.title || "",
        date: aptDate.toISOString().split("T")[0],
        time: aptDate.toTimeString().slice(0, 5),
        requestNotes: apt.notes || apt.description || null,
        preferredDoctor: aptAny.practitioner?.name || null,
        source: apt.source || "internal",
        status:
          apt.status === "pending"
            ? "PENDING_APPROVAL"
            : apt.status === "approved"
            ? "APPROVED"
            : apt.status === "rejected"
            ? "REJECTED"
            : "PENDING_APPROVAL",
        createdAt: apt.createdAt || new Date().toISOString(),
        updatedAt: apt.updatedAt || null,
        appointmentId: uniqueId,
        rejectionReason: apt.status === "rejected" ? apt.description : null,
        _originalId: apt.id, // Store original ID for operations
      } as AppointmentRequest & { _originalId: string | number };
    });
  }, [offlineAppointments, activeTab, sourceFilter, userPracticeId]);

  // Use offline data when offline, API data when online
  const requests = isOnline ? apiRequests : offlineRequests;
  const isLoading = isOnline ? isLoadingApi : isLoadingOffline;

  // Approve request mutation
  const approveMutation = useMutation({
    networkMode: "always", // Execute immediately regardless of network status
    mutationFn: async (
      request: AppointmentRequest & { _originalId?: string | number }
    ) => {
      // Use original ID if available (for offline appointments with temp IDs)
      const idToUse = (request as any)._originalId || request.id;
      console.log(`Approving appointment request with ID: ${idToUse}`);

      // Check current network status at execution time
      const currentNetworkStatus = isOnlineRef.current && navigator.onLine;

      // If offline, use offline-first approach
      if (!currentNetworkStatus) {
        console.log("[AppointmentRequests] 🔌 OFFLINE - Using offline approve");
        await approveAppointmentRequest(idToUse);
        return { id: idToUse, status: "approved" };
      }

      // If online, call API directly
      console.log("[AppointmentRequests] 🌐 ONLINE - Using API approve");
      const res = await apiRequest(
        "POST",
        `/api/appointment-requests/${idToUse}/approve`
      );
      if (!res.ok) {
        console.error(
          `Failed to approve request: ${res.status} ${res.statusText}`
        );
        throw new Error(
          `Failed to approve request: ${res.status} ${res.statusText}`
        );
      }
      console.log("Request approved successfully");
      return res.json();
    },
    onSuccess: () => {
      // Invalidate queries that start with 'appointment-requests'
      queryClient.invalidateQueries({ queryKey: ["appointment-requests"] });

      // Refresh offline appointments to reflect status change
      refreshOfflineAppointments();

      // Trigger sync if online
      if (isOnline) {
        syncEventEmitter.trigger();
      }

      toast({
        title: "Request Approved",
        description: isOnline
          ? "The appointment request has been approved and added to your schedule."
          : "The appointment request has been approved offline and will sync when online.",
      });
      setIsApproveDialogOpen(false);
    },
    onError: (error: Error) => {
      console.error("Error approving request:", error);
      toast({
        title: "Error Approving Request",
        description:
          error.message ||
          "An unexpected error occurred while approving the request.",
        variant: "destructive",
      });
    },
  });

  // Reject request mutation
  const rejectMutation = useMutation({
    networkMode: "always", // Execute immediately regardless of network status
    mutationFn: async ({
      request,
      reason,
    }: {
      request: AppointmentRequest & { _originalId?: string | number };
      reason: string;
    }) => {
      // Use original ID if available (for offline appointments with temp IDs)
      const idToUse = (request as any)._originalId || request.id;
      console.log(
        `Rejecting appointment request with ID: ${idToUse}, Reason: ${reason}`
      );

      // Check current network status at execution time
      const currentNetworkStatus = isOnlineRef.current && navigator.onLine;

      // If offline, use offline-first approach
      if (!currentNetworkStatus) {
        console.log("[AppointmentRequests] 🔌 OFFLINE - Using offline reject");
        await rejectAppointmentRequest(idToUse, reason);
        return { id: idToUse, status: "rejected" };
      }

      // If online, call API directly
      console.log("[AppointmentRequests] 🌐 ONLINE - Using API reject");
      const res = await apiRequest(
        "POST",
        `/api/appointment-requests/${idToUse}/reject`,
        {
          rejectionReason: reason,
        }
      );
      if (!res.ok) {
        console.error(
          `Failed to reject request: ${res.status} ${res.statusText}`
        );
        throw new Error(
          `Failed to reject request: ${res.status} ${res.statusText}`
        );
      }
      console.log("Request rejected successfully");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointment-requests"] });

      // Refresh offline appointments to reflect status change
      refreshOfflineAppointments();

      // Trigger sync if online
      if (isOnline) {
        syncEventEmitter.trigger();
      }

      toast({
        title: "Request Rejected",
        description: isOnline
          ? "The appointment request has been rejected."
          : "The appointment request has been rejected offline and will sync when online.",
      });
      setIsRejectDialogOpen(false);
      setRejectReason("");
    },
    onError: (error: Error) => {
      console.error("Error rejecting request:", error);
      toast({
        title: "Error Rejecting Request",
        description:
          error.message ||
          "An unexpected error occurred while rejecting the request.",
        variant: "destructive",
      });
    },
  });

  // Delete request mutation
  const deleteMutation = useMutation({
    networkMode: "always", // Execute immediately regardless of network status
    mutationFn: async (id: number) => {
      // Check current network status at execution time
      const currentNetworkStatus = isOnlineRef.current && navigator.onLine;

      if (!currentNetworkStatus) {
        console.log(
          "[AppointmentRequests] 🔌 OFFLINE - Cannot delete (API only operation)"
        );
        throw new Error("Delete operation requires internet connection");
      }

      console.log("[AppointmentRequests] 🌐 ONLINE - Using API delete");
      const res = await apiRequest("DELETE", `/api/appointment-requests/${id}`);
      if (!res.ok) {
        throw new Error(`Failed to delete request: ${res.statusText}`);
      }
      // No JSON parse if DELETE returns no content, or return res.json() if it does
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointment-requests"] });
      toast({
        title: "Request Deleted",
        description: "The appointment request has been deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Deleting Request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleApprove = (request: AppointmentRequest) => {
    setSelectedRequest(request);
    setIsApproveDialogOpen(true);
  };

  const handleReject = (request: AppointmentRequest) => {
    setSelectedRequest(request);
    setIsRejectDialogOpen(true);
  };

  const handleView = (request: AppointmentRequest) => {
    setSelectedRequest(request);
    setIsViewDialogOpen(true);
  };

  const confirmApprove = () => {
    if (selectedRequest) {
      approveMutation.mutate(selectedRequest as any);
    }
  };

  const confirmReject = () => {
    if (selectedRequest && rejectReason.trim()) {
      rejectMutation.mutate({
        request: selectedRequest as any,
        reason: rejectReason,
      });
    }
  };

  const confirmDelete = (id: number) => {
    // Using a more custom AlertDialog for delete might be better UX than native confirm()
    if (
      confirm(
        "Are you sure you want to delete this request? This action cannot be undone."
      )
    ) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_APPROVAL":
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 font-medium"
          >
            Pending
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 font-medium"
          >
            Approved
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50 font-medium"
          >
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="font-medium">
            {status}
          </Badge>
        );
    }
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case "internal":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50 font-medium"
          >
            Internal
          </Badge>
        );
      case "external":
        return (
          <Badge
            variant="outline"
            className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-50 font-medium"
          >
            External
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="font-medium">
            {source}
          </Badge>
        );
    }
  };

  // Removed the top-level isLoading check
  // if (isLoading) {
  //   return (
  //     <div className="flex items-center justify-center h-full">
  //       <Loader2 className="h-10 w-10 animate-spin text-primary" />
  //     </div>
  //   );
  // }

  return (
    <MarketplaceFeatureContainer
      featureName="Website Requests"
      featureId="website-requests"
      addOnId="6"
      description="Manage appointment requests from your website integration. This feature requires the Website Integration add-on."
    >
      <div className="container mx-auto py-8">
        <div>
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Appointment Requests
              </h1>
              {/* Network Status & Sync Indicator */}
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Badge variant="outline" className="gap-1.5">
                    <Wifi className="h-3 w-3 text-green-600" />
                    <span className="text-xs">Online</span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1.5">
                    <WifiOff className="h-3 w-3 text-orange-600" />
                    <span className="text-xs">Offline Mode</span>
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <p className="text-gray-600 text-lg">
            Manage appointment requests from your website and internal bookings
          </p>
        </div>
        <div className="mb-6 flex items-center justify-between">
          <Tabs
            defaultValue="pending"
            value={activeTab}
            onValueChange={setActiveTab}
          >
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Source:</span>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-36 h-9 bg-white border-gray-200 hover:border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary transition-colors">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="min-w-36">
                <SelectItem value="all" className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                    All Sources
                  </div>
                </SelectItem>
                <SelectItem value="internal" className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    Internal
                  </div>
                </SelectItem>
                <SelectItem value="external" className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    External
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card className="shadow-sm border-gray-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-semibold text-gray-900">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}{" "}
              Appointment Requests
            </CardTitle>
            <CardDescription className="text-gray-600">
              {activeTab === "pending" &&
                "Review and process incoming appointment requests from your website and internal bookings."}
              {activeTab === "approved" &&
                "View appointment requests that have been approved and added to your schedule."}
              {activeTab === "rejected" &&
                "View appointment requests that have been rejected."}
              {activeTab === "all" &&
                "View all appointment requests regardless of status."}
              {sourceFilter !== "all" && (
                <span className="block mt-2 text-sm font-medium text-primary">
                  Filtered by {sourceFilter} requests
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Conditionally render loader or content based on isLoading */}
            {isLoading ? (
              <div className="flex items-center justify-center min-h-[200px]">
                {" "}
                {/* Added min-height for better loader visibility */}
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : requests && requests.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {requests.map((request) => (
                  <Card
                    key={request.id}
                    className="overflow-hidden hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-4 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getStatusBadge(request.status)}
                          {getSourceBadge(request.source)}
                          <div className="h-4 w-px bg-gray-300"></div>
                          <span className="text-sm text-gray-600 font-medium">
                            {new Date(request.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year:
                                  new Date(request.createdAt).getFullYear() !==
                                  new Date().getFullYear()
                                    ? "numeric"
                                    : undefined,
                              }
                            )}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(request)}
                          className="h-8 w-8 p-0 hover:bg-white/80"
                        >
                          <PenBox className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center text-lg font-semibold">
                          <User className="h-4 w-4 mr-2 text-gray-400" />
                          {request.clientName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {request.clientEmail}
                        </div>
                        {request.clientPhone && (
                          <div className="text-sm text-gray-500">
                            {request.clientPhone}
                          </div>
                        )}

                        <div className="pt-2 border-t mt-3">
                          <div className="font-medium">
                            Pet: {request.petName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {request.petType}
                          </div>
                          {request.petBreed && (
                            <div className="text-sm text-gray-500">
                              {request.petBreed}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center pt-2">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="text-sm">
                            {format(new Date(request.date), "PP")}
                          </span>
                        </div>

                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="text-sm">{request.time}</span>
                        </div>

                        <div className="font-medium pt-2">
                          Reason: {request.reason}
                        </div>

                        {request.status === "PENDING_APPROVAL" && (
                          <div className="flex space-x-2 pt-2">
                            <Button
                              className="flex-1"
                              size="sm"
                              onClick={() => handleApprove(request)}
                              disabled={approveMutation.isPending}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              className="flex-1"
                              variant="outline"
                              size="sm"
                              onClick={() => handleReject(request)}
                              disabled={rejectMutation.isPending}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}

                        {request.status === "REJECTED" &&
                          request.rejectionReason && (
                            <div className="pt-2 text-sm">
                              <span className="font-medium">
                                Reason for rejection:
                              </span>
                              <p className="text-gray-500">
                                {request.rejectionReason}
                              </p>
                            </div>
                          )}

                        {request.status === "APPROVED" &&
                          request.appointmentId && (
                            <div className="pt-2 text-sm">
                              <span className="font-medium">
                                Appointment ID:
                              </span>
                              <p className="text-gray-500">
                                #{request.appointmentId}
                              </p>
                            </div>
                          )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Calendar className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No requests found
                </h3>
                <p className="text-gray-500 max-w-sm mx-auto">
                  {sourceFilter !== "all"
                    ? `No ${activeTab} ${sourceFilter} appointment requests found.`
                    : `No ${activeTab} appointment requests found.`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <AlertDialog
          open={isApproveDialogOpen}
          onOpenChange={setIsApproveDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Approve Appointment Request</AlertDialogTitle>
              <AlertDialogDescription>
                This will create a new appointment on {selectedRequest?.date} at{" "}
                {selectedRequest?.time} for {selectedRequest?.clientName} with{" "}
                {selectedRequest?.petName}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmApprove}
                disabled={approveMutation.isPending}
              >
                {approveMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Approving...
                  </>
                ) : (
                  "Approve Request"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Appointment Request</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this appointment request.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <Label htmlFor="reason">Reason for rejection</Label>
              <Textarea
                id="reason"
                placeholder="e.g., No available appointments at that time, please select a different date/time."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="mt-2"
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsRejectDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmReject}
                disabled={rejectMutation.isPending || !rejectReason.trim()}
              >
                {rejectMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  "Reject Request"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Appointment Request Details</DialogTitle>
              <DialogDescription>
                {selectedRequest?.status === "PENDING_APPROVAL"
                  ? "Review the appointment request details."
                  : selectedRequest?.status === "APPROVED"
                  ? "This appointment request has been approved."
                  : "This appointment request has been rejected."}
              </DialogDescription>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Status</Label>
                    <div className="mt-1">
                      {getStatusBadge(selectedRequest.status)}
                    </div>
                  </div>
                  <div>
                    <Label>Source</Label>
                    <div className="mt-1">
                      {getSourceBadge(selectedRequest.source)}
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Client Information</Label>
                  <div className="mt-1 space-y-1 text-sm">
                    <div>
                      <span className="font-medium">Name:</span>{" "}
                      {selectedRequest.clientName}
                    </div>
                    <div>
                      <span className="font-medium">Email:</span>{" "}
                      {selectedRequest.clientEmail}
                    </div>
                    <div>
                      <span className="font-medium">Phone:</span>{" "}
                      {selectedRequest.clientPhone || "Not provided"}
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Pet Information</Label>
                  <div className="mt-1 space-y-1 text-sm">
                    <div>
                      <span className="font-medium">Name:</span>{" "}
                      {selectedRequest.petName}
                    </div>
                    <div>
                      <span className="font-medium">Type:</span>{" "}
                      {selectedRequest.petType}
                    </div>
                    {selectedRequest.petBreed && (
                      <div>
                        <span className="font-medium">Breed:</span>{" "}
                        {selectedRequest.petBreed}
                      </div>
                    )}
                    {selectedRequest.petAge && (
                      <div>
                        <span className="font-medium">Age:</span>{" "}
                        {selectedRequest.petAge}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Appointment Details</Label>
                  <div className="mt-1 space-y-1 text-sm">
                    <div>
                      <span className="font-medium">Date:</span>{" "}
                      {format(new Date(selectedRequest.date), "PP")}
                    </div>
                    <div>
                      <span className="font-medium">Time:</span>{" "}
                      {selectedRequest.time}
                    </div>
                    <div>
                      <span className="font-medium">Reason:</span>{" "}
                      {selectedRequest.reason}
                    </div>
                    {selectedRequest.preferredDoctor && (
                      <div>
                        <span className="font-medium">Preferred Doctor:</span>{" "}
                        {selectedRequest.preferredDoctor}
                      </div>
                    )}
                  </div>
                </div>

                {selectedRequest.requestNotes && (
                  <div>
                    <Label>Additional Notes</Label>
                    <div className="mt-1 text-sm whitespace-pre-wrap">
                      {selectedRequest.requestNotes}
                    </div>
                  </div>
                )}

                {selectedRequest.status === "REJECTED" &&
                  selectedRequest.rejectionReason && (
                    <div>
                      <Label>Rejection Reason</Label>
                      <div className="mt-1 text-sm whitespace-pre-wrap">
                        {selectedRequest.rejectionReason}
                      </div>
                    </div>
                  )}

                {selectedRequest.status === "APPROVED" &&
                  selectedRequest.appointmentId && (
                    <div>
                      <Label>Appointment ID</Label>
                      <div className="mt-1 text-sm">
                        #{selectedRequest.appointmentId}
                      </div>
                    </div>
                  )}

                <div className="pt-4">
                  <Label>Request Information</Label>
                  <div className="mt-1 space-y-1 text-sm">
                    <div>
                      <span className="font-medium">Created:</span>{" "}
                      {format(new Date(selectedRequest.createdAt), "PPpp")}
                    </div>
                    {selectedRequest.updatedAt && (
                      <div>
                        <span className="font-medium">Last Updated:</span>{" "}
                        {format(new Date(selectedRequest.updatedAt), "PPpp")}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter className="flex justify-between mt-6">
              {selectedRequest?.status === "PENDING_APPROVAL" && (
                <div className="flex space-x-2">
                  <Button
                    onClick={() => {
                      setIsViewDialogOpen(false);
                      // Ensure selectedRequest exists before passing
                      if (selectedRequest) handleApprove(selectedRequest);
                    }}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsViewDialogOpen(false);
                      // Ensure selectedRequest exists before passing
                      if (selectedRequest) handleReject(selectedRequest);
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              )}
              <Button
                variant={
                  selectedRequest?.status === "PENDING_APPROVAL"
                    ? "ghost"
                    : "default"
                }
                onClick={() => setIsViewDialogOpen(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MarketplaceFeatureContainer>
  );
}
