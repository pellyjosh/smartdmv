'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { usePracticeId } from "@/hooks/use-practice-id";
import type { BoardingStay, Kennel } from "@/db/schemas/boardingSchema";
import Link from "next/link";

export default function BoardingReservationPage() {
  const router = useRouter();
  const practiceId = usePracticeId();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    petId: "",
    kennelId: "",
    checkInDate: undefined as Date | undefined,
    plannedCheckOutDate: undefined as Date | undefined,
    specialInstructions: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    dailyRate: ""
  });

  // Mock data for pets and kennels
  const mockPets = [
    { id: "pet-1", name: "Buddy", ownerName: "John Doe", species: "Dog", breed: "Golden Retriever" },
    { id: "pet-2", name: "Max", ownerName: "Sarah Smith", species: "Dog", breed: "German Shepherd" },
    { id: "pet-3", name: "Charlie", ownerName: "Emily Johnson", species: "Dog", breed: "Labrador" },
    { id: "pet-4", name: "Luna", ownerName: "Mark Wilson", species: "Cat", breed: "Persian" },
    { id: "pet-5", name: "Bella", ownerName: "Lisa Brown", species: "Dog", breed: "Poodle" }
  ];

  const mockKennels: Kennel[] = [
    {
      id: "1",
      name: "Kennel A1",
      practiceId: practiceId || "practice-1",
      type: "standard",
      size: "medium",
      location: "Main Building - Room 1",
      description: "Standard kennel with outdoor access",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: "2",
      name: "Kennel B2",
      practiceId: practiceId || "practice-1",
      type: "deluxe",
      size: "large",
      location: "Main Building - Room 1", 
      description: "Deluxe kennel with window and extra space",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: "3",
      name: "Kennel C3",
      practiceId: practiceId || "practice-1",
      type: "premium",
      size: "large",
      location: "Main Building - Room 2",
      description: "Premium kennel with webcam and play area",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Here you would normally submit to your API
      console.log("Submitting boarding reservation:", formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Redirect back to boarding page
      router.push("/admin/boarding");
    } catch (error) {
      console.error("Error creating boarding reservation:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFormData = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/boarding">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Boarding
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Boarding Reservation</h1>
          <p className="text-muted-foreground">Create a new boarding reservation for a pet</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Reservation Details</CardTitle>
          <CardDescription>Fill in the details for the boarding reservation</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Pet Selection */}
            <div className="space-y-2">
              <Label htmlFor="petId">Pet</Label>
              <Select value={formData.petId} onValueChange={(value) => updateFormData("petId", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a pet" />
                </SelectTrigger>
                <SelectContent>
                  {mockPets.map((pet) => (
                    <SelectItem key={pet.id} value={pet.id}>
                      {pet.name} - {pet.ownerName} ({pet.species} - {pet.breed})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Kennel Selection */}
            <div className="space-y-2">
              <Label htmlFor="kennelId">Kennel</Label>
              <Select value={formData.kennelId} onValueChange={(value) => updateFormData("kennelId", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a kennel" />
                </SelectTrigger>
                <SelectContent>
                  {mockKennels.map((kennel) => (
                    <SelectItem key={kennel.id} value={kennel.id}>
                      {kennel.name} - {kennel.type} ({kennel.size}) - {kennel.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Check-in Date */}
            <div className="space-y-2">
              <Label>Check-in Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.checkInDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.checkInDate ? format(formData.checkInDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.checkInDate}
                    onSelect={(date) => updateFormData("checkInDate", date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Planned Check-out Date */}
            <div className="space-y-2">
              <Label>Planned Check-out Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.plannedCheckOutDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.plannedCheckOutDate ? format(formData.plannedCheckOutDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.plannedCheckOutDate}
                    onSelect={(date) => updateFormData("plannedCheckOutDate", date)}
                    initialFocus
                    disabled={(date) => formData.checkInDate ? date < formData.checkInDate : false}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Daily Rate */}
            <div className="space-y-2">
              <Label htmlFor="dailyRate">Daily Rate ($)</Label>
              <Input
                id="dailyRate"
                type="number"
                step="0.01"
                min="0"
                placeholder="45.00"
                value={formData.dailyRate}
                onChange={(e) => updateFormData("dailyRate", e.target.value)}
              />
            </div>

            {/* Emergency Contact */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
                <Input
                  id="emergencyContactName"
                  placeholder="Contact name"
                  value={formData.emergencyContactName}
                  onChange={(e) => updateFormData("emergencyContactName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContactPhone">Emergency Contact Phone</Label>
                <Input
                  id="emergencyContactPhone"
                  placeholder="Phone number"
                  value={formData.emergencyContactPhone}
                  onChange={(e) => updateFormData("emergencyContactPhone", e.target.value)}
                />
              </div>
            </div>

            {/* Special Instructions */}
            <div className="space-y-2">
              <Label htmlFor="specialInstructions">Special Instructions</Label>
              <Textarea
                id="specialInstructions"
                placeholder="Any special care instructions, dietary requirements, medications, etc."
                rows={4}
                value={formData.specialInstructions}
                onChange={(e) => updateFormData("specialInstructions", e.target.value)}
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-4">
              <Link href="/admin/boarding">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Reservation"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
