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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Clock,
  PawPrint,
  Stethoscope,
  Video,
  Siren,
  Clipboard,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ClientHeader } from "@/components/client/ClientHeader";

const appointmentTypes = [
  {
    id: "checkup",
    name: "General Checkup",
    description: "Regular health examination and wellness check",
    duration: 30,
    icon: Stethoscope,
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    id: "vaccination",
    name: "Vaccination",
    description: "Immunization and vaccine administration",
    duration: 20,
    icon: Clipboard,
    color: "bg-green-50 text-green-700 border-green-200",
  },
  {
    id: "emergency",
    name: "Emergency Visit",
    description: "Urgent medical attention required",
    duration: 45,
    icon: Siren,
    color: "bg-red-50 text-red-700 border-red-200",
  },
  {
    id: "surgery",
    name: "Surgery Consultation",
    description: "Pre-operative consultation and planning",
    duration: 60,
    icon: Stethoscope,
    color: "bg-purple-50 text-purple-700 border-purple-200",
  },
  {
    id: "virtual",
    name: "Virtual Consultation",
    description: "Remote consultation via video call",
    duration: 25,
    icon: Video,
    color: "bg-orange-50 text-orange-700 border-orange-200",
  },
];

const timeSlots = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
];

export default function BookAppointmentPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const [selectedPet, setSelectedPet] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [appointmentTitle, setAppointmentTitle] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [preferredPractitioner, setPreferredPractitioner] =
    useState<string>("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Auto-generate appointment title when pet and type are selected
  useEffect(() => {
    if (selectedPet && selectedType) {
      const pet = pets?.find((p: any) => p.id === selectedPet);
      const appointmentType = appointmentTypes.find(
        (t) => t.id === selectedType
      );
      if (pet && appointmentType) {
        setAppointmentTitle(`${appointmentType.name} - ${pet.name}`);
      }
    }
  }, [selectedPet, selectedType, pets]);

  // Clear form errors when fields are corrected
  useEffect(() => {
    if (selectedPet && formErrors.selectedPet) {
      setFormErrors((prev) => ({ ...prev, selectedPet: "" }));
    }
  }, [selectedPet, formErrors.selectedPet]);

  useEffect(() => {
    if (selectedType && formErrors.selectedType) {
      setFormErrors((prev) => ({ ...prev, selectedType: "" }));
    }
  }, [selectedType, formErrors.selectedType]);

  useEffect(() => {
    if (selectedDate && formErrors.selectedDate) {
      setFormErrors((prev) => ({ ...prev, selectedDate: "" }));
    }
  }, [selectedDate, formErrors.selectedDate]);

  useEffect(() => {
    if (selectedTime && formErrors.selectedTime) {
      setFormErrors((prev) => ({ ...prev, selectedTime: "" }));
    }
  }, [selectedTime, formErrors.selectedTime]);

  useEffect(() => {
    if (appointmentTitle.trim() && formErrors.appointmentTitle) {
      setFormErrors((prev) => ({ ...prev, appointmentTitle: "" }));
    }
  }, [appointmentTitle, formErrors.appointmentTitle]);

  // Form validation function
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!selectedPet) {
      errors.selectedPet = "Please select a pet for the appointment";
    }

    if (!selectedType) {
      errors.selectedType = "Please select an appointment type";
    }

    if (!selectedDate) {
      errors.selectedDate = "Please select an appointment date";
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDateOnly = new Date(selectedDate);
      selectedDateOnly.setHours(0, 0, 0, 0);

      if (selectedDateOnly < today) {
        errors.selectedDate = "Please select a future date";
      }
    }

    if (!selectedTime) {
      errors.selectedTime = "Please select an appointment time";
    }

    if (!appointmentTitle.trim()) {
      errors.appointmentTitle = "Please provide an appointment title";
    } else if (appointmentTitle.trim().length < 3) {
      errors.appointmentTitle =
        "Appointment title must be at least 3 characters";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Book appointment mutation
  const bookAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: any) => {
      const response = await fetch("/api/appointments/client", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(appointmentData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || "Failed to book appointment");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setIsSubmitting(false);
      toast({
        title: "Appointment Booked Successfully!",
        description:
          "Your appointment request has been submitted. We'll contact you soon to confirm.",
      });

      // Reset form
      setSelectedPet("");
      setSelectedType("");
      setSelectedDate(undefined);
      setSelectedTime("");
      setAppointmentTitle("");
      setNotes("");
      setPreferredPractitioner("");
      setFormErrors({});

      // Navigate back to client portal
      setTimeout(() => {
        router.push("/client?tab=appointments");
      }, 1500);
    },
    onError: (error: any) => {
      setIsSubmitting(false);
      console.error("Booking error:", error);
      toast({
        title: "Booking Failed",
        description:
          error.message || "Failed to book appointment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Always validate form and show errors
    const isValid = validateForm();

    if (!isValid) {
      toast({
        title: "Please Complete All Required Fields",
        description: "Check the highlighted fields below and try again.",
        variant: "destructive",
      });
      return;
    }

    // Only proceed if not already submitting
    if (isSubmitting || bookAppointmentMutation.isPending) {
      return;
    }

    setIsSubmitting(true);

    try {
      const appointmentType = appointmentTypes.find(
        (t) => t.id === selectedType
      );
      const [hours, minutes] = selectedTime.split(":").map(Number);
      const appointmentDateTime = new Date(selectedDate!);
      appointmentDateTime.setHours(hours, minutes, 0, 0);

      // Ensure we have all required data
      const appointmentData = {
        title: appointmentTitle.trim(),
        description: notes.trim(),
        type: selectedType,
        date: appointmentDateTime.toISOString(),
        durationMinutes: appointmentType?.duration.toString() || "30",
        petId: selectedPet,
        practitionerId: preferredPractitioner || null,
        status: "pending",
      };

      console.log("Submitting appointment data:", appointmentData);

      await bookAppointmentMutation.mutateAsync(appointmentData);
    } catch (error: any) {
      console.error("Appointment booking error:", error);
      setIsSubmitting(false);
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
        title="Book Appointment"
        subtitle="Schedule a new appointment for your pet"
        showBackButton={true}
        backHref="/client"
        backLabel="Back to Portal"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Select Pet */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PawPrint className="h-5 w-5" />
                  Select Pet *
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingPets ? (
                  <Skeleton className="h-12 w-full" />
                ) : (
                  <div className="space-y-2">
                    <Select value={selectedPet} onValueChange={setSelectedPet}>
                      <SelectTrigger
                        className={cn(
                          "w-full",
                          formErrors.selectedPet &&
                            "border-red-500 focus:border-red-500"
                        )}
                      >
                        <SelectValue placeholder="Choose your pet" />
                      </SelectTrigger>
                      <SelectContent>
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
                    {formErrors.selectedPet && (
                      <p className="text-sm text-red-500">
                        {formErrors.selectedPet}
                      </p>
                    )}
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

            {/* Appointment Type */}
            <Card>
              <CardHeader>
                <CardTitle>Appointment Type *</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3">
                  {appointmentTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <div
                        key={type.id}
                        className={cn(
                          "p-4 border rounded-lg cursor-pointer transition-all",
                          selectedType === type.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50",
                          formErrors.selectedType && "border-red-200"
                        )}
                        onClick={() => setSelectedType(type.id)}
                      >
                        <div className="flex items-start gap-3">
                          <Icon className="h-5 w-5 mt-0.5 text-primary" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">{type.name}</h4>
                              <Badge variant="outline" className={type.color}>
                                {type.duration} min
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {type.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {formErrors.selectedType && (
                  <p className="text-sm text-red-500">
                    {formErrors.selectedType}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Date Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Select Date *
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div
                  className={cn(
                    "rounded-md border p-3",
                    formErrors.selectedDate && "border-red-200 bg-red-50/50"
                  )}
                >
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) =>
                      date < new Date() || date.getDay() === 0
                    } // Disable past dates and Sundays
                    className="rounded-md border-0 w-full"
                    classNames={{
                      months: "flex w-full",
                      month: "w-full",
                      table: "w-full",
                      head_row: "flex w-full",
                      head_cell:
                        "flex-1 text-center text-muted-foreground font-normal text-sm",
                      row: "flex w-full mt-1",
                      cell: "flex-1 text-center p-0",
                      day: "h-9 w-full text-sm hover:bg-accent hover:text-accent-foreground",
                      day_selected:
                        "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                      day_today: "bg-accent text-accent-foreground",
                      day_outside: "text-muted-foreground opacity-50",
                      day_disabled: "text-muted-foreground opacity-50",
                    }}
                  />
                </div>
                {formErrors.selectedDate && (
                  <p className="text-sm text-red-500">
                    {formErrors.selectedDate}
                  </p>
                )}
                {selectedDate && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {format(selectedDate, "EEEE, MMMM d, yyyy")}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Time Selection */}
            {selectedDate && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Select Time *
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {timeSlots.map((time) => (
                      <Button
                        key={time}
                        type="button"
                        variant={selectedTime === time ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedTime(time)}
                        className={cn(
                          "justify-center",
                          formErrors.selectedTime &&
                            selectedTime !== time &&
                            "border-red-200"
                        )}
                      >
                        {time}
                      </Button>
                    ))}
                  </div>
                  {formErrors.selectedTime && (
                    <p className="text-sm text-red-500">
                      {formErrors.selectedTime}
                    </p>
                  )}
                  {selectedTime && (
                    <p className="text-sm text-muted-foreground">
                      Selected time: {selectedTime}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Additional Details */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Appointment Title *</Label>
              <Input
                id="title"
                value={appointmentTitle}
                onChange={(e) => setAppointmentTitle(e.target.value)}
                placeholder="Brief description of the appointment"
                className={cn(
                  formErrors.appointmentTitle &&
                    "border-red-500 focus:border-red-500"
                )}
              />
              {formErrors.appointmentTitle && (
                <p className="text-sm text-red-500">
                  {formErrors.appointmentTitle}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="practitioner">
                Preferred Practitioner (Optional)
              </Label>
              {isLoadingPractitioners ? (
                <Skeleton className="h-12 w-full" />
              ) : (
                <Select
                  value={preferredPractitioner}
                  onValueChange={setPreferredPractitioner}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any available practitioner" />
                  </SelectTrigger>
                  <SelectContent>
                    {practitioners?.map((practitioner: any) => (
                      <SelectItem
                        key={practitioner.id}
                        value={practitioner.id.toString()}
                      >
                        Dr. {practitioner.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes & Concerns (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe any specific concerns, symptoms, or questions..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Provide any additional information that might help the
                veterinarian prepare for your visit.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting || bookAppointmentMutation.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" className="flex-1">
            {isSubmitting || bookAppointmentMutation.isPending ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Booking...
              </>
            ) : (
              "Book Appointment"
            )}
          </Button>
        </div>

        {/* Form Summary */}
        {selectedPet && selectedType && selectedDate && selectedTime && (
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-base">Appointment Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 text-sm">
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
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium">
                    {appointmentTypes.find((t) => t.id === selectedType)?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-medium">
                    {format(selectedDate, "EEEE, MMMM d, yyyy")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time:</span>
                  <span className="font-medium">{selectedTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-medium">
                    {
                      appointmentTypes.find((t) => t.id === selectedType)
                        ?.duration
                    }{" "}
                    minutes
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  );
}
