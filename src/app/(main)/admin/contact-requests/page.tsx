"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare,
  Send,
  Reply,
  Clock,
  User,
  Stethoscope,
  Phone,
  Video,
  Mail,
  AlertCircle,
  CheckCircle2,
  Search,
  Filter,
  PawPrint,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isValid } from "date-fns";
import Link from "next/link";

// Safe date formatter to handle invalid dates
const safeFormat = (
  dateValue: string | Date | null | undefined,
  formatStr: string
): string => {
  if (!dateValue) return "Unknown date";

  try {
    const date =
      typeof dateValue === "string" ? new Date(dateValue) : dateValue;
    if (!isValid(date)) return "Invalid date";
    return format(date, formatStr);
  } catch (error) {
    console.error("Date formatting error:", error, "Date value:", dateValue);
    return "Invalid date";
  }
};

interface ContactRequest {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  practiceId: number;
  userId: number;
  relatedType: string;
  relatedId: string;
  link: string;
  read: boolean;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  client?: {
    id: string;
    name: string;
    email: string;
  };
  metadata?: any;
}

export default function ClientContactRequestsPage() {
  const { user } = useUser();
  const { toast } = useToast();

  const [selectedRequest, setSelectedRequest] = useState<ContactRequest | null>(
    null
  );
  const [replyContent, setReplyContent] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "unread" | "read">(
    "all"
  );
  const [filterUrgency, setFilterUrgency] = useState<
    "all" | "emergency" | "high" | "medium" | "low"
  >("all");

  // Fetch contact requests (using notifications as the data source)
  const {
    data: requests,
    isLoading: isLoadingRequests,
    refetch: refetchRequests,
  } = useQuery({
    queryKey: ["/api/admin/contact-requests"],
    queryFn: async () => {
      const response = await fetch("/api/admin/contact-requests", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch contact requests");
      return response.json();
    },
    enabled:
      !!user && (user.role === "ADMINISTRATOR" || user.role === "VETERINARIAN"),
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const response = await fetch(
        `/api/admin/contact-requests/${requestId}/read`,
        {
          method: "PATCH",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to mark as read");
      }

      return response.json();
    },
    onSuccess: () => {
      refetchRequests();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark as read",
        variant: "destructive",
      });
    },
  });

  // Reply mutation
  const replyMutation = useMutation({
    mutationFn: async ({
      requestId,
      content,
    }: {
      requestId: string;
      content: string;
    }) => {
      const response = await fetch(
        `/api/admin/contact-requests/${requestId}/reply`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ content }),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || "Failed to send reply");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Reply Sent!",
        description: "Your reply has been sent to the client.",
      });
      setReplyContent("");
      setIsReplying(false);
      refetchRequests();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send Reply",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleMarkAsRead = (requestId: string) => {
    markAsReadMutation.mutate(requestId);
  };

  const handleReply = () => {
    if (!selectedRequest || !replyContent.trim()) return;

    replyMutation.mutate({
      requestId: selectedRequest.id,
      content: replyContent.trim(),
    });
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "emergency":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getContactMethodIcon = (method: string) => {
    switch (method) {
      case "message":
        return MessageSquare;
      case "email":
        return Mail;
      case "phone_call":
        return Phone;
      case "video_call":
        return Video;
      default:
        return MessageSquare;
    }
  };

  const getContactMethodLabel = (method: string) => {
    switch (method) {
      case "message":
        return "Message";
      case "email":
        return "Email Request";
      case "phone_call":
        return "Phone Call Request";
      case "video_call":
        return "Video Call Request";
      default:
        return "Contact Request";
    }
  };

  const filteredRequests =
    requests?.filter((request: ContactRequest) => {
      // Safety check for request object
      if (!request) return false;

      // Filter by status
      if (filterStatus === "read" && !request.read) return false;
      if (filterStatus === "unread" && request.read) return false;

      // Filter by urgency
      const metadata = request.metadata
        ? typeof request.metadata === "string"
          ? JSON.parse(request.metadata)
          : request.metadata
        : {};
      const urgency = metadata.urgency || "medium";
      if (filterUrgency !== "all" && urgency !== filterUrgency) return false;

      // Filter by search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          (request.title || "").toLowerCase().includes(searchLower) ||
          (request.message || "").toLowerCase().includes(searchLower) ||
          (metadata.clientName &&
            metadata.clientName.toLowerCase().includes(searchLower))
        );
      }

      return true;
    }) || [];

  if (
    !user ||
    (user.role !== "ADMINISTRATOR" && user.role !== "VETERINARIAN")
  ) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Access denied. Administrator or veterinarian login required.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Client Contact Requests</h1>
        <p className="text-muted-foreground">
          View and respond to contact requests from clients
        </p>
      </div>

      <div className="flex gap-6">
        {/* Requests List */}
        <div className="flex-1 max-w-md space-y-4">
          {/* Filters */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              <Select
                value={filterStatus}
                onValueChange={(value: any) => setFilterStatus(value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filterUrgency}
                onValueChange={(value: any) => setFilterUrgency(value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Urgency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <ScrollArea className="h-[700px]">
            <div className="space-y-2">
              {isLoadingRequests ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-2/3 mt-2" />
                    </CardContent>
                  </Card>
                ))
              ) : filteredRequests.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {requests?.length === 0
                        ? "No contact requests yet."
                        : "No requests match your filters."}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredRequests.map((request: ContactRequest) => {
                  // Safe metadata parsing
                  let metadata: any = {};
                  try {
                    metadata = request.metadata
                      ? typeof request.metadata === "string"
                        ? JSON.parse(request.metadata)
                        : request.metadata
                      : {};
                  } catch (error) {
                    console.error("Error parsing metadata:", error);
                    metadata = {};
                  }

                  const ContactIcon = getContactMethodIcon(
                    metadata.contactMethod || "message"
                  );
                  const isSelected = selectedRequest?.id === request.id;
                  const urgency = metadata.urgency || "medium";

                  return (
                    <Card
                      key={request.id}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-accent/50",
                        isSelected && "border-primary bg-primary/5",
                        !request.read && "border-l-4 border-l-primary"
                      )}
                      onClick={() => {
                        setSelectedRequest(request);
                        if (!request.read) {
                          handleMarkAsRead(request.id);
                        }
                      }}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-sm font-medium truncate pr-2">
                            {request.title}
                            {!request.read && (
                              <Badge className="ml-2" variant="default">
                                New
                              </Badge>
                            )}
                          </CardTitle>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <ContactIcon className="h-3 w-3 text-muted-foreground" />
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs",
                                getUrgencyColor(urgency)
                              )}
                            >
                              {urgency}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{metadata.clientName || "Client"}</span>
                          {metadata.petName && (
                            <>
                              <span>•</span>
                              <PawPrint className="h-3 w-3" />
                              <span>{metadata.petName}</span>
                            </>
                          )}
                          <span>•</span>
                          <Clock className="h-3 w-3" />
                          <span>
                            {safeFormat(request.created_at, "MMM d, h:mm a")}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {request.message}
                        </p>
                        {metadata.phoneNumber && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{metadata.phoneNumber}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Request Detail */}
        <div className="flex-1">
          {selectedRequest ? (
            <Card className="h-[800px] flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {selectedRequest.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      {(() => {
                        const metadata = selectedRequest.metadata
                          ? JSON.parse(selectedRequest.metadata)
                          : {};
                        return (
                          <>
                            <span>
                              {getContactMethodLabel(
                                metadata.contactMethod || "message"
                              )}
                            </span>
                            <span>•</span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs",
                                getUrgencyColor(metadata.urgency || "medium")
                              )}
                            >
                              {metadata.urgency || "medium"} priority
                            </Badge>
                            <span>•</span>
                            <span>
                              {safeFormat(
                                selectedRequest.created_at,
                                "MMM d, yyyy 'at' h:mm a"
                              )}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedRequest.link && (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={selectedRequest.link}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Client
                        </Link>
                      </Button>
                    )}
                    {!selectedRequest.read && (
                      <Badge variant="default">New</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <ScrollArea className="flex-1">
                <CardContent className="space-y-4">
                  {/* Client Information */}
                  {(() => {
                    const metadata = selectedRequest.metadata
                      ? JSON.parse(selectedRequest.metadata)
                      : {};
                    return (
                      <div className="bg-muted/30 p-4 rounded-lg">
                        <h4 className="font-medium mb-3">Client Information</h4>
                        <div className="grid gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Client:</span>
                            <span>
                              {metadata.clientName || "Unknown Client"}
                            </span>
                          </div>
                          {metadata.petName && (
                            <div className="flex items-center gap-2">
                              <PawPrint className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">Pet:</span>
                              <span>{metadata.petName}</span>
                            </div>
                          )}
                          {metadata.phoneNumber && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">Phone:</span>
                              <span>{metadata.phoneNumber}</span>
                            </div>
                          )}
                          {metadata.preferredTime && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                Preferred Time:
                              </span>
                              <span>{metadata.preferredTime}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Original Message */}
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">CL</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        Client Message
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {safeFormat(selectedRequest.created_at, "h:mm a")}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">
                      {selectedRequest.message}
                    </p>
                  </div>
                </CardContent>
              </ScrollArea>

              {/* Reply Section */}
              <CardContent className="border-t pt-4">
                <div className="space-y-3">
                  <Label htmlFor="reply">Reply to Client</Label>
                  <Textarea
                    id="reply"
                    placeholder="Type your reply to the client..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    rows={4}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setReplyContent("");
                        setIsReplying(false);
                      }}
                      disabled={replyMutation.isPending}
                    >
                      Clear
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleReply}
                      disabled={!replyContent.trim() || replyMutation.isPending}
                    >
                      {replyMutation.isPending ? (
                        <>
                          <div className="h-3 w-3 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-3 w-3 mr-2" />
                          Send Reply
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-[800px] flex items-center justify-center">
              <CardContent className="text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Select a contact request to view details and respond
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
