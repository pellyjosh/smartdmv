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
  Plus,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import Link from "next/link";

interface Message {
  id: string;
  subject: string;
  content: string;
  contactMethod: string;
  urgency: string;
  status: string;
  practitionerId?: string;
  practitioner?: {
    id: string;
    name: string;
    email: string;
  };
  petId?: string;
  pet?: {
    id: string;
    name: string;
    species: string;
  };
  createdAt: string;
  updatedAt: string;
  responses?: MessageResponse[];
}

interface MessageResponse {
  id: string;
  content: string;
  fromPractitioner: boolean;
  practitioner?: {
    id: string;
    name: string;
  };
  createdAt: string;
}

export function MessagesTab() {
  const { user } = useUser();
  const { toast } = useToast();

  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch messages/conversations
  const {
    data: messages,
    isLoading: isLoadingMessages,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ["/api/messages/client"],
    queryFn: async () => {
      const response = await fetch("/api/messages/client", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch messages");
      return response.json();
    },
    enabled: !!user && user.role === "CLIENT",
  });

  // Reply to message mutation
  const replyMutation = useMutation({
    mutationFn: async ({
      messageId,
      content,
    }: {
      messageId: string;
      content: string;
    }) => {
      const response = await fetch(`/api/messages/${messageId}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || "Failed to send reply");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Reply Sent!",
        description: "Your reply has been sent successfully.",
      });
      setReplyContent("");
      setIsReplying(false);
      refetchMessages();
      // Refresh selected message if it's open
      if (selectedMessage) {
        // You might want to refetch the specific message details here
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send Reply",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleReply = () => {
    if (!selectedMessage || !replyContent.trim()) return;

    replyMutation.mutate({
      messageId: selectedMessage.id,
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
        return "Phone Call";
      case "video_call":
        return "Video Call";
      default:
        return "Message";
    }
  };

  const filteredMessages =
    messages?.filter(
      (message: Message) =>
        message.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.practitioner?.name
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
    ) || [];

  if (!user || user.role !== "CLIENT") {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            Access denied. Client login required.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Messages</h2>
          <p className="text-muted-foreground">
            View and respond to messages from your veterinary team
          </p>
        </div>
        <Button asChild>
          <Link href="/client/contact-veterinarian">
            <Plus className="h-4 w-4 mr-2" />
            New Message
          </Link>
        </Button>
      </div>

      <div className="flex gap-6">
        {/* Messages List */}
        <div className="flex-1 max-w-md space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-[600px]">
            <div className="space-y-2">
              {isLoadingMessages ? (
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
              ) : filteredMessages.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {messages?.length === 0
                        ? "No messages yet. Start a conversation with your veterinarian."
                        : "No messages match your search."}
                    </p>
                    {messages?.length === 0 && (
                      <Button asChild className="mt-4">
                        <Link href="/client/contact-veterinarian">
                          Send First Message
                        </Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                filteredMessages.map((message: Message) => {
                  const ContactIcon = getContactMethodIcon(
                    message.contactMethod
                  );
                  const isSelected = selectedMessage?.id === message.id;

                  return (
                    <Card
                      key={message.id}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-accent/50",
                        isSelected && "border-primary bg-primary/5"
                      )}
                      onClick={() => setSelectedMessage(message)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-sm font-medium truncate pr-2">
                            {message.subject}
                          </CardTitle>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <ContactIcon className="h-3 w-3 text-muted-foreground" />
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs",
                                getUrgencyColor(message.urgency)
                              )}
                            >
                              {message.urgency}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {message.practitioner ? (
                            <span>Dr. {message.practitioner.name}</span>
                          ) : (
                            <span>Veterinary Team</span>
                          )}
                          {message.pet && (
                            <>
                              <span>•</span>
                              <span>{message.pet.name}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>
                            {format(
                              new Date(message.createdAt),
                              "MMM d, h:mm a"
                            )}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {message.content}
                        </p>
                        {message.responses && message.responses.length > 0 && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <Reply className="h-3 w-3" />
                            <span>
                              {message.responses.length} response
                              {message.responses.length !== 1 ? "s" : ""}
                            </span>
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

        {/* Message Detail */}
        <div className="flex-1">
          {selectedMessage ? (
            <Card className="h-[700px] flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {selectedMessage.subject}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <span>
                        {getContactMethodLabel(selectedMessage.contactMethod)}
                      </span>
                      <span>•</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          getUrgencyColor(selectedMessage.urgency)
                        )}
                      >
                        {selectedMessage.urgency} priority
                      </Badge>
                      <span>•</span>
                      <span>
                        {format(
                          new Date(selectedMessage.createdAt),
                          "MMM d, yyyy 'at' h:mm a"
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                {(selectedMessage.practitioner || selectedMessage.pet) && (
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t">
                    {selectedMessage.practitioner && (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {selectedMessage.practitioner.name
                              .substring(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            Dr. {selectedMessage.practitioner.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Veterinarian
                          </p>
                        </div>
                      </div>
                    )}
                    {selectedMessage.pet && (
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium">
                            {selectedMessage.pet.name
                              .substring(0, 1)
                              .toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {selectedMessage.pet.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {selectedMessage.pet.species}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardHeader>

              <ScrollArea className="flex-1">
                <CardContent className="space-y-4">
                  {/* Original Message */}
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {user.name?.substring(0, 2).toUpperCase() || "ME"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">You</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(selectedMessage.createdAt), "h:mm a")}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">
                      {selectedMessage.content}
                    </p>
                  </div>

                  {/* Responses */}
                  {selectedMessage.responses?.map((response) => (
                    <div key={response.id} className="space-y-2">
                      <div
                        className={cn(
                          "p-4 rounded-lg",
                          response.fromPractitioner
                            ? "bg-blue-50 border border-blue-200"
                            : "bg-muted/30"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {response.fromPractitioner
                                ? response.practitioner?.name
                                    .substring(0, 2)
                                    .toUpperCase()
                                : user.name?.substring(0, 2).toUpperCase() ||
                                  "ME"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">
                            {response.fromPractitioner
                              ? `Dr. ${response.practitioner?.name}`
                              : "You"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(response.createdAt), "h:mm a")}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">
                          {response.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </ScrollArea>

              {/* Reply Section */}
              <CardContent className="border-t pt-4">
                <div className="space-y-3">
                  <Label htmlFor="reply">Reply</Label>
                  <Textarea
                    id="reply"
                    placeholder="Type your reply..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    rows={3}
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
            <Card className="h-[700px] flex items-center justify-center">
              <CardContent className="text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Select a message to view the conversation
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
