'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { ClientHeader } from "@/components/client/ClientHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { 
  CalendarIcon,
  PawPrint,
  Upload,
  Loader2,
  Check,
  AlertCircle,
  Camera
} from "lucide-react";

const speciesOptions = [
  { value: "dog", label: "Dog" },
  { value: "cat", label: "Cat" },
  { value: "bird", label: "Bird" },
  { value: "rabbit", label: "Rabbit" },
  { value: "hamster", label: "Hamster" },
  { value: "guinea-pig", label: "Guinea Pig" },
  { value: "reptile", label: "Reptile" },
  { value: "fish", label: "Fish" },
  { value: "other", label: "Other" }
];

const sexOptions = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "male-neutered", label: "Male (Neutered)" },
  { value: "female-spayed", label: "Female (Spayed)" }
];

export default function RegisterPetPage() {
  const router = useRouter();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: "",
    species: "",
    breed: "",
    dateOfBirth: undefined as Date | undefined,
    sex: "",
    weight: "",
    color: "",
    microchipId: "",
    allergies: "",
    medications: "",
    specialNotes: "",
    emergencyContact: "",
    emergencyPhone: "",
    previousVet: "",
    previousVetPhone: "",
    insuranceProvider: "",
    insurancePolicyNumber: "",
    photoUrl: ""
  });

  const [photo, setPhoto] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Pet registration mutation
  const registerPetMutation = useMutation({
    mutationFn: async (petData: typeof formData) => {
      const response = await fetch('/api/pets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(petData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to register pet');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success!",
        description: `${formData.name} has been registered successfully.`,
      });
      router.push('/client?tab=pets');
    },
    onError: (error: Error) => {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Photo upload function
  const handlePhotoUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'pet-photo');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload photo');
      }

      const result = await response.json();
      setFormData(prev => ({ ...prev, photoUrl: result.url }));
      toast({
        title: "Photo Uploaded",
        description: "Pet photo has been uploaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name || !formData.species) {
      toast({
        title: "Validation Error",
        description: "Please fill in at least the pet name and species.",
        variant: "destructive",
      });
      return;
    }

    registerPetMutation.mutate(formData);
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <ClientHeader 
        title="Register New Pet"
        subtitle="Add your pet to SmartDVM for comprehensive veterinary care"
        showBackButton={true}
        backHref="/client?tab=pets"
        backLabel="Back to My Pets"
      />

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PawPrint className="h-5 w-5 text-primary" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Pet Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateFormData('name', e.target.value)}
                  placeholder="Enter your pet's name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="species">Species *</Label>
                <Select value={formData.species} onValueChange={(value) => updateFormData('species', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select species" />
                  </SelectTrigger>
                  <SelectContent>
                    {speciesOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="breed">Breed</Label>
                <Input
                  id="breed"
                  value={formData.breed}
                  onChange={(e) => updateFormData('breed', e.target.value)}
                  placeholder="Enter breed (optional)"
                />
              </div>

              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.dateOfBirth && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.dateOfBirth ? format(formData.dateOfBirth, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.dateOfBirth}
                      onSelect={(date) => updateFormData('dateOfBirth', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sex">Sex</Label>
                <Select value={formData.sex} onValueChange={(value) => updateFormData('sex', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sex" />
                  </SelectTrigger>
                  <SelectContent>
                    {sexOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight">Weight</Label>
                <Input
                  id="weight"
                  value={formData.weight}
                  onChange={(e) => updateFormData('weight', e.target.value)}
                  placeholder="e.g., 25 lbs, 5.5 kg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Color/Markings</Label>
                <Input
                  id="color"
                  value={formData.color}
                  onChange={(e) => updateFormData('color', e.target.value)}
                  placeholder="Describe your pet's color/markings"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="microchip">Microchip ID</Label>
                <Input
                  id="microchip"
                  value={formData.microchipId}
                  onChange={(e) => updateFormData('microchipId', e.target.value)}
                  placeholder="Enter microchip number if available"
                />
              </div>
            </div>

            {/* Photo Upload */}
            <div className="space-y-2">
              <Label>Pet Photo</Label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setPhoto(file);
                        handlePhotoUpload(file);
                      }
                    }}
                    disabled={isUploading}
                  />
                </div>
                {isUploading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </div>
                )}
                {formData.photoUrl && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <Check className="h-4 w-4" />
                    Uploaded
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Upload a photo of your pet to help with identification.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Medical Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Medical Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="allergies">Known Allergies</Label>
              <Textarea
                id="allergies"
                value={formData.allergies}
                onChange={(e) => updateFormData('allergies', e.target.value)}
                placeholder="List any known allergies (food, medications, environmental)"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="medications">Current Medications</Label>
              <Textarea
                id="medications"
                value={formData.medications}
                onChange={(e) => updateFormData('medications', e.target.value)}
                placeholder="List any current medications and dosages"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialNotes">Special Notes</Label>
              <Textarea
                id="specialNotes"
                value={formData.specialNotes}
                onChange={(e) => updateFormData('specialNotes', e.target.value)}
                placeholder="Any special behavioral notes, medical conditions, or important information"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact & Previous Vet */}
        <Card>
          <CardHeader>
            <CardTitle>Emergency Contact & Previous Veterinarian</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="emergencyContact">Emergency Contact Name</Label>
                <Input
                  id="emergencyContact"
                  value={formData.emergencyContact}
                  onChange={(e) => updateFormData('emergencyContact', e.target.value)}
                  placeholder="Name of emergency contact"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyPhone">Emergency Contact Phone</Label>
                <Input
                  id="emergencyPhone"
                  value={formData.emergencyPhone}
                  onChange={(e) => updateFormData('emergencyPhone', e.target.value)}
                  placeholder="Emergency contact phone number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="previousVet">Previous Veterinarian</Label>
                <Input
                  id="previousVet"
                  value={formData.previousVet}
                  onChange={(e) => updateFormData('previousVet', e.target.value)}
                  placeholder="Previous vet clinic name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="previousVetPhone">Previous Vet Phone</Label>
                <Input
                  id="previousVetPhone"
                  value={formData.previousVetPhone}
                  onChange={(e) => updateFormData('previousVetPhone', e.target.value)}
                  placeholder="Previous vet phone number"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Insurance Information */}
        <Card>
          <CardHeader>
            <CardTitle>Pet Insurance (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="insuranceProvider">Insurance Provider</Label>
                <Input
                  id="insuranceProvider"
                  value={formData.insuranceProvider}
                  onChange={(e) => updateFormData('insuranceProvider', e.target.value)}
                  placeholder="e.g., Healthy Paws, Petplan, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="insurancePolicyNumber">Policy Number</Label>
                <Input
                  id="insurancePolicyNumber"
                  value={formData.insurancePolicyNumber}
                  onChange={(e) => updateFormData('insurancePolicyNumber', e.target.value)}
                  placeholder="Insurance policy number"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-end">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.push('/client?tab=pets')}
            className="sm:w-auto"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={registerPetMutation.isPending || isUploading}
            className="sm:w-auto"
          >
            {registerPetMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Registering...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Register Pet
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
