'use client';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; 
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/context/UserContext";
import { Appointment } from "@/db/schema";
import { 
  Loader2, MicIcon, VideoIcon, PhoneOffIcon, MessageSquare, 
  Settings, Video, Calendar, Clock, PlusCircle, CheckCircle, AlertCircle, CalendarPlus,
  User
} from "lucide-react";
// import { MarketplaceFeatureContainer } from "@/components/features/marketplace-feature-message";
import { format } from "date-fns";

export default function TelemedicinePage() {  
  const router = useRouter();
  const { user } = useUser();
  // const featureAccess = useFeatureAccess("TELEMEDICINE");  // Assuming this hook might be custom
  // const hasTelemedicineAccess = true; // featureAccess.hasAccess ||  // Need to adapt this to your permission system
    // (featureAccess.availableFeatures && featureAccess.availableFeatures.includes("TELEMEDICINE"));
  // const isFeatureAccessLoading = false; // featureAccess.isLoading;  // Adjust based on how you check loading now

  // Fetch upcoming telemedicine appointments
  const { 
    data: upcomingAppointments, 
    isLoading: isLoadingUpcoming,
    error: upcomingError
  } = useQuery({
    queryKey: ['/api/appointments'],
    queryFn: async () => {
      console.log('Fetching all appointments to filter virtual ones (Telemedicine Page)');

      const response = await fetch('/api/appointments', { credentials: "include" });
      if (!response.ok) {
        throw new Error('Failed to fetch appointments (Telemedicine)');
      }

      const allAppointments = await response.json();

      // Filter for upcoming virtual appointments
      const now = new Date();
      const virtualAppointments = allAppointments.filter((appt: Appointment) => {
        const appointmentDate = new Date(appt.date);
        return appt.type === 'virtual' && 
               appt.status === 'scheduled' &&
               appointmentDate > now;
      });

      // Sort by date
      return virtualAppointments.sort((a: Appointment, b: Appointment) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
    }
  });

  // Fetch completed telemedicine appointments
  const { 
    data: completedAppointments, 
    isLoading: isLoadingCompleted,
    error: completedError
  } = useQuery({
    queryKey: ['/api/appointments/virtual', 'completed'],
    queryFn: async () => {
      // Log for debugging
      console.log('Fetching completed virtual appointments');

      // Try fetching all appointments first, then filter client-side
      const response = await fetch('/api/appointments');
      if (!response.ok) {
        throw new Error('Failed to fetch appointments');
      }

      const allAppointments = await response.json();
      console.log('All appointments for completed section:', allAppointments);

      // Filter for virtual appointments with completed status
      const completedVirtualAppointments = allAppointments.filter(  // Filter for completed virtual appointments
        (appt: any) => appt.type === 'virtual' && appt.status === 'completed'
      );

      console.log('Filtered completed virtual appointments:', completedVirtualAppointments);
      return completedVirtualAppointments;
    },
    // enabled: hasTelemedicineAccess === true
  });

  // Show marketplace UI for users without feature access
  // if (!hasTelemedicineAccess && !isFeatureAccessLoading) {
  //   return (
  //     <div className="h-full">
  //       <main className="flex-1 overflow-y-auto pb-16 md:pb-0 p-4 md:p-6">
  //         <h1 className="text-2xl font-bold mb-6">Telemedicine</h1>

  //         <MarketplaceFeatureContainer
  //           // Assuming this component and props are still valid
  //           featureId="TELEMEDICINE"
  //           featureName="Telemedicine"
  //           description="Connect with your clients remotely through secure video consultations. This add-on enables virtual appointments, improving accessibility and convenience for pet owners while maintaining high-quality veterinary care."
  //           addOnId="telemedicine"
  //         >
  //           <Tabs defaultValue="upcoming" className="w-full">
  //             <TabsList>
  //               <TabsTrigger value="upcoming">Upcoming Consultations</TabsTrigger>
  //               <TabsTrigger value="completed">Completed</TabsTrigger>
  //               <TabsTrigger value="settings">Settings</TabsTrigger>
  //             </TabsList>

  //             <TabsContent value="upcoming" className="space-y-6 pt-4">
  //               <Card>
  //                 <CardHeader className="pb-3">
  //                   <CardTitle>Virtual Consultations</CardTitle>
  //                 </CardHeader>
  //                 <CardContent>
  //                   <div className="flex items-center justify-center h-40">
  //                     <div className="text-center">
  //                       <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
  //                       <p className="text-sm text-muted-foreground">No upcoming virtual consultations</p>
  //                     </div>
  //                   </div>
  //                 </CardContent>
  //               </Card>
  //             </TabsContent>

  //             <TabsContent value="completed">
  //               <div className="text-center py-8 text-muted-foreground">
  //                 <p>No completed consultations found</p>
  //               </div>
  //             </TabsContent>

  //             <TabsContent value="settings">
  //               <Card>
  //                 <CardHeader>
  //                   <CardTitle>Telemedicine Settings</CardTitle>
  //                 </CardHeader>
  //                 <CardContent>
  //                   <div className="space-y-4">
  //                     <div className="grid grid-cols-1 gap-4">
  //                       <div>
  //                         <p className="text-sm text-muted-foreground mb-4">
  //                           Configure your telemedicine consultation settings here.
  //                         </p>
  //                       </div>
  //                     </div>
  //                   </div>
  //                 </CardContent>
  //               </Card>
  //             </TabsContent>
  //           </Tabs>
  //         </MarketplaceFeatureContainer>
  //       </main>
  //     </div>
  //   );
  // }

  // Show the actual feature UI for users with access or while loading
  return (
    <div className="h-full">
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 p-4 md:p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Telemedicine</h1>
          <Button asChild>
            <a href="/appointments/new?type=virtual">
              <CalendarPlus className="h-4 w-4 mr-2" />
              Schedule Virtual Appointment
            </a>
          </Button>
        </div>


         <div className="max-w-full space-y-6">
           <Tabs defaultValue="upcoming">
             <TabsList>
               <TabsTrigger value="upcoming">Upcoming Consultations</TabsTrigger>
               <TabsTrigger value="completed">Completed</TabsTrigger>
               <TabsTrigger value="settings">Settings</TabsTrigger>
             </TabsList>

             <TabsContent value="upcoming" className="space-y-6 pt-4">
               {isLoadingUpcoming ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : upcomingError ? (
                <Card>
                  <CardContent className="py-10 text-center">
                    <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium">Failed to load appointments</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      There was an error loading your appointments.
                    </p>
                    <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                      Try Again
                    </Button>
                  </CardContent>
                </Card>
              ) : upcomingAppointments?.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center">
                    <div className="rounded-full bg-slate-100 p-3 mx-auto mb-3 w-fit">
                      <Video className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">No upcoming consultations</h3>
                    <p className="text-sm text-slate-500 mt-1 mb-4 max-w-md mx-auto">
                      You don't have any upcoming virtual consultations scheduled. Create a new virtual appointment to get started.
                    </p>
                    <Button asChild>
                      <Link href="/appointments/new?type=virtual">
                        <CalendarPlus className="h-4 w-4 mr-2" />
                        Schedule Consultation
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {upcomingAppointments?.map((appointment: Appointment) => (
                    <Card key={appointment.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle>{appointment.title}</CardTitle>
                            <CardDescription>
                              {appointment.date && (
                                <span className="flex items-center text-sm mt-1">
                                  <Calendar className="h-3.5 w-3.5 mr-1 text-gray-500" />
                                  {format(new Date(appointment.date), 'MMM d, yyyy')}
                                  <Clock className="h-3.5 w-3.5 ml-2 mr-1 text-gray-500" />
                                  {format(new Date(appointment.date), 'h:mm a')}
                                </span>
                              )}
                            </CardDescription>
                          </div>
                          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">
                            Virtual
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="pb-3">
                        {appointment.notes && (
                          <p className="text-sm text-gray-600 mb-4">{appointment.notes}</p>
                        )}
                      <div className="flex items-center text-sm text-gray-500 mb-1">
                        {/* Assuming patient/pet info is still available */}
                          <User className="h-3.5 w-3.5 mr-1.5" />
                          <span>  
                            {appointment.patientName || appointment.petName || "Unknown Patient"}
                          </span>
                        </div>
                      </CardContent>

                      <CardFooter className="pt-1">
                        <Button 
                          className="w-full" 
                          onClick={() => router.push(`/telemedicine/${appointment.id}`)}
                        >
                          <Video className="h-4 w-4 mr-2" />
                          Join Call
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed" className="pt-4">
              {isLoadingCompleted ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : completedError ? (
                <Card>
                  <CardContent className="py-10 text-center">
                    <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium">Failed to load history</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      There was an error loading your consultation history.
                    </p>
                  </CardContent>
                </Card>
              ) : completedAppointments?.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center">
                    <div className="rounded-full bg-slate-100 p-3 mx-auto mb-3 w-fit">
                      <CheckCircle className="h-6 w-6 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">No completed consultations</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Your consultation history will appear here after completing virtual appointments.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {completedAppointments?.map((appointment: Appointment) => (
                    <Card key={appointment.id}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle>{appointment.title}</CardTitle>
                            <CardDescription>
                              {appointment.date && (
                                <span className="flex items-center text-sm mt-1">
                                  <Calendar className="h-3.5 w-3.5 mr-1 text-gray-500" />
                                  {format(new Date(appointment.date), 'MMM d, yyyy')}
                                  <Clock className="h-3.5 w-3.5 ml-2 mr-1 text-gray-500" />
                                  {format(new Date(appointment.date), 'h:mm a')}
                                </span>
                              )}
                            </CardDescription>
                          </div>
                          <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">  
                            Completed
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent>
                        {appointment.notes && (
                          <p className="text-sm text-gray-600">{appointment.notes}</p>  // Display appointment notes
                        )}
                        <div className="flex items-center text-sm text-gray-500 mt-2">
                          <User className="h-3.5 w-3.5 mr-1.5" />  
                          <span>
                            {appointment.patientName || appointment.petName || "Unknown Patient"}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="settings" className="pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Video Call Settings</CardTitle>
                  <CardDescription>
                    Configure your camera, microphone, and speaker settings for telemedicine calls.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Camera</label>
                    <Select defaultValue="default">
                      <SelectTrigger>
                        <SelectValue placeholder="Select camera" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default Camera</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Microphone</label>
                    <Select defaultValue="default">
                      <SelectTrigger>
                        <SelectValue placeholder="Select microphone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default Microphone</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Speakers</label>
                    <Select defaultValue="default">
                      <SelectTrigger>
                        <SelectValue placeholder="Select speakers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default Speakers</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Notification Preferences</h3>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="email-reminders" defaultChecked />
                      <label htmlFor="email-reminders" className="text-sm">
                        Email reminders before telemedicine appointments
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="sms-reminders" defaultChecked />
                      <label htmlFor="sms-reminders" className="text-sm">
                        SMS reminders before telemedicine appointments
                      </label>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button>Save Settings</Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}