'use client';

import { useState } from "react";
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
import { Loader2, Calendar, Clock, User, PenBox, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input"; // Input is not used, can be removed if not needed elsewhere in future
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/context/UserContext";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";


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
  const [selectedRequest, setSelectedRequest] = useState<AppointmentRequest | null>(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  
  // Fetch appointment requests
  const { data: requests, isLoading } = useQuery<AppointmentRequest[]>({
    queryKey: ['appointment-requests', userPracticeId, activeTab], // Changed queryKey to remove leading slash for consistency
    enabled: !!userPracticeId,
    queryFn: async () => {
      // Ensure status is uppercase for API if needed, and handle 'all'
      const statusParam = activeTab === "all" ? "" : `&status=${activeTab.toLowerCase()}`;
      const res = await apiRequest(
        "GET", 
        `/api/appointment-requests?practiceId=${userPracticeId}${statusParam}`
      );
      // It's good practice to ensure the response is OK before parsing
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return await res.json();
    }
  });
  
  // Approve request mutation
  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      console.log(`Approving appointment request with ID: ${id}`);
      const res = await apiRequest("POST", `/api/appointment-requests/${id}/approve`);
      if (!res.ok) {
        console.error(`Failed to approve request: ${res.status} ${res.statusText}`);
        throw new Error(`Failed to approve request: ${res.status} ${res.statusText}`);
      }
      console.log("Request approved successfully");
      return res.json(); // Assuming success returns some data
    },
    onSuccess: () => {
      // Invalidate queries that start with 'appointment-requests'
      queryClient.invalidateQueries({ queryKey: ['appointment-requests'] });
      toast({
        title: "Request Approved",
        description: "The appointment request has been approved and added to your schedule.",
      });
      setIsApproveDialogOpen(false);
    },
    onError: (error: Error) => {
      console.error("Error approving request:", error);
      toast({
        title: "Error Approving Request",
        description: error.message || "An unexpected error occurred while approving the request.",
        variant: "destructive",
      });
    },
  });
  
  // Reject request mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      console.log(`Rejecting appointment request with ID: ${id}, Reason: ${reason}`);
      const res = await apiRequest("POST", `/api/appointment-requests/${id}/reject`, {
        rejectionReason: reason
      });
      if (!res.ok) {
        console.error(`Failed to reject request: ${res.status} ${res.statusText}`);
        throw new Error(`Failed to reject request: ${res.status} ${res.statusText}`);
      }
      console.log("Request rejected successfully");
      return res.json(); // Assuming success returns some data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment-requests'] });
      toast({
        title: "Request Rejected",
        description: "The appointment request has been rejected.",
      });
      setIsRejectDialogOpen(false);
      setRejectReason("");
    },
    onError: (error: Error) => {
      console.error("Error rejecting request:", error);
      toast({
        title: "Error Rejecting Request",
        description: error.message || "An unexpected error occurred while rejecting the request.",
        variant: "destructive",
      });
    },
  });
  
  // Delete request mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/appointment-requests/${id}`);
      if (!res.ok) {
        throw new Error(`Failed to delete request: ${res.statusText}`);
      }
      // No JSON parse if DELETE returns no content, or return res.json() if it does
      return res; 
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment-requests'] });
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
      approveMutation.mutate(selectedRequest.id);
    }
  };
  
  const confirmReject = () => {
    if (selectedRequest && rejectReason.trim()) {
      rejectMutation.mutate({ id: selectedRequest.id, reason: rejectReason });
    }
  };
  
  const confirmDelete = (id: number) => {
    // Using a more custom AlertDialog for delete might be better UX than native confirm()
    if (confirm("Are you sure you want to delete this request? This action cannot be undone.")) {
      deleteMutation.mutate(id);
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_APPROVAL":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      case "APPROVED":
        return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">Approved</Badge>;
      case "REJECTED":
        return <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Appointment Requests</h1>
        <p className="text-gray-500">
          Manage appointment requests from your website
        </p>
      </div>
      
      <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>
      
      <Card>
        <CardHeader>
          <CardTitle>
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Appointment Requests
          </CardTitle>
          <CardDescription>
            {activeTab === "pending" && "Review and process incoming appointment requests from your website."}
            {activeTab === "approved" && "View appointment requests that have been approved and added to your schedule."}
            {activeTab === "rejected" && "View appointment requests that have been rejected."}
            {activeTab === "all" && "View all appointment requests regardless of status."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Conditionally render loader or content based on isLoading */}
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[200px]"> {/* Added min-height for better loader visibility */}
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : requests && requests.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {requests.map((request) => (
                <Card key={request.id} className="overflow-hidden">
                  <div className="bg-primary/10 p-4 flex items-center justify-between">
                    <div className="flex items-center">
                      {getStatusBadge(request.status)}
                      <span className="ml-2 text-sm text-gray-500">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleView(request)}>
                      <PenBox className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center text-lg font-semibold">
                        <User className="h-4 w-4 mr-2 text-gray-400" />
                        {request.clientName}
                      </div>
                      <div className="text-sm text-gray-500">{request.clientEmail}</div>
                      {request.clientPhone && (
                        <div className="text-sm text-gray-500">{request.clientPhone}</div>
                      )}
                      
                      <div className="pt-2 border-t mt-3">
                        <div className="font-medium">Pet: {request.petName}</div>
                        <div className="text-sm text-gray-500">{request.petType}</div>
                        {request.petBreed && (
                          <div className="text-sm text-gray-500">{request.petBreed}</div>
                        )}
                      </div>
                      
                      <div className="flex items-center pt-2">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="text-sm">{format(new Date(request.date), 'PP')}</span>
                      </div>
                      
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="text-sm">{request.time}</span>
                      </div>
                      
                      <div className="font-medium pt-2">Reason: {request.reason}</div>
                      
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
                      
                      {request.status === "REJECTED" && request.rejectionReason && (
                        <div className="pt-2 text-sm">
                          <span className="font-medium">Reason for rejection:</span>
                          <p className="text-gray-500">{request.rejectionReason}</p>
                        </div>
                      )}
                      
                      {request.status === "APPROVED" && request.appointmentId && (
                        <div className="pt-2 text-sm">
                          <span className="font-medium">Appointment ID:</span>
                          <p className="text-gray-500">#{request.appointmentId}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No {activeTab} appointment requests found.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <AlertDialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Appointment Request</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a new appointment on {selectedRequest?.date} at {selectedRequest?.time} for {selectedRequest?.clientName} with {selectedRequest?.petName}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmApprove} disabled={approveMutation.isPending}>
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
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
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
                : "This appointment request has been rejected."
              }
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                </div>
                <div>
                  <Label>Source</Label>
                  <div className="mt-1 text-sm">{selectedRequest.source}</div>
                </div>
              </div>
              
              <div>
                <Label>Client Information</Label>
                <div className="mt-1 space-y-1 text-sm">
                  <div><span className="font-medium">Name:</span> {selectedRequest.clientName}</div>
                  <div><span className="font-medium">Email:</span> {selectedRequest.clientEmail}</div>
                  <div><span className="font-medium">Phone:</span> {selectedRequest.clientPhone || "Not provided"}</div>
                </div>
              </div>
              
              <div>
                <Label>Pet Information</Label>
                <div className="mt-1 space-y-1 text-sm">
                  <div><span className="font-medium">Name:</span> {selectedRequest.petName}</div>
                  <div><span className="font-medium">Type:</span> {selectedRequest.petType}</div>
                  {selectedRequest.petBreed && (
                    <div><span className="font-medium">Breed:</span> {selectedRequest.petBreed}</div>
                  )}
                  {selectedRequest.petAge && (
                    <div><span className="font-medium">Age:</span> {selectedRequest.petAge}</div>
                  )}
                </div>
              </div>
              
              <div>
                <Label>Appointment Details</Label>
                <div className="mt-1 space-y-1 text-sm">
                  <div><span className="font-medium">Date:</span> {format(new Date(selectedRequest.date), 'PP')}</div>
                  <div><span className="font-medium">Time:</span> {selectedRequest.time}</div>
                  <div><span className="font-medium">Reason:</span> {selectedRequest.reason}</div>
                  {selectedRequest.preferredDoctor && (
                    <div><span className="font-medium">Preferred Doctor:</span> {selectedRequest.preferredDoctor}</div>
                  )}
                </div>
              </div>
              
              {selectedRequest.requestNotes && (
                <div>
                  <Label>Additional Notes</Label>
                  <div className="mt-1 text-sm whitespace-pre-wrap">{selectedRequest.requestNotes}</div>
                </div>
              )}
              
              {selectedRequest.status === "REJECTED" && selectedRequest.rejectionReason && (
                <div>
                  <Label>Rejection Reason</Label>
                  <div className="mt-1 text-sm whitespace-pre-wrap">{selectedRequest.rejectionReason}</div>
                </div>
              )}
              
              {selectedRequest.status === "APPROVED" && selectedRequest.appointmentId && (
                <div>
                  <Label>Appointment ID</Label>
                  <div className="mt-1 text-sm">#{selectedRequest.appointmentId}</div>
                </div>
              )}
              
              <div className="pt-4">
                <Label>Request Information</Label>
                <div className="mt-1 space-y-1 text-sm">
                  <div><span className="font-medium">Created:</span> {format(new Date(selectedRequest.createdAt), 'PPpp')}</div>
                  {selectedRequest.updatedAt && (
                    <div><span className="font-medium">Last Updated:</span> {format(new Date(selectedRequest.updatedAt), 'PPpp')}</div>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex justify-between mt-6">
            {selectedRequest?.status === "PENDING_APPROVAL" && (
              <div className="flex space-x-2">
                <Button onClick={() => {
                  setIsViewDialogOpen(false);
                  // Ensure selectedRequest exists before passing
                  if (selectedRequest) handleApprove(selectedRequest);
                }}>
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button variant="outline" onClick={() => {
                  setIsViewDialogOpen(false);
                  // Ensure selectedRequest exists before passing
                  if (selectedRequest) handleReject(selectedRequest);
                }}>
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
            )}
            <Button variant={selectedRequest?.status === "PENDING_APPROVAL" ? "ghost" : "default"} onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </MarketplaceFeatureContainer>
  );
}
