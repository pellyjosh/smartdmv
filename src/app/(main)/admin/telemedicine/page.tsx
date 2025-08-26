'use client';
import { MarketplaceFeatureContainer } from "@/components/features/marketplace-feature-message";
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
  User, Wifi, WifiOff
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { useEffect, useState } from "react";
import { telemedicineService, WebSocketStatus } from "@/lib/websocket";
import { AppointmentCardSkeleton } from "@/components/ui/shimmer";

export default function TelemedicinePage() {  
  const router = useRouter();
  const { user, userPracticeId } = useUser();
  const [wsStatus, setWsStatus] = useState<WebSocketStatus>(WebSocketStatus.DISCONNECTED);

  // Helper function to check if appointment is virtual/telemedicine
  const isVirtualAppointment = (appointmentOrType: any): boolean => {
    // Handle both appointment object and type string
    const type = typeof appointmentOrType === 'string' 
      ? appointmentOrType 
      : appointmentOrType?.type;
      
    if (!type) {
      return false;
    }
    
    const normalizedType = type.toLowerCase().trim();
    
    // Check for various possible formats
    const virtualKeywords = [
      'telemedicine',
      'virtual-consultation',
      'virtual',
      'online',
      'video',
      'remote',
      'teleconsultation',
      'tele-medicine',
      'video call',
      'video consultation'
    ];
    
    const isVirtual = virtualKeywords.some(keyword => normalizedType.includes(keyword));
    
    // Simple logging for debugging
    if (isVirtual) {
      console.log(`✅ Virtual appointment detected: ${type}`);
    }
    
    return isVirtual;
  };

  // Debug logging
  console.log('[Telemedicine] User:', user?.email, 'Practice ID:', userPracticeId);

  // Show loading shimmer if user data is not ready yet
  if (!user) {
    return (
      <div className="h-full">
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0 p-4 md:p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <div className="h-8 w-48 bg-gray-200 animate-pulse rounded"></div>
              <div className="h-4 w-24 bg-gray-200 animate-pulse rounded"></div>
            </div>
            <div className="h-10 w-48 bg-gray-200 animate-pulse rounded"></div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <AppointmentCardSkeleton key={i} />
            ))}
          </div>
        </main>
      </div>
    );
  }

  // WebSocket connection effect - Safe and robust
  useEffect(() => {
    // Only attempt connection if we have user data
    if (!user || !userPracticeId) {
      console.log('[Telemedicine] Skipping WebSocket connection - missing user or practice ID');
      setWsStatus(WebSocketStatus.DISCONNECTED);
      return;
    }

    let isComponentMounted = true;
    let statusUnsubscribe: (() => void) | null = null;

    // Delayed connection to avoid blocking the UI
    const connectTimer = setTimeout(() => {
      if (!isComponentMounted) return;

      console.log('[Telemedicine] Attempting WebSocket connection...');
      
      try {
        // Set connecting status
        setWsStatus(WebSocketStatus.CONNECTING);
        
        // Listen for status changes first
        statusUnsubscribe = telemedicineService.onStatusChange((status) => {
          if (isComponentMounted) {
            console.log('[Telemedicine] WebSocket status changed:', status);
            setWsStatus(status);
          }
        });

        // Attempt connection
        telemedicineService.connect();
        
        // Set a timeout to stop trying if connection fails
        const connectionTimeout = setTimeout(() => {
          if (isComponentMounted && telemedicineService.getStatus() === WebSocketStatus.CONNECTING) {
            console.log('[Telemedicine] Connection timeout, setting to disconnected');
            setWsStatus(WebSocketStatus.DISCONNECTED);
          }
        }, 10000); // 10 second timeout

        return () => {
          clearTimeout(connectionTimeout);
        };

      } catch (error) {
        console.error('[Telemedicine] WebSocket connection error:', error);
        if (isComponentMounted) {
          setWsStatus(WebSocketStatus.DISCONNECTED);
        }
      }
    }, 500); // 500ms delay to not block initial render

    // Cleanup function
    return () => {
      isComponentMounted = false;
      clearTimeout(connectTimer);
      
      if (statusUnsubscribe) {
        try {
          statusUnsubscribe();
        } catch (error) {
          console.warn('[Telemedicine] Error unsubscribing from status:', error);
        }
      }
      
      try {
        telemedicineService.disconnect();
      } catch (error) {
        console.warn('[Telemedicine] Error disconnecting WebSocket:', error);
      }
    };
  }, [user, userPracticeId]);

  // Fetch upcoming telemedicine appointments
  const { 
    data: upcomingAppointments, 
    isLoading: isLoadingUpcoming,
    error: upcomingError
  } = useQuery({
    queryKey: ['/api/appointments', 'upcoming', userPracticeId],
    queryFn: async () => {
      console.log('[Telemedicine] Fetching upcoming appointments, practiceId:', userPracticeId);
      console.log('[Telemedicine] User object:', user);

      const url = `/api/appointments?practiceId=${userPracticeId}`;
      console.log('[Telemedicine] Full API URL:', url);

      const response = await fetch(url, { credentials: "include" });
      console.log('[Telemedicine] Response status:', response.status);
      console.log('[Telemedicine] Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Telemedicine] Failed to fetch appointments:', response.status, response.statusText);
        console.error('[Telemedicine] Error response body:', errorText);
        throw new Error(`Failed to fetch appointments (Telemedicine): ${response.status} ${errorText}`);
      }

      const allAppointments = await response.json();
      console.log('[Telemedicine] All appointments received:', allAppointments.length);
      console.log('[Telemedicine] All appointments data:', allAppointments);

      // Filter for upcoming virtual appointments
      const now = new Date();
      console.log('[Telemedicine] Current time:', now);
      
      const virtualAppointments = allAppointments.filter((appt: Appointment) => {
        const appointmentDate = new Date(appt.date);
        const isVirtualType = isVirtualAppointment(appt.type);
        const isUpcoming = appointmentDate > now;
        const isActiveStatus = appt.status === 'approved' || appt.status === 'pending';
        
        // Log only virtual appointments that match our criteria
        if (isVirtualType && isActiveStatus && isUpcoming) {
          console.log(`📅 Upcoming virtual appointment: ${appt.title} (${appt.type}) on ${appointmentDate.toLocaleDateString()}`);
        }
        
        return isVirtualType && isActiveStatus && isUpcoming;
      });

      console.log('[Telemedicine] Filtered upcoming virtual appointments:', virtualAppointments.length);

      // Debug: Show all telemedicine/virtual appointments regardless of status/date
      const allVirtualAppointments = allAppointments.filter((appt: Appointment) => 
        isVirtualAppointment(appt.type)
      );
      console.log('[Telemedicine] ALL virtual appointments (ignoring status/date):', allVirtualAppointments);

      // Sort by date
      return virtualAppointments.sort((a: Appointment, b: Appointment) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
    },
    enabled: !!userPracticeId // Only run query when we have a practice ID
  });

  // Fetch completed telemedicine appointments
  const { 
    data: completedAppointments, 
    isLoading: isLoadingCompleted,
    error: completedError
  } = useQuery({
    queryKey: ['/api/appointments', 'completed', userPracticeId],
    queryFn: async () => {
      // Log for debugging
      console.log('Fetching completed virtual appointments, practiceId:', userPracticeId);

      // Try fetching all appointments first, then filter client-side
      const response = await fetch(`/api/appointments?practiceId=${userPracticeId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch appointments');
      }

      const allAppointments = await response.json();
      console.log('All appointments for completed section:', allAppointments);

      // Filter for virtual appointments with completed status
      const completedVirtualAppointments = allAppointments.filter((appt: any) => {
        const isVirtualType = isVirtualAppointment(appt.type);
        const isCompleted = appt.status === 'completed';
        
        console.log('[Telemedicine] Checking completed appointment:', {
          id: appt.id,
          title: appt.title,
          type: appt.type,
          status: appt.status,
          isVirtualType,
          isCompleted
        });
        
        return isVirtualType && isCompleted;
      });

      console.log('Filtered completed virtual appointments:', completedVirtualAppointments);
      return completedVirtualAppointments;
    },
    enabled: !!userPracticeId // Only run query when we have a practice ID
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
    <MarketplaceFeatureContainer
      featureName="Telemedicine"
      featureId="telemedicine"
      addOnId="10"
      description="Conduct virtual consultations with clients through video calls and messaging. This feature requires the Telemedicine Platform add-on."
    >
      <div className="h-full">
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 p-4 md:p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Telemedicine</h1>
            <div className="flex items-center gap-2">
              {wsStatus === WebSocketStatus.CONNECTED ? (
                <div className="flex items-center gap-1 text-green-600">
                  <Wifi className="h-4 w-4" />
                  <span className="text-sm font-medium">Connected</span>
                </div>
              ) : wsStatus === WebSocketStatus.CONNECTING || wsStatus === WebSocketStatus.RECONNECTING ? (
                <div className="flex items-center gap-1 text-yellow-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm font-medium">Connecting</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-gray-400">
                  <WifiOff className="h-4 w-4" />
                  <span className="text-sm font-medium">Offline</span>
                </div>
              )}
            </div>
          </div>
          <Button asChild>
            <Link href="/admin/appointments?type=virtual&view=schedule">
              <CalendarPlus className="h-4 w-4 mr-2" />
              Schedule Virtual Appointment
            </Link>
          </Button>
        </div>


         <div className="max-w-full space-y-6">
           <Tabs defaultValue="upcoming">
             <TabsList>
               <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
               <TabsTrigger value="completed">History</TabsTrigger>
               <TabsTrigger value="settings">Settings</TabsTrigger>
             </TabsList>

             <TabsContent value="upcoming" className="space-y-6 pt-4">
               
               {!userPracticeId || isLoadingUpcoming ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <AppointmentCardSkeleton key={i} />
                  ))}
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
                      <Link href="/admin/appointments?type=virtual&view=schedule">
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
                          <User className="h-3.5 w-3.5 mr-1.5" />
                          <span>  
                            {appointment.pet?.name || "Unknown Pet"}
                          </span>
                        </div>
                      </CardContent>

                      <CardFooter className="pt-1">
                        <Button 
                          className="w-full" 
                          onClick={() => router.push(`/admin/telemedicine/call?appointmentId=${appointment.id}`)}
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
              {!userPracticeId || isLoadingCompleted ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <AppointmentCardSkeleton key={i} />
                  ))}
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
                            {appointment.pet?.name || "Unknown Pet"}
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
    </MarketplaceFeatureContainer>
  );
}