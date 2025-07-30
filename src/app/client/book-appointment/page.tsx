'use client';

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ArrowLeft, Calendar as CalendarIcon, Clock, PawPrint, Stethoscope, Video, Siren, Clipboard, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ClientHeader } from "@/components/client/ClientHeader";

const appointmentTypes = [
  {
    id: 'checkup',
    name: 'General Checkup',
    description: 'Regular health examination and wellness check',
    duration: 30,
    icon: Stethoscope,
    color: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  {
    id: 'vaccination',
    name: 'Vaccination',
    description: 'Immunization and vaccine administration',
    duration: 20,
    icon: Clipboard,
    color: 'bg-green-50 text-green-700 border-green-200'
  },
  {
    id: 'emergency',
    name: 'Emergency Visit',
    description: 'Urgent medical attention required',
    duration: 45,
    icon: Siren,
    color: 'bg-red-50 text-red-700 border-red-200'
  },
  {
    id: 'surgery',
    name: 'Surgery Consultation',
    description: 'Pre-operative consultation and planning',
    duration: 60,
    icon: Stethoscope,
    color: 'bg-purple-50 text-purple-700 border-purple-200'
  },
  {
    id: 'virtual',
    name: 'Virtual Consultation',
    description: 'Remote consultation via video call',
    duration: 25,
    icon: Video,
    color: 'bg-orange-50 text-orange-700 border-orange-200'
  }
];

const timeSlots = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30'
];

export default function BookAppointmentPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  
  const [selectedPet, setSelectedPet] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [appointmentTitle, setAppointmentTitle] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [preferredPractitioner, setPreferredPractitioner] = useState<string>('');

  // Fetch user's pets
  const { data: pets, isLoading: isLoadingPets } = useQuery({
    queryKey: ['/api/pets/client'],
    queryFn: async () => {
      const response = await fetch('/api/pets/client', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch pets');
      return response.json();
    },
    enabled: !!user && user.role === 'CLIENT'
  });

  // Fetch available practitioners
  const { data: practitioners, isLoading: isLoadingPractitioners } = useQuery({
    queryKey: ['/api/practitioners/client'],
    queryFn: async () => {
      const response = await fetch('/api/practitioners/client', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch practitioners');
      return response.json();
    },
    enabled: !!user && user.role === 'CLIENT'
  });

  // Auto-generate appointment title when pet and type are selected
  useEffect(() => {
    if (selectedPet && selectedType) {
      const pet = pets?.find((p: any) => p.id === selectedPet);
      const appointmentType = appointmentTypes.find(t => t.id === selectedType);
      if (pet && appointmentType) {
        setAppointmentTitle(`${appointmentType.name} - ${pet.name}`);
      }
    }
  }, [selectedPet, selectedType, pets]);

  // Book appointment mutation
  const bookAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: any) => {
      const response = await fetch('/api/appointments/client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(appointmentData)
      });
      if (!response.ok) throw new Error('Failed to book appointment');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Appointment Booked!',
        description: 'Your appointment request has been submitted. We\'ll contact you soon to confirm.',
      });
      router.push('/client?tab=appointments');
    },
    onError: (error: any) => {
      toast({
        title: 'Booking Failed',
        description: error.message || 'Failed to book appointment. Please try again.',
        variant: 'destructive'
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPet || !selectedType || !selectedDate || !selectedTime) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        variant: 'destructive'
      });
      return;
    }

    const appointmentType = appointmentTypes.find(t => t.id === selectedType);
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const appointmentDateTime = new Date(selectedDate);
    appointmentDateTime.setHours(hours, minutes, 0, 0);

    bookAppointmentMutation.mutate({
      title: appointmentTitle,
      description: notes,
      type: selectedType,
      date: appointmentDateTime.toISOString(),
      durationMinutes: appointmentType?.duration.toString() || '30',
      petId: selectedPet,
      practitionerId: preferredPractitioner || null,
      status: 'pending'
    });
  };

  if (!user || user.role !== 'CLIENT') {
    return (
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Access denied. Client login required.</p>
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
                  Select Pet
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingPets ? (
                  <Skeleton className="h-12 w-full" />
                ) : (
                  <Select value={selectedPet} onValueChange={setSelectedPet}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose your pet" />
                    </SelectTrigger>
                    <SelectContent>
                      {pets?.map((pet: any) => (
                        <SelectItem key={pet.id} value={pet.id}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{pet.name}</span>
                            <Badge variant="outline">{pet.species}</Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>

            {/* Appointment Type */}
            <Card>
              <CardHeader>
                <CardTitle>Appointment Type</CardTitle>
              </CardHeader>
              <CardContent>
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
                            : "border-border hover:border-primary/50"
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
                  Select Date
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date() || date.getDay() === 0} // Disable past dates and Sundays
                  className="rounded-md border-0 w-full"
                  classNames={{
                    months: "flex w-full",
                    month: "w-full",
                    table: "w-full",
                    head_row: "flex w-full",
                    head_cell: "flex-1 text-center text-muted-foreground font-normal text-sm",
                    row: "flex w-full mt-1",
                    cell: "flex-1 text-center p-0",
                    day: "h-9 w-full text-sm hover:bg-accent hover:text-accent-foreground",
                    day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                    day_today: "bg-accent text-accent-foreground",
                    day_outside: "text-muted-foreground opacity-50",
                    day_disabled: "text-muted-foreground opacity-50",
                  }}
                />
              </CardContent>
            </Card>

            {/* Time Selection */}
            {selectedDate && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Select Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2">
                    {timeSlots.map((time) => (
                      <Button
                        key={time}
                        type="button"
                        variant={selectedTime === time ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedTime(time)}
                        className="justify-center"
                      >
                        {time}
                      </Button>
                    ))}
                  </div>
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
            <div>
              <Label htmlFor="title">Appointment Title</Label>
              <Input
                id="title"
                value={appointmentTitle}
                onChange={(e) => setAppointmentTitle(e.target.value)}
                placeholder="Brief description of the appointment"
              />
            </div>

            <div>
              <Label htmlFor="practitioner">Preferred Practitioner (Optional)</Label>
              {isLoadingPractitioners ? (
                <Skeleton className="h-12 w-full" />
              ) : (
                <Select value={preferredPractitioner} onValueChange={setPreferredPractitioner}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any available practitioner" />
                  </SelectTrigger>
                  <SelectContent>
                    {practitioners?.map((practitioner: any) => (
                      <SelectItem key={practitioner.id} value={practitioner.id}>
                        Dr. {practitioner.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <Label htmlFor="notes">Notes & Concerns</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe any specific concerns, symptoms, or questions..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={bookAppointmentMutation.isPending || !selectedPet || !selectedType || !selectedDate || !selectedTime}
            className="flex-1"
          >
            {bookAppointmentMutation.isPending ? (
              <>
                <Skeleton className="h-4 w-4 mr-2" />
                Booking...
              </>
            ) : (
              'Book Appointment'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
