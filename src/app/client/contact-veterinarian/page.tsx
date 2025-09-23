"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  ArrowLeft,
  Phone,
  MessageSquare,
  Video,
  Clock,
  User,
  PawPrint,
  Stethoscope,
  Send,
  AlertCircle,
  CheckCircle,
  Calendar,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ClientHeader } from "@/components/client/ClientHeader";

const contactMethods = [
  {
    id: "message",
    name: "Send Message",
    description: "Send a direct message to the veterinarian",
    icon: MessageSquare,
    color: "bg-blue-50 text-blue-700 border-blue-200",
    available: false,
  },
  {
    id: "video_call",
    name: "Video Consultation",
    description: "Request immediate video consultation",
    icon: Video,
    color: "bg-purple-50 text-purple-700 border-purple-200",
    available: false,
  },
  {
    id: "phone_call",
    name: "Phone Call",
    description: "Request a phone call back",
    icon: Phone,
    color: "bg-orange-50 text-orange-700 border-orange-200",
    available: true,
  },
];

const urgencyLevels = [
  {
    id: "low",
    name: "Low",
    description: "General questions or routine matters",
    color: "bg-gray-50 text-gray-700 border-gray-200",
  },
  {
    id: "medium",
    name: "Medium",
    description: "Important but not urgent",
    color: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  {
    id: "high",
    name: "High",
    description: "Urgent but not life-threatening",
    color: "bg-orange-50 text-orange-700 border-orange-200",
  },
  {
    id: "emergency",
    name: "Emergency",
    description: "Immediate attention required",
    color: "bg-red-50 text-red-700 border-red-200",
  },
];

export default function ContactVeterinarianPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const [selectedPet, setSelectedPet] = useState<string>("none");
  const [selectedPractitioner, setSelectedPractitioner] =
    useState<string>("any");
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [urgency, setUrgency] = useState<string>("medium");
  const [subject, setSubject] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [preferredTime, setPreferredTime] = useState<string>("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVideoDialog, setShowVideoDialog] = useState(false);

  // Fetch user's pets
  const { data: pets, isLoading: isLoadingPets } = useQuery({
    queryKey: ["/api/pets/client"],
    queryFn: async () => {
      const response = await fetch("/api/pets/client", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch pets");
      return response.json();
    },
    enabled: !!user && user.role === "CLIENT",
  });

  // Fetch available practitioners
  const { data: practitioners, isLoading: isLoadingPractitioners } = useQuery({
    queryKey: ["/api/practitioners/client"],
    queryFn: async () => {
      const response = await fetch("/api/practitioners/client", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch practitioners");
      return response.json();
    },
    enabled: !!user && user.role === "CLIENT",
  });

  // Clear form errors when fields are corrected
  useEffect(() => {
    if (selectedMethod && formErrors.selectedMethod) {
      setFormErrors((prev) => ({ ...prev, selectedMethod: "" }));
    }
  }, [selectedMethod, formErrors.selectedMethod]);

  useEffect(() => {
    if (subject.trim() && formErrors.subject) {
      setFormErrors((prev) => ({ ...prev, subject: "" }));
    }
  }, [subject, formErrors.subject]);

  useEffect(() => {
    if (message.trim() && formErrors.message) {
      setFormErrors((prev) => ({ ...prev, message: "" }));
    }
  }, [message, formErrors.message]);

  // Form validation function
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!selectedMethod) {
      errors.selectedMethod = "Please select a contact method";
    }

    if (!subject.trim()) {
      errors.subject = "Please provide a subject";
    } else if (subject.trim().length < 5) {
      errors.subject = "Subject must be at least 5 characters";
    }

    if (!message.trim()) {
      errors.message = "Please provide a message";
    } else if (message.trim().length < 10) {
      errors.message = "Message must be at least 10 characters";
    }

    if (selectedMethod === "phone_call" && !phoneNumber.trim()) {
      errors.phoneNumber = "Phone number is required for phone calls";
    }

    if (
      selectedMethod === "video_call" &&
      (!selectedPractitioner || selectedPractitioner === "any")
    ) {
      errors.selectedPractitioner =
        "Please select a specific veterinarian for video calls";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Contact veterinarian mutation
  const contactMutation = useMutation({
    mutationFn: async (contactData: any) => {
      const response = await fetch("/api/contact-veterinarian", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(contactData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || "Failed to send contact request");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setIsSubmitting(false);

      // Show different success messages based on contact method
      let successMessage = "Your message has been sent successfully!";
      if (selectedMethod === "video_call") {
        successMessage =
          "Video consultation request sent! The veterinarian will contact you shortly.";
      } else if (selectedMethod === "phone_call") {
        successMessage =
          "Phone call request sent! You can expect a call back soon.";
      } else if (selectedMethod === "email") {
        successMessage =
          "Email sent successfully! You should receive a reply within 24 hours.";
      }

      toast({
        title: "Contact Request Sent!",
        description: successMessage,
      });

      // Handle video call response
      if (selectedMethod === "video_call" && data.roomId) {
        setShowVideoDialog(true);
      } else {
        // Reset form for other methods
        resetForm();
        // Navigate back to client portal
        setTimeout(() => {
          router.push("/client?tab=messages");
        }, 1500);
      }
    },
    onError: (error: any) => {
      setIsSubmitting(false);
      console.error("Contact error:", error);
      toast({
        title: "Request Failed",
        description:
          error.message || "Failed to send contact request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedPet("none");
    setSelectedPractitioner("any");
    setSelectedMethod("");
    setUrgency("medium");
    setSubject("");
    setMessage("");
    setPhoneNumber("");
    setPreferredTime("");
    setFormErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setFormErrors({});

    // Validate form
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors below and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const contactData = {
        petId:
          selectedPet && selectedPet !== "none" ? parseInt(selectedPet) : null,
        practitionerId:
          selectedPractitioner && selectedPractitioner !== "any"
            ? parseInt(selectedPractitioner)
            : null,
        contactMethod: selectedMethod,
        urgency,
        subject: subject.trim(),
        message: message.trim(),
        phoneNumber:
          selectedMethod === "phone_call" ? phoneNumber.trim() : null,
        preferredTime: preferredTime || null,
      };

      console.log("Submitting contact data:", contactData);

      await contactMutation.mutateAsync(contactData);
    } catch (error: any) {
      console.error("Contact request error:", error);
      setIsSubmitting(false);
    }
  };

  const handleVideoCall = () => {
    if (contactMutation.data?.roomId) {
      router.push(`/client/video-call/${contactMutation.data.roomId}`);
    }
  };

  if (!user || user.role !== "CLIENT") {
    return (
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Access denied. Client login required.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-5xl">
      <ClientHeader
        title="Contact Veterinarian"
        subtitle="Get in touch with your veterinary team"
        showBackButton={true}
        backHref="/client"
        backLabel="Back to Portal"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Select Pet (Optional) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PawPrint className="h-5 w-5" />
                  Related Pet (Optional)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingPets ? (
                  <Skeleton className="h-12 w-full" />
                ) : (
                  <div className="space-y-2">
                    <Select value={selectedPet} onValueChange={setSelectedPet}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="General Question (No specific pet)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          General Question (No specific pet)
                        </SelectItem>
                        {pets?.map((pet: any) => (
                          <SelectItem key={pet.id} value={pet.id.toString()}>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{pet.name}</span>
                              <Badge variant="outline">{pet.species}</Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {pets && pets.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No pets found.{" "}
                        <Link
                          href="/client/pets/register"
                          className="text-primary underline"
                        >
                          Register a pet first
                        </Link>
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Select Practitioner (Optional) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5" />
                  Preferred Veterinarian (Optional)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingPractitioners ? (
                  <Skeleton className="h-12 w-full" />
                ) : (
                  <div className="space-y-2">
                    <Select
                      value={selectedPractitioner}
                      onValueChange={setSelectedPractitioner}
                    >
                      <SelectTrigger
                        className={cn(
                          "w-full",
                          formErrors.selectedPractitioner &&
                            "border-red-500 focus:border-red-500"
                        )}
                      >
                        <SelectValue placeholder="Any available veterinarian" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">
                          Any Available Veterinarian
                        </SelectItem>
                        {practitioners?.map((practitioner: any) => (
                          <SelectItem
                            key={practitioner.id}
                            value={practitioner.id.toString()}
                          >
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {practitioner.name
                                    ?.substring(0, 2)
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              Dr. {practitioner.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formErrors.selectedPractitioner && (
                      <p className="text-sm text-red-500">
                        {formErrors.selectedPractitioner}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contact Method */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Method *</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3">
                  {contactMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <div
                        key={method.id}
                        className={cn(
                          "p-4 border rounded-lg cursor-pointer transition-all",
                          selectedMethod === method.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50",
                          !method.available && "opacity-50 cursor-not-allowed",
                          formErrors.selectedMethod && "border-red-200"
                        )}
                        onClick={() =>
                          method.available && setSelectedMethod(method.id)
                        }
                      >
                        <div className="flex items-start gap-3">
                          <Icon className="h-5 w-5 mt-0.5 text-primary" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">{method.name}</h4>
                              {!method.available && (
                                <Badge variant="secondary">Coming Soon</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {method.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {formErrors.selectedMethod && (
                  <p className="text-sm text-red-500">
                    {formErrors.selectedMethod}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Urgency Level */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Urgency Level
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={urgency} onValueChange={setUrgency}>
                  <div className="space-y-3">
                    {urgencyLevels.map((level) => (
                      <div
                        key={level.id}
                        className="flex items-center space-x-2"
                      >
                        <RadioGroupItem value={level.id} id={level.id} />
                        <Label
                          htmlFor={level.id}
                          className="flex-1 cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium">{level.name}</span>
                              <p className="text-xs text-muted-foreground">
                                {level.description}
                              </p>
                            </div>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Phone Number (if phone call selected) */}
            {selectedMethod === "phone_call" && (
              <Card>
                <CardHeader>
                  <CardTitle>Phone Number *</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Your Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="(555) 123-4567"
                      className={cn(
                        formErrors.phoneNumber &&
                          "border-red-500 focus:border-red-500"
                      )}
                    />
                    {formErrors.phoneNumber && (
                      <p className="text-sm text-red-500">
                        {formErrors.phoneNumber}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="preferredTime">
                      Preferred Call Time (Optional)
                    </Label>
                    <Input
                      id="preferredTime"
                      value={preferredTime}
                      onChange={(e) => setPreferredTime(e.target.value)}
                      placeholder="e.g., Morning, 2-4 PM, After 6 PM"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Message Details */}
            <Card>
              <CardHeader>
                <CardTitle>Message Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief subject line for your message"
                    className={cn(
                      formErrors.subject &&
                        "border-red-500 focus:border-red-500"
                    )}
                  />
                  {formErrors.subject && (
                    <p className="text-sm text-red-500">{formErrors.subject}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your question, concern, or request in detail..."
                    rows={3}
                    className={cn(
                      formErrors.message &&
                        "border-red-500 focus:border-red-500"
                    )}
                  />
                  {formErrors.message && (
                    <p className="text-sm text-red-500">{formErrors.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Provide as much detail as possible to help the veterinarian
                    understand your concern.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting || contactMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={
              isSubmitting ||
              contactMutation.isPending ||
              !selectedMethod ||
              !subject.trim() ||
              !message.trim()
            }
            className="flex-1"
          >
            {isSubmitting || contactMutation.isPending ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send{" "}
                {selectedMethod === "video_call"
                  ? "Video Call Request"
                  : selectedMethod === "phone_call"
                  ? "Call Request"
                  : selectedMethod === "email"
                  ? "Email"
                  : "Message"}
              </>
            )}
          </Button>
        </div>

        {/* Contact Summary */}
        {selectedMethod && subject && message && (
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-base">Contact Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Method:</span>
                  <span className="font-medium">
                    {contactMethods.find((m) => m.id === selectedMethod)?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Urgency:</span>
                  <span className="font-medium">
                    {urgencyLevels.find((u) => u.id === urgency)?.name}
                  </span>
                </div>
                {selectedPet && selectedPet !== "none" && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pet:</span>
                    <span className="font-medium">
                      {
                        pets?.find(
                          (pet: any) => pet.id.toString() === selectedPet
                        )?.name
                      }
                    </span>
                  </div>
                )}
                {selectedPractitioner && selectedPractitioner !== "any" && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Veterinarian:</span>
                    <span className="font-medium">
                      Dr.{" "}
                      {
                        practitioners?.find(
                          (p: any) => p.id.toString() === selectedPractitioner
                        )?.name
                      }
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subject:</span>
                  <span className="font-medium">{subject}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </form>

      {/* Video Call Dialog */}
      <Dialog open={showVideoDialog} onOpenChange={setShowVideoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Video Consultation Ready
            </DialogTitle>
            <DialogDescription>
              Your video consultation request has been sent successfully. The
              veterinarian will be available shortly.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <h4 className="font-medium text-green-900">Room Created</h4>
                <p className="text-sm text-green-700">
                  You can join the video call when ready.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowVideoDialog(false);
                resetForm();
                router.push("/client?tab=appointments");
              }}
            >
              I'll Wait for Contact
            </Button>
            <Button onClick={handleVideoCall}>
              <Video className="h-4 w-4 mr-2" />
              Join Video Call
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
