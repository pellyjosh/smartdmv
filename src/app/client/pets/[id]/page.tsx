'use client';

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import { ClientHeader } from "@/components/client/ClientHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar as CalendarIcon,
  Activity,
  FileText,
  Heart,
  Syringe,
  Pill,
  Stethoscope,
  Edit,
  Download,
  Plus,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  PawPrint,
  Scale,
  Ruler,
  AlertCircle,
  CheckCircle,
  Camera
} from "lucide-react";
import { format } from "@/lib/date-utils";
import Link from "next/link";

// Medical record card component
const MedicalRecordCard = ({ record }: { record: any }) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'checkup':
        return <Stethoscope className="h-4 w-4 text-blue-500" />;
      case 'vaccination':
        return <Syringe className="h-4 w-4 text-green-500" />;
      case 'surgery':
        return <Activity className="h-4 w-4 text-red-500" />;
      case 'medication':
        return <Pill className="h-4 w-4 text-purple-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Card className="mb-4 hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            {getTypeIcon(record.type)}
            <CardTitle className="text-base">{record.title}</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {format(new Date(record.date), 'MMM d, YYYY')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-sm">
            <span className="text-muted-foreground">Veterinarian:</span>
            <span className="ml-2 font-medium">{record.veterinarian}</span>
          </div>
          
          {record.diagnosis && (
            <div className="text-sm">
              <span className="text-muted-foreground">Diagnosis:</span>
              <p className="mt-1">{record.diagnosis}</p>
            </div>
          )}
          
          {record.treatment && (
            <div className="text-sm">
              <span className="text-muted-foreground">Treatment:</span>
              <p className="mt-1">{record.treatment}</p>
            </div>
          )}
          
          {record.medications && record.medications.length > 0 && (
            <div className="text-sm">
              <span className="text-muted-foreground">Medications:</span>
              <ul className="mt-1 list-disc list-inside">
                {record.medications.map((med: any, index: number) => (
                  <li key={index}>{med.name} - {med.dosage}</li>
                ))}
              </ul>
            </div>
          )}
          
          {record.notes && (
            <div className="text-sm">
              <span className="text-muted-foreground">Notes:</span>
              <p className="mt-1">{record.notes}</p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download Report
          </Button>
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            View Details
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

// Vaccination record component
const VaccinationCard = ({ vaccination }: { vaccination: any }) => {
  const isUpcoming = new Date(vaccination.dueDate) > new Date();
  const isOverdue = new Date(vaccination.dueDate) < new Date() && !vaccination.completed;
  
  return (
    <Card className={`mb-3 ${isOverdue ? 'border-red-200 bg-red-50' : isUpcoming ? 'border-blue-200 bg-blue-50' : 'border-green-200 bg-green-50'}`}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Syringe className={`h-4 w-4 ${isOverdue ? 'text-red-500' : isUpcoming ? 'text-blue-500' : 'text-green-500'}`} />
              <h4 className="font-medium">{vaccination.name}</h4>
              {vaccination.completed ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : isOverdue ? (
                <AlertCircle className="h-4 w-4 text-red-500" />
              ) : (
                <Clock className="h-4 w-4 text-blue-500" />
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {vaccination.completed ? (
                <span>Completed: {format(new Date(vaccination.completedDate), 'MMM d, YYYY')}</span>
              ) : (
                <span>Due: {format(new Date(vaccination.dueDate), 'MMM d, YYYY')}</span>
              )}
            </div>
            {vaccination.nextDue && (
              <div className="text-sm text-muted-foreground">
                Next due: {format(new Date(vaccination.nextDue), 'MMM d, YYYY')}
              </div>
            )}
          </div>
          <Badge variant={vaccination.completed ? "default" : isOverdue ? "destructive" : "secondary"}>
            {vaccination.completed ? "Completed" : isOverdue ? "Overdue" : "Upcoming"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default function PetDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const { toast } = useToast();
  const petId = params.id as string;
  
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch pet details
  const { 
    data: pet, 
    isLoading: isPetLoading, 
    error: petError 
  } = useQuery({
    queryKey: [`/api/pets/${petId}`, petId],
    queryFn: async () => {
      const res = await fetch(`/api/pets/${petId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch pet details");
      }
      return await res.json();
    },
    enabled: !!petId && user?.role === 'CLIENT',
  });

  // Fetch medical records
  const { 
    data: medicalRecords = [], 
    isLoading: isRecordsLoading 
  } = useQuery({
    queryKey: [`/api/pets/${petId}/medical-records`, petId],
    queryFn: async () => {
      const res = await fetch(`/api/pets/${petId}/medical-records`);
      if (!res.ok) {
        throw new Error("Failed to fetch medical records");
      }
      return await res.json();
    },
    enabled: !!petId && user?.role === 'CLIENT',
  });

  // Fetch vaccinations
  const { 
    data: vaccinations = [], 
    isLoading: isVaccinationsLoading 
  } = useQuery({
    queryKey: [`/api/pets/${petId}/vaccinations`, petId],
    queryFn: async () => {
      const res = await fetch(`/api/pets/${petId}/vaccinations`);
      if (!res.ok) {
        throw new Error("Failed to fetch vaccinations");
      }
      return await res.json();
    },
    enabled: !!petId && user?.role === 'CLIENT',
  });

  if (isPetLoading) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-5xl">
        <ClientHeader 
          title="Pet Details" 
          showBackButton={true}
          backHref="/client?tab=pets"
          backLabel="Back to My Pets"
        />
        <div className="space-y-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (petError || !pet) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-5xl">
        <ClientHeader 
          title="Pet Details" 
          showBackButton={true}
          backHref="/client?tab=pets"
          backLabel="Back to My Pets"
        />
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <h3 className="font-medium text-base mb-2">Pet Not Found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              The pet you're looking for doesn't exist or you don't have access to view it.
            </p>
            <Button asChild>
              <Link href="/client?tab=pets">Back to My Pets</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate age from birth date
  const calculateAge = (birthDate: string) => {
    const birth = new Date(birthDate);
    const today = new Date();
    const ageInMs = today.getTime() - birth.getTime();
    const ageInYears = Math.floor(ageInMs / (1000 * 60 * 60 * 24 * 365.25));
    const ageInMonths = Math.floor((ageInMs % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44));
    
    if (ageInYears > 0) {
      return `${ageInYears} year${ageInYears > 1 ? 's' : ''}`;
    } else {
      return `${ageInMonths} month${ageInMonths > 1 ? 's' : ''}`;
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-5xl">
      <ClientHeader 
        title={`${pet.name}'s Medical Records`}
        subtitle={`${pet.species} • ${pet.breed || 'Mixed breed'}`}
        showBackButton={true}
        backHref="/client?tab=pets"
        backLabel="Back to My Pets"
      />

      {/* Pet Overview Card */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <Avatar className="h-20 w-20 border-2 border-primary/10">
              {pet.photoUrl ? (
                <AvatarImage src={pet.photoUrl} alt={pet.name} />
              ) : (
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                  {pet.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold">{pet.name}</h2>
                  <p className="text-muted-foreground">{pet.species} • {pet.breed || 'Mixed breed'}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Pet Info
                  </Button>
                  <Button variant="outline" size="sm">
                    <Camera className="h-4 w-4 mr-2" />
                    Update Photo
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {pet.dateOfBirth && (
                  <div>
                    <span className="text-muted-foreground block">Age</span>
                    <span className="font-medium">{calculateAge(pet.dateOfBirth)}</span>
                  </div>
                )}
                {pet.sex && (
                  <div>
                    <span className="text-muted-foreground block">Sex</span>
                    <span className="font-medium">{pet.sex}</span>
                  </div>
                )}
                {pet.weight && (
                  <div>
                    <span className="text-muted-foreground block">Weight</span>
                    <span className="font-medium">{pet.weight}</span>
                  </div>
                )}
                {pet.microchipId && (
                  <div>
                    <span className="text-muted-foreground block">Microchip</span>
                    <span className="font-medium">{pet.microchipId}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        {(pet.allergies || pet.medications || pet.specialNotes) && (
          <CardContent className="pt-0">
            <Separator className="mb-4" />
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              {pet.allergies && (
                <div>
                  <span className="text-muted-foreground block mb-1">Allergies</span>
                  <p className="text-red-600 font-medium">{pet.allergies}</p>
                </div>
              )}
              {pet.medications && (
                <div>
                  <span className="text-muted-foreground block mb-1">Current Medications</span>
                  <p>{pet.medications}</p>
                </div>
              )}
              {pet.specialNotes && (
                <div>
                  <span className="text-muted-foreground block mb-1">Special Notes</span>
                  <p>{pet.specialNotes}</p>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Tabs for different sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 mb-6">
          <TabsTrigger value="overview">
            <Activity className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="medical-records">
            <FileText className="h-4 w-4 mr-2" />
            Medical Records
          </TabsTrigger>
          <TabsTrigger value="vaccinations">
            <Syringe className="h-4 w-4 mr-2" />
            Vaccinations
          </TabsTrigger>
          <TabsTrigger value="appointments">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Appointments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Health Status Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500" />
                Health Status Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {pet.vaccinationStatus && (
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Vaccination Status</span>
                      <span className="font-medium">{pet.vaccinationStatus}</span>
                    </div>
                    <Progress 
                      value={pet.vaccinationStatus === "Up to date" ? 100 : pet.vaccinationStatus === "Partial" ? 50 : 0} 
                      className="h-2 mb-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      {pet.vaccinationStatus === "Up to date" ? "All vaccinations current" : 
                       pet.vaccinationStatus === "Partial" ? "Some vaccinations needed" : 
                       "Vaccinations overdue"}
                    </p>
                  </div>
                )}
                
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Overall Health</span>
                    <span className="font-medium">Good</span>
                  </div>
                  <Progress value={85} className="h-2 mb-2" />
                  <p className="text-xs text-muted-foreground">Based on recent checkups</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {isRecordsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : medicalRecords && medicalRecords.length > 0 ? (
                <div className="space-y-3">
                  {medicalRecords.slice(0, 3).map((record: any) => (
                    <div key={record.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="p-2 bg-primary/10 rounded-full">
                        {record.type === 'checkup' && <Stethoscope className="h-4 w-4 text-primary" />}
                        {record.type === 'vaccination' && <Syringe className="h-4 w-4 text-primary" />}
                        {record.type === 'surgery' && <Activity className="h-4 w-4 text-primary" />}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{record.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(record.date), 'MMM d, YYYY')} • Dr. {record.veterinarian}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No recent medical records</p>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <Button variant="outline" className="h-auto p-4 flex flex-col gap-2" asChild>
                  <Link href="/client/book-appointment">
                    <CalendarIcon className="h-5 w-5" />
                    <span>Book Appointment</span>
                  </Link>
                </Button>
                <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
                  <Download className="h-5 w-5" />
                  <span>Download Records</span>
                </Button>
                <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
                  <Mail className="h-5 w-5" />
                  <span>Contact Veterinarian</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="medical-records">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Medical Records</h3>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Request New Record
            </Button>
          </div>
          
          {isRecordsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : medicalRecords && medicalRecords.length > 0 ? (
            medicalRecords.map((record: any) => (
              <MedicalRecordCard key={record.id} record={record} />
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium text-base mb-2">No Medical Records</h3>
                <p className="text-sm text-muted-foreground">
                  Medical records will appear here after veterinary visits.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="vaccinations">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Vaccination History</h3>
            <Button>
              <CalendarIcon className="h-4 w-4 mr-2" />
              Schedule Vaccination
            </Button>
          </div>
          
          {isVaccinationsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : vaccinations && vaccinations.length > 0 ? (
            <div className="space-y-3">
              {vaccinations.map((vaccination: any) => (
                <VaccinationCard key={vaccination.id} vaccination={vaccination} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Syringe className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium text-base mb-2">No Vaccination Records</h3>
                <p className="text-sm text-muted-foreground">
                  Vaccination records will appear here after immunizations.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="appointments">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Appointment History</h3>
            <Button asChild>
              <Link href="/client/book-appointment">
                <Plus className="h-4 w-4 mr-2" />
                Book New Appointment
              </Link>
            </Button>
          </div>
          
          {/* This would be populated with appointment data specific to this pet */}
          <Card>
            <CardContent className="py-8 text-center">
              <CalendarIcon className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium text-base mb-2">No Appointments</h3>
              <p className="text-sm text-muted-foreground mb-4">
                No appointment history found for {pet.name}.
              </p>
              <Button asChild>
                <Link href="/client/book-appointment">
                  <Plus className="h-4 w-4 mr-2" />
                  Book First Appointment
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
