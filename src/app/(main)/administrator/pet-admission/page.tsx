import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, PawPrint, Info, MapPin, User, Video, MessageSquare } from "lucide-react";
import { calculateAge } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Pet, User as SelectUser } from "@shared/schema";
import PetVaccinations from "@/components/administrator/pet/pet-vaccinations";


export default function PetDetailPage() {
  const { id: petId, clientId } = useParams();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Fetch pet data
  const { data: pet, isLoading: isPetLoading, error: petError } = useQuery<Pet>({
    queryKey: [`/api/pets/${petId}`],
    retry: 1
  });
  
  // Get client data
  const { data: client, isLoading: isClientLoading } = useQuery<SelectUser>({
    queryKey: [`/api/users/${clientId}`],
    enabled: !!clientId,
  });
  
  // Get appointment history
  const { data: appointments, isLoading: isAppointmentsLoading } = useQuery<any[]>({
    queryKey: [`/api/appointments/pet/${petId}`],
    enabled: !!petId,
  });

  // Get telemedicine appointments
  const { data: telemedicineAppointments, isLoading: isTelemedicineLoading } = useQuery<any[]>({
    queryKey: [`/api/appointments/pet/${petId}/telemedicine`],
    queryFn: async () => {
      if (!petId) return [];
      
      // Since we don't have a specific API endpoint for telemedicine appointments by pet,
      // we'll filter the appointments on the client side
      const response = await fetch(`/api/appointments/pet/${petId}`);
      const allAppointments = await response.json();
      
      // Filter for completed telemedicine appointments with notes
      return allAppointments.filter((appt: any) => 
        appt.type === 'virtual' && 
        (appt.status === 'completed' || appt.notes)
      );
    },
    enabled: !!petId,
  });
  
  // Handle errors
  useEffect(() => {
    if (petError) {
      toast({
        title: "Error loading pet information",
        description: "Could not load the pet details. Please try again.",
        variant: "destructive"
      });
    }
  }, [petError, toast]);
  
  if (isPetLoading) {
    return (
      <div className="container max-w-5xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            className="flex items-center gap-2"
            onClick={() => setLocation(`/clients/${clientId}`)}
          >
            <User size={16} />
            <span>Back to Client</span>
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-1">
            <CardHeader className="pb-2">
              <Skeleton className="h-8 w-24 mb-2" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <div className="flex justify-center mb-4">
                <Skeleton className="h-28 w-28 rounded-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="md:col-span-2">
            <CardHeader>
              <Skeleton className="h-7 w-32 mb-2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  if (!pet) {
    return (
      <div className="container max-w-5xl mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <PawPrint className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-2">Pet Not Found</h2>
            <p className="text-muted-foreground mb-6">The pet information you're looking for couldn't be found.</p>
            <div className="flex gap-4">
              <Button onClick={() => setLocation(`/clients/${clientId}`)}>
                Return to Client
              </Button>
              <Button variant="outline" onClick={() => setLocation('/clients')}>
                All Clients
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container max-w-5xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          className="flex items-center gap-2"
          onClick={() => setLocation(`/clients/${clientId}`)}
        >
          <User size={16} />
          <span>Back to Client</span>
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pet Profile Card */}
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle>{pet.name}</CardTitle>
            <CardDescription>
              {pet.species} {pet.breed ? `• ${pet.breed}` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center mb-4">
              <Avatar className="h-28 w-28">
                {pet.photoPath ? (
                  <AvatarImage src={pet.photoPath} alt={pet.name} />
                ) : (
                  <AvatarFallback className="text-2xl">
                    {pet.name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
            </div>
            
            <div className="space-y-2 text-sm">
              {pet.dateOfBirth && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Age:</span>
                  <span className="font-medium">{calculateAge(new Date(pet.dateOfBirth))}</span>
                </div>
              )}
              {pet.weight && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Weight:</span>
                  <span className="font-medium">{pet.weight}</span>
                </div>
              )}
              {pet.gender && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Gender:</span>
                  <span className="font-medium">{
                  pet.gender}</span>
                </div>
              )}
              {pet.color && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Color:</span>
                  <span className="font-medium">{pet.color}</span>
                </div>
              )}
              {pet.microchipNumber && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Microchip ID:</span>
                  <span className="font-medium">{pet.microchipNumber}</span>
                </div>
              )}
              {pet.allergies && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Allergies:</span>
                  <span className="font-medium">{pet.allergies}</span>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button className="w-full" onClick={() => setLocation(`/appointments?view=schedule&petId=${pet.id}`)}>
              Schedule Appointment
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setLocation(`/pet-soap-notes/${pet.id}`)}>
              View Medical Records
            </Button>
          </CardFooter>
        </Card>
        
        {/* Pet Details Tabs */}
        <Card className="md:col-span-2">
          <CardHeader>
            <Tabs defaultValue="overview">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="appointments">Appointments</TabsTrigger>
                <TabsTrigger value="health">Health</TabsTrigger>
              </TabsList>
              
              <CardContent className="pt-4">
                <TabsContent value="overview" className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Owner Information</h3>
                    {isClientLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    ) : client ? (
                      <div className="rounded-lg border p-3">
                        <div className="flex items-center gap-3 mb-2">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {client.name?.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{client.name}</p>
                            <p className="text-xs text-muted-foreground">{client.email}</p>
                          </div>
                        </div>
                        {client.phone && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Phone: </span>
                            <span>{client.phone}</span>
                          </div>
                        )}
                        {/* Removing address check as it doesn't exist in User type */}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No owner information available</p>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2">Basic Information</h3>
                    <div className="rounded-lg border p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Species: </span>
                          <span>{pet.species || 'Not specified'}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Breed: </span>
                          <span>{pet.breed || 'Not specified'}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Color: </span>
                          <span>{pet.color || 'Not specified'}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Gender: </span>
                          <span>{pet.gender || 'Not specified'}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Date of Birth: </span>
                          <span>{pet.dateOfBirth ? new Date(pet.dateOfBirth).toLocaleDateString() : 'Not specified'}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Microchip: </span>
                          <span>{pet.microchipNumber || 'Not specified'}</span>
                        </div>
                      </div>
                      
                      {pet.allergies && (
                        <>
                          <Separator />
                          <div className="text-sm">
                            <p className="text-muted-foreground mb-1">Allergies:</p>
                            <p>{pet.allergies}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="appointments">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-medium">Appointment History</h3>
                      <Button 
                        size="sm" 
                        onClick={() => setLocation(`/appointments?view=schedule&petId=${pet.id}`)}
                      >
                        New Appointment
                      </Button>
                    </div>
                    
                    {isAppointmentsLoading ? (
                      <div className="space-y-3">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                      </div>
                    ) : appointments && appointments.length > 0 ? (
                      <div className="space-y-3">
                        {appointments.map((appointment: any) => (
                          <Card key={appointment.id} className="overflow-hidden">
                            <div className="flex border-l-4 border-primary h-full">
                              <div className="p-3 flex-1">
                                <div className="flex justify-between">
                                  <h4 className="font-medium">{appointment.title}</h4>
                                  <Badge className={appointment.status === 'completed' ? 'bg-green-100 text-green-800' : ''}>
                                    {appointment.status}
                                  </Badge>
                                </div>
                                <div className="flex gap-6 mt-1 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(appointment.date).toLocaleDateString()}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {appointment.duration} mins
                                  </div>
                                  {appointment.type && (
                                    <div className="flex items-center gap-1">
                                      <Info className="h-3 w-3" />
                                      {appointment.type}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 border rounded-lg">
                        <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground mb-4">No appointment history</p>
                        <Button 
                          size="sm" 
                          onClick={() => setLocation(`/appointments?view=schedule&petId=${pet.id}`)}
                        >
                          Schedule First Appointment
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="health">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-medium">Health Records</h3>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setLocation(`/pet-soap-notes/${pet.id}`)}
                      >
                        View All Records
                      </Button>
                    </div>
                    
                    {/* Telemedicine Records */}
                    {isTelemedicineLoading ? (
                      <div className="space-y-3">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                      </div>
                    ) : telemedicineAppointments && telemedicineAppointments.length > 0 ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Video className="h-4 w-4 text-primary" />
                          <h3 className="text-sm font-medium">Telemedicine Consultations</h3>
                        </div>
                        <div className="space-y-3">
                          {telemedicineAppointments.map((appointment: any) => (
                            <Card key={appointment.id} className="overflow-hidden">
                              <div className="flex border-l-4 border-blue-500 h-full">
                                <div className="p-3 flex-1">
                                  <div className="flex justify-between">
                                    <h4 className="font-medium flex items-center gap-1">
                                      <Video className="h-3 w-3 text-blue-500" />
                                      {appointment.title}
                                    </h4>
                                    <Badge className={appointment.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                                      {appointment.status}
                                    </Badge>
                                  </div>
                                  <div className="flex gap-6 mt-1 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {new Date(appointment.date).toLocaleDateString()}
                                    </div>
                                    {appointment.duration && (
                                      <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {appointment.duration} mins
                                      </div>
                                    )}
                                  </div>
                                  {appointment.notes && (
                                    <div className="mt-2">
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                                        <MessageSquare className="h-3 w-3" />
                                        <span>Notes:</span>
                                      </div>
                                      <div className="p-2 bg-muted/50 rounded text-xs">
                                        {appointment.notes}
                                      </div>
                                    </div>
                                  )}
                                  <div className="mt-2 flex justify-end">
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-7 text-xs"
                                      onClick={() => setLocation(`/appointments/${appointment.id}`)}
                                    >
                                      View Details
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    
                    {/* Vaccination Records Component */}
                    <PetVaccinations petId={pet.id} />
                    
                    {(!telemedicineAppointments || telemedicineAppointments.length === 0) && (
                      <div className="text-center py-8 border rounded-lg">
                        <PawPrint className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground mb-4">
                          Visit the SOAP Notes or Patient Timeline to see detailed health records
                        </p>
                      </div>
                    )}
                    
                    <div className="flex gap-2 justify-center">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setLocation(`/pet-soap-notes/${pet.id}`)}
                      >
                        SOAP Notes
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => setLocation(`/patient-timeline-page/${pet.id}`)}
                      >
                        Patient Timeline
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </CardContent>
            </Tabs>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
