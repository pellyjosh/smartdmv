'use client'
import { useUser } from "@/context/UserContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "@/lib/date-utils";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ClientHeader } from "@/components/client/ClientHeader";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Loader2,
  Calendar as CalendarIcon, 
  Check, 
  Clock, 
  AlertCircle, 
  FileText, 
  Activity, 
  Video, 
  X,
  Mail,
  Pill,
  PawPrint,
  Bell,
  User,
  LogOut,
  Settings,
  ChevronDown,
  BarChart4,
  Stethoscope,
  MessageSquare,
  CreditCard,
  Phone,
  ArrowRightCircle,
  Clipboard,
  FileText as FileTextIcon,
  Plus,
  Heart
} from "lucide-react";


// Enhanced pet card component for my pets tab
const PetCard = ({ pet }: { pet: any }) => {
  return (
    <Card className="mb-4 hover:shadow-md transition-shadow duration-300">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14 border border-primary/10">
            {pet.photoUrl ? (
              <AvatarImage src={pet.photoUrl} alt={pet.name} />
            ) : (
              <AvatarFallback className="bg-primary/10 text-primary text-lg">
                {pet.name?.substring(0, 2).toUpperCase() || "PT"}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <CardTitle>{pet.name}</CardTitle>
            <CardDescription>
              {pet.species}{pet.breed ? ` • ${pet.breed}` : ''}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {pet.vaccinationStatus && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Vaccination Status</span>
                <span className="font-medium">{pet.vaccinationStatus}</span>
              </div>
              <Progress value={pet.vaccinationStatus === "Up to date" ? 100 : pet.vaccinationStatus === "Partial" ? 50 : 0} className="h-2" />
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4 text-sm border-t pt-3">
            {pet.dateOfBirth && (
              <div>
                <span className="text-muted-foreground block">Birth Date</span>
                <span className="font-medium">{format(new Date(pet.dateOfBirth), 'MMM d, yyyy')}</span>
              </div>
            )}
            {pet.weight && (
              <div>
                <span className="text-muted-foreground block">Weight</span>
                <span className="font-medium">{pet.weight}</span>
              </div>
            )}
            {pet.sex && (
              <div>
                <span className="text-muted-foreground block">Sex</span>
                <span className="font-medium">{pet.sex}</span>
              </div>
            )}
            {pet.lastCheckup && (
              <div>
                <span className="text-muted-foreground block">Last Checkup</span>
                <span className="font-medium">{format(new Date(pet.lastCheckup), 'MMM d, yyyy')}</span>
              </div>
            )}
            {pet.allergies && (
              <div className="col-span-2">
                <span className="text-muted-foreground block">Allergies</span>
                <span className="font-medium">{pet.allergies}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <div className="flex w-full gap-2">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link href={`/client/pets/${pet.id}`}>
              <Clipboard className="mr-2 h-4 w-4" /> Medical Records
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <CalendarIcon className="mr-2 h-4 w-4" /> Book Appointment
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

// Enhanced appointment card component for appointments tab
const AppointmentCard = ({ appointment }: { appointment: any }) => {
  const appointmentDate = new Date(appointment.date);
  const isUpcoming = appointment.status === 'scheduled' && appointmentDate > new Date();
  const isPast = appointmentDate < new Date() || appointment.status === 'completed' || appointment.status === 'cancelled';
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Scheduled</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    return type === 'virtual' ? <Video className="h-4 w-4 text-blue-500" /> : <Stethoscope className="h-4 w-4 text-green-500" />;
  };

  // Calculate days remaining until appointment
  const daysRemaining = isUpcoming ? 
    Math.ceil((appointmentDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <Card className={`mb-4 hover:shadow-md transition-shadow duration-300 ${isUpcoming ? 'border-l-4 border-l-blue-400' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base flex items-center gap-2">
            {getTypeIcon(appointment.type)}
            {appointment.title}
          </CardTitle>
          {getStatusBadge(appointment.status)}
        </div>
        <CardDescription className="flex items-center gap-1">
          <CalendarIcon className="h-3.5 w-3.5 mr-1" />
          {format(appointmentDate, 'MMM d, yyyy')} • {format(appointmentDate, 'h:mm a')}
          {isUpcoming && daysRemaining <= 3 && (
            <span className="ml-2 text-orange-500 font-medium text-xs">
              {daysRemaining === 0 ? 'Today!' : daysRemaining === 1 ? 'Tomorrow!' : `In ${daysRemaining} days`}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground block text-xs">Type</span>
              <span className="font-medium capitalize">{appointment.type} Appointment</span>
            </div>
            {appointment.duration && (
              <div>
                <span className="text-muted-foreground block text-xs">Duration</span>
                <span className="font-medium">{appointment.duration} minutes</span>
              </div>
            )}
            {appointment.doctor && (
              <div>
                <span className="text-muted-foreground block text-xs">Doctor</span>
                <span className="font-medium">{appointment.doctor}</span>
              </div>
            )}
            {appointment.petName && (
              <div>
                <span className="text-muted-foreground block text-xs">Pet</span>
                <span className="font-medium">{appointment.petName}</span>
              </div>
            )}
          </div>
          {appointment.notes && (
            <div className="mt-3 pt-3 border-t text-sm">
              <span className="text-muted-foreground block text-xs">Notes</span>
              <p className="text-sm">{appointment.notes}</p>
            </div>
          )}
        </div>
      </CardContent>
      {isUpcoming && (
        <CardFooter className="pt-0">
          <div className="flex w-full gap-2">
            {appointment.type === 'virtual' && (
              <Button className="flex-1" variant="default" size="sm">
                <Video className="mr-2 h-4 w-4" /> Join Call
              </Button>
            )}
            <Button className="flex-1" variant="outline" size="sm">
              <CalendarIcon className="mr-2 h-4 w-4" /> Reschedule
            </Button>
            {appointment.status !== 'cancelled' && (
              <Button className="flex-1" variant="outline" size="sm">
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
            )}
          </div>
        </CardFooter>
      )}
    </Card>
  );
};

// Enhanced health plan card component for health plans tab
const HealthPlanCard = ({ healthPlan }: { healthPlan: any }) => {
  // Calculate progress percentage based on completed milestones
  const totalMilestones = healthPlan.milestones?.length || 0;
  const completedMilestones = healthPlan.milestones?.filter((m: any) => m.completed).length || 0;
  const progressPercentage = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;
  
  // Calculate days remaining if there's an end date
  const daysRemaining = healthPlan.endDate ? 
    Math.max(0, Math.ceil((new Date(healthPlan.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : null;
    
  return (
    <Card className="mb-4 hover:shadow-md transition-shadow duration-300">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2 text-green-500" />
              {healthPlan.name}
            </CardTitle>
            <CardDescription>
              Start date: {format(new Date(healthPlan.startDate), 'MMM d, yyyy')}
              {healthPlan.endDate && ` • End date: ${format(new Date(healthPlan.endDate), 'MMM d, yyyy')}`}
            </CardDescription>
          </div>
          {healthPlan.status && (
            <Badge variant="outline" className={
              healthPlan.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 
              healthPlan.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
              'bg-red-50 text-red-700 border-red-200'
            }>
              {healthPlan.status.charAt(0).toUpperCase() + healthPlan.status.slice(1)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Progress indicator */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Plan Progress</span>
              <span className="font-medium">{completedMilestones}/{totalMilestones} milestones completed</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
          
          {/* Plan details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {healthPlan.petName && (
              <div>
                <span className="text-muted-foreground block text-xs">Pet</span>
                <span className="font-medium">{healthPlan.petName}</span>
              </div>
            )}
            {daysRemaining !== null && (
              <div>
                <span className="text-muted-foreground block text-xs">Remaining</span>
                <span className="font-medium">{daysRemaining} days</span>
              </div>
            )}
            {healthPlan.veterinarian && (
              <div>
                <span className="text-muted-foreground block text-xs">Veterinarian</span>
                <span className="font-medium">{healthPlan.veterinarian}</span>
              </div>
            )}
            {healthPlan.planType && (
              <div>
                <span className="text-muted-foreground block text-xs">Plan Type</span>
                <span className="font-medium">{healthPlan.planType}</span>
              </div>
            )}
          </div>
          
          {/* Notes */}
          {healthPlan.notes && (
            <div className="text-sm border-t pt-3">
              <span className="text-muted-foreground block text-xs mb-1">Plan Notes</span>
              <div className="text-sm">{healthPlan.notes}</div>
            </div>
          )}
          
          {/* Milestones */}
          {healthPlan.milestones && healthPlan.milestones.length > 0 && (
            <div className="pt-3 border-t">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Clipboard className="h-4 w-4 text-primary" /> 
                Plan Milestones
              </h4>
              <ul className="space-y-3">
                {healthPlan.milestones.map((milestone: any) => (
                  <li key={milestone.id} className="flex items-start gap-2 text-sm bg-muted/20 p-2 rounded-md">
                    {milestone.completed ? (
                      <Check className="h-5 w-5 text-green-500 mt-0.5" />
                    ) : (
                      <Clock className="h-5 w-5 text-amber-500 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{milestone.title}</div>
                      {milestone.description && <div className="text-muted-foreground text-xs mt-1">{milestone.description}</div>}
                      {milestone.dueDate && (
                        <div className="text-xs mt-1 flex items-center">
                          <CalendarIcon className="h-3 w-3 mr-1 text-muted-foreground" />
                          Due: {format(new Date(milestone.dueDate), 'MMM d, yyyy')}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex w-full gap-2">
          <Button variant="outline" size="sm" className="flex-1">
            <FileText className="mr-2 h-4 w-4" /> Plan Details
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <CalendarIcon className="mr-2 h-4 w-4" /> Schedule Visit
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

// Enhanced notification card component for notifications tab
const NotificationCard = ({ notification, onMarkAsRead }: { notification: any, onMarkAsRead: (id: number) => void }) => {
  const notificationDate = notification.createdAt ? new Date(notification.createdAt) : new Date();
  const timeAgo = getTimeAgo(notificationDate);
  
  // Function to get human-readable time ago
  function getTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000; // seconds in a year
    
    if (interval > 1) return Math.floor(interval) + ' years ago';
    interval = seconds / 2592000; // seconds in a month
    if (interval > 1) return Math.floor(interval) + ' months ago';
    interval = seconds / 86400; // seconds in a day
    if (interval > 1) return Math.floor(interval) + ' days ago';
    interval = seconds / 3600; // seconds in an hour
    if (interval > 1) return Math.floor(interval) + ' hours ago';
    interval = seconds / 60; // seconds in a minute
    if (interval > 1) return Math.floor(interval) + ' minutes ago';
    return 'Just now';
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'appointment':
        return <CalendarIcon className="h-5 w-5 text-blue-500" />;
      case 'health_plan':
        return <Activity className="h-5 w-5 text-green-500" />;
      case 'medication':
        return <Pill className="h-5 w-5 text-purple-500" />;
      case 'alert':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'message':
        return <Mail className="h-5 w-5 text-amber-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };
  
  const getActionButton = (type: string) => {
    switch (type) {
      case 'appointment':
        return (
          <Button variant="outline" size="sm" className="mt-2">
            <CalendarIcon className="h-4 w-4 mr-2" /> View Appointment
          </Button>
        );
      case 'health_plan':
        return (
          <Button variant="outline" size="sm" className="mt-2">
            <Activity className="h-4 w-4 mr-2" /> View Health Plan
          </Button>
        );
      case 'message':
        return (
          <Button variant="outline" size="sm" className="mt-2">
            <MessageSquare className="h-4 w-4 mr-2" /> Reply
          </Button>
        );
      case 'medication':
        return (
          <Button variant="outline" size="sm" className="mt-2">
            <Pill className="h-4 w-4 mr-2" /> Medication Details
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <Card className={`mb-4 hover:shadow-md transition-shadow duration-300 ${!notification.read ? 'border-l-4 border-l-primary' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base flex items-center gap-2">
            {getIcon(notification.type)}
            {notification.title}
          </CardTitle>
          {!notification.read && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onMarkAsRead(notification.id)}
              className="h-7 px-2"
            >
              <Check className="h-4 w-4" />
              <span className="ml-1">Mark as read</span>
            </Button>
          )}
        </div>
        <CardDescription className="flex items-center gap-2">
          <span className="text-xs">{format(notificationDate, 'MMM d, yyyy • h:mm a')}</span>
          <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">{timeAgo}</Badge>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-sm">{notification.message}</p>
          
          {/* Action button based on notification type */}
          {notification.type && getActionButton(notification.type)}
          
          {/* Related entity if present */}
          {notification.relatedEntityName && (
            <div className="mt-3 pt-3 border-t text-sm">
              <span className="text-muted-foreground text-xs">
                {notification.type === 'appointment' ? 'Appointment' : 
                 notification.type === 'health_plan' ? 'Health Plan' :
                 notification.type === 'medication' ? 'Medication' : 'Related to'}:
              </span>
              <span className="ml-2 font-medium">{notification.relatedEntityName}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Main client portal component
export default function ClientPortalPage() {
  const { user, logout, isLoading: isUserLoading } = useUser();
  const { toast } = useToast();  
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // Contact modal state
  const [showMessageModal, setShowMessageModal] = useState(false);
  
  // Show helpful notification if staff members navigate to client portal
  useEffect(() => {
    if (user && user.role !== "CLIENT") {
      toast({
        title: "Staff Portal Notice",
        description: "You're viewing the client portal. To manage clients, please visit the Clients page at /clients.",
        variant: "default",
        duration: 5000,
      });
    }
  }, [user, toast]);

  // Set active tab based on URL parameter or default to "pets"
  useEffect(() => {
    const validTabs = ['dashboard', 'pets', 'appointments', 'health-plans', 'notifications'];
    if (tab && validTabs.includes(tab)) {
      setActiveTab(tab);
    } else {
      setActiveTab('dashboard');
    }
  }, [tab]);

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/client?tab=${value}`);
  };

  // Define types for our data
  interface Pet {
    id: number;
    name: string;
    species: string;
    breed: string;
    age: number;
    weight: number;
    gender: string;
    clientId: number;
    [key: string]: any; // For any additional properties
  }
  
  interface Appointment {
    id: number;
    date: string;
    time: string;
    status: string;
    reason: string;
    type: string;
    petId: number;
    doctorId: number;
    [key: string]: any; // For any additional properties
  }
  
  interface HealthPlan {
    id: number;
    name: string;
    description: string;
    petId: number;
    status: string;
    startDate: string;
    endDate: string;
    [key: string]: any; // For any additional properties
  }
  
  interface Notification {
    id: number;
    title: string;
    message: string;
    read: boolean;
    date: string;
    type: string;
    [key: string]: any; // For any additional properties
  }

  // Fetch pets
  const { 
    data: pets = [],
    isLoading: isLoadingPets,
    error: petsError
  } = useQuery<Pet[]>({ 
    queryKey: ['/api/pets/client'],
    enabled: user?.role === 'CLIENT',
    queryFn: async () => {
      const res = await fetch("/api/pets/client");
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch pets");
      }
      return await res.json();
    },
  });


  // Fetch appointments 
  const { 
    data: appointments = [],
    isLoading: isLoadingAppointments,
    error: appointmentsError
  } = useQuery<Appointment[]>({ 
    queryKey: ['/api/appointments/client'],
    queryFn: async () => {
      const res = await fetch(`/api/appointments/client`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch client appointments");
      }
      return await res.json();
    },
    enabled: user?.role === 'CLIENT'
  });

  // Fetch health plans
  const { 
    data: healthPlans = [],
    isLoading: isLoadingHealthPlans,
    error: healthPlansError
  } = useQuery<HealthPlan[]>({ 
    queryKey: ['/api/health-plans/client'],
    queryFn: async () => {
      const res = await fetch(`/api/health-plans/client`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch health plans");
      }
      return await res.json();
    },
    enabled: user?.role === 'CLIENT'
  });

  // Fetch notifications
  const { 
    data: notifications = undefined, // Initialize with undefined
    isLoading: isLoadingNotifications,
    error: notificationsError
  } = useQuery<Notification[]>({ 
    queryKey: ['/api/notifications/client'],
    queryFn: async () => {
      const res = await fetch(`/api/notifications/client`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch notifications");
      }
      return await res.json();
    },
    enabled: user?.role === 'CLIENT'
  });

  // Mutation to mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate notifications query to refetch
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/client'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to mark notification as read: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Handler for marking notification as read
  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate(notificationId);
  };

  // Error handling
  // if (petsError || appointmentsError || healthPlansError || notificationsError) {
  //   return (
  //     <div className="container mx-auto py-10 px-4 max-w-5xl">
  //       <Card>
  //         <CardHeader>
  //           <CardTitle>Error</CardTitle>
  //         </CardHeader>
  //         <CardContent>
  //           <p className="text-red-500">
  //             {petsError?.message || 
  //              appointmentsError?.message || 
  //              healthPlansError?.message || 
  //              notificationsError?.message || 
  //              "An error occurred while loading your data."}
  //           </p>
  //           <Button onClick={() => window.location.reload()} className="mt-4">
  //             Retry
  //           </Button>
  //         </CardContent>
  //       </Card>
  //     </div>
  //   );
  // }

  // Calculate unread notifications count
  const unreadCount = notifications?.filter((n: any) => !n.read).length || 0;

  // User Profile component with Dialog


    // User Profile component with Dialog
    const UserProfileContent = () => {
    const { user } = useUser();
    
    return (
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Personal Information</h4>
          <div className="grid grid-cols-[100px_1fr] gap-1">
            <div className="text-sm text-muted-foreground">Name:</div>
            <div className="text-sm font-medium">{user?.name}</div>
            
            <div className="text-sm text-muted-foreground">Email:</div>
            <div className="text-sm">{user?.email}</div>
            
            <div className="text-sm text-muted-foreground">Phone:</div>
            <div className="text-sm">{user?.phone || "Not provided"}</div>
          </div>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Account Information</h4>
          <div className="grid grid-cols-[100px_1fr] gap-1">
            <div className="text-sm text-muted-foreground">Username:</div>
            <div className="text-sm">{user?.username}</div>
            
            <div className="text-sm text-muted-foreground">Account Type:</div>
            <div className="text-sm">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {user?.role}
              </Badge>
            </div>
            
            <div className="text-sm text-muted-foreground">SMS Notifications:</div>
            <div className="text-sm">Enabled</div>
          </div>
        </div>
      </div>
    );
  };

  // Handle logout
  const handleLogout = () => {
    logout();
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-5xl">
      <ClientHeader />
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid grid-cols-5 mb-8">
          <TabsTrigger value="dashboard">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Dashboard
            </div>
          </TabsTrigger>
          <TabsTrigger value="pets">
            <div className="flex items-center gap-2">
              <PawPrint className="h-4 w-4" />
              My Pets
            </div>
          </TabsTrigger>
          <TabsTrigger value="appointments">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Appointments
            </div>
          </TabsTrigger>
          <TabsTrigger value="health-plans">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Health Plans
            </div>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="relative">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Pet Stats */}
            <Card 
              className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => setActiveTab("pets")}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-900 flex items-center justify-between">
                  My Pets
                  <PawPrint className="h-4 w-4 text-blue-600 group-hover:scale-110 transition-transform" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-900">
                  {isLoadingPets ? (
                    <Skeleton className="h-8 w-16" />
                  ) : pets ? (
                    <span className="tabular-nums">{Array.isArray(pets) ? pets.length : 0}</span>
                  ) : (
                    <span className="tabular-nums">0</span>
                  )}
                </div>
                <p className="text-xs text-blue-700 mt-1">Registered with SmartDVM</p>
              </CardContent>
              <CardFooter className="pt-0">
                <Button variant="ghost" className="p-0 h-auto text-blue-700 text-xs group-hover:text-blue-800 transition-colors" asChild>
                  <Link href="/client?tab=pets">
                    View all pets <ArrowRightCircle className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>

            {/* Appointment Stats */}
            <Card 
              className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => setActiveTab("appointments")}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-900 flex items-center justify-between">
                  Appointments
                  <CalendarIcon className="h-4 w-4 text-green-600 group-hover:scale-110 transition-transform" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-900">
                  {isLoadingAppointments ? (
                    <Skeleton className="h-8 w-16" />
                  ) : appointments ? (
                    <span className="tabular-nums">
                      {Array.isArray(appointments) ? 
                        appointments.filter((a: any) => a.status === 'scheduled').length : 0}
                    </span>
                  ) : (
                    <span className="tabular-nums">0</span>
                  )}
                </div>
                <p className="text-xs text-green-700 mt-1">Upcoming appointments</p>
              </CardContent>
              <CardFooter className="pt-0">
                <Button variant="ghost" className="p-0 h-auto text-green-700 text-xs group-hover:text-green-800 transition-colors" asChild>
                  <Link href="/client?tab=appointments">
                    Manage appointments <ArrowRightCircle className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>

            {/* Health Plans */}
            <Card 
              className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => setActiveTab("health-plans")}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-purple-900 flex items-center justify-between">
                  Health Plans
                  <Heart className="h-4 w-4 text-purple-600 group-hover:scale-110 transition-transform" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-900">
                  {isLoadingHealthPlans ? (
                    <Skeleton className="h-8 w-16" />
                  ) : healthPlans ? (
                    <span className="tabular-nums">{Array.isArray(healthPlans) ? healthPlans.length : 0}</span>
                  ) : (
                    <span className="tabular-nums">0</span>
                  )}
                </div>
                <p className="text-xs text-purple-700 mt-1">Active health plans</p>
              </CardContent>
              <CardFooter className="pt-0">
                <Button variant="ghost" className="p-0 h-auto text-purple-700 text-xs group-hover:text-purple-800 transition-colors" asChild>
                  <Link href="/client?tab=health-plans">
                    View health plans <ArrowRightCircle className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>

            {/* Notifications */}
            <Card 
              className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => setActiveTab("notifications")}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-amber-900 flex items-center justify-between">
                  Notifications
                  <Bell className="h-4 w-4 text-amber-600 group-hover:scale-110 transition-transform" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-900">
                  {isLoadingNotifications ? (
                    <Skeleton className="h-8 w-16" />
                  ) : notifications ? (
                    <span className="tabular-nums">{Array.isArray(notifications) ? notifications.filter((n: any) => !n.read).length : 0}</span>
                  ) : (
                    <span className="tabular-nums">0</span>
                  )}
                </div>
                <p className="text-xs text-amber-700 mt-1">Unread notifications</p>
              </CardContent>
              <CardFooter className="pt-0">
                <Button variant="ghost" className="p-0 h-auto text-amber-700 text-xs group-hover:text-amber-800 transition-colors" asChild>
                  <Link href="/client?tab=notifications">
                    View all notifications <ArrowRightCircle className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Quick Actions */}
          <h3 className="font-semibold text-lg mt-8 mb-4">Quick Actions</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="hover:shadow-md transition-shadow group">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-blue-500 group-hover:scale-110 transition-transform" />
                  Book Appointment
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">Schedule a new appointment for your pet</p>
              </CardContent>
              <CardFooter className="pt-0">
                <Button 
                  className="w-full group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors" 
                  variant="outline"
                  asChild
                >
                  <Link href="/client/book-appointment">
                    <Plus className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" /> New Appointment
                  </Link>
                </Button>
              </CardFooter>
            </Card>

            <Card className="hover:shadow-md transition-shadow group">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-green-500 group-hover:scale-110 transition-transform" />
                  Contact Veterinarian
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">Send a message to your veterinary team</p>
              </CardContent>
              <CardFooter className="pt-0">
                <Button 
                  className="w-full group-hover:bg-green-50 group-hover:text-green-700 transition-colors" 
                  variant="outline"
                  onClick={() => setShowMessageModal(true)}
                >
                  <Mail className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" /> Send Message
                </Button>
              </CardFooter>
            </Card>

            <Card className="hover:shadow-md transition-shadow group">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-purple-500 group-hover:scale-110 transition-transform" />
                  Billing & Payments
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">View and pay invoices for veterinary services</p>
              </CardContent>
              <CardFooter className="pt-0">
                <Button 
                  className="w-full group-hover:bg-purple-50 group-hover:text-purple-700 transition-colors" 
                  variant="outline"
                  asChild
                >
                  <Link href="/client/marketplace">
                    <CreditCard className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" /> View Marketplace
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Upcoming Appointments Section */}
          <h3 className="font-semibold text-lg mt-8 mb-4">Upcoming Appointments</h3>
          {isLoadingAppointments ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-[160px] w-full" />
              <Skeleton className="h-[160px] w-full" />
            </div>
          ) : appointments && Array.isArray(appointments) && appointments.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {appointments
                .filter((apt: any) => apt.status === 'scheduled')
                .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .slice(0, 2)
                .map((appointment: any) => (
                  <Card key={appointment.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-base">{appointment.title}</CardTitle>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Scheduled</Badge>
                      </div>
                      <CardDescription className="flex items-center gap-1">
                        <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                        {format(new Date(appointment.date), 'MMM d, yyyy')} • {format(new Date(appointment.date), 'h:mm a')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center text-sm">
                          {appointment.type === 'virtual' ? 
                            <Video className="h-4 w-4 text-blue-500" /> : 
                            <Stethoscope className="h-4 w-4 text-green-500" />}
                          <span className="ml-2 capitalize">{appointment.type} Appointment</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <div className="flex w-full gap-2">
                        {appointment.type === 'virtual' && (
                          <Button className="flex-1" variant="default" size="sm">
                            <Video className="mr-2 h-4 w-4" /> Join Call
                          </Button>
                        )}
                        <Button className="flex-1" variant="outline" size="sm">
                          More Details
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <CalendarIcon className="h-8 w-8 text-muted-foreground" />
                  <h3 className="font-medium text-base">No Upcoming Appointments</h3>
                  <p className="text-sm text-muted-foreground">You don't have any appointments scheduled.</p>
                  <Button className="mt-4" variant="outline">
                    <Plus className="mr-2 h-4 w-4" /> Book an Appointment
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pet Health Summary */}
          <h3 className="font-semibold text-lg mt-8 mb-4">Pet Health Summary</h3>
          {isLoadingPets ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-[220px] w-full" />
              <Skeleton className="h-[220px] w-full" />
            </div>
          ) : pets && Array.isArray(pets) && pets.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {pets.slice(0, 2).map((pet: any) => (
                <Card key={pet.id}>
                  <CardHeader className="pb-0">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-14 w-14 border border-primary/10">
                        {pet.photoUrl ? (
                          <AvatarImage src={pet.photoUrl} alt={pet.name} />
                        ) : (
                          <AvatarFallback className="bg-primary/10 text-primary text-lg">
                            {pet.name?.substring(0, 2).toUpperCase() || "PT"}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <CardTitle>{pet.name}</CardTitle>
                        <CardDescription>
                          {pet.species}{pet.breed ? ` • ${pet.breed}` : ''}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Vaccination Status</span>
                          <span className="font-medium">{pet.vaccinationStatus || "Unknown"}</span>
                        </div>
                        <Progress value={pet.vaccinationStatus === "Up to date" ? 100 : pet.vaccinationStatus === "Partial" ? 50 : 0} className="h-2" />
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground block">Last Checkup</span>
                          <span>{pet.lastCheckup ? format(new Date(pet.lastCheckup), 'MMM d, yyyy') : "None"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Weight</span>
                          <span>{pet.weight || "Not recorded"}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full" asChild>
                      <Link href={`/client/pets/${pet.id}`}>
                        <Clipboard className="mr-2 h-4 w-4" /> View Full Record
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <PawPrint className="h-8 w-8 text-muted-foreground" />
                  <h3 className="font-medium text-base">No Pets Registered</h3>
                  <p className="text-sm text-muted-foreground">Register your pets to keep track of their health records.</p>
                  <Button className="mt-4" variant="outline">
                    <Plus className="mr-2 h-4 w-4" /> Register a Pet
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Health Tips & Resources */}
          <h3 className="font-semibold text-lg mt-8 mb-4">Pet Health Resources</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Heart className="h-5 w-5 text-red-500" />
                  Wellness & Prevention
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Tips for keeping your pet healthy with preventive care.</p>
              </CardContent>
              <CardFooter className="pt-0">
                <Button variant="ghost" className="w-full">
                  <FileTextIcon className="h-4 w-4 mr-2" /> Read Article
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-500" />
                  Nutrition Guidelines
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Proper nutrition guidance for different pet ages and conditions.</p>
              </CardContent>
              <CardFooter className="pt-0">
                <Button variant="ghost" className="w-full">
                  <FileTextIcon className="h-4 w-4 mr-2" /> Read Article
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Phone className="h-5 w-5 text-blue-500" />
                  Emergency Contact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">What to do and who to contact in case of a pet emergency.</p>
              </CardContent>
              <CardFooter className="pt-0">
                <Button variant="ghost" className="w-full">
                  <FileTextIcon className="h-4 w-4 mr-2" /> View Contacts
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pets">
          <div className="grid md:grid-cols-2 gap-6">
            {isLoadingPets ? (
              // Loading skeleton for pets
              Array(2).fill(0).map((_, i) => (
                <Card key={i} className="mb-4">
                  <CardHeader className="pb-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-24 mt-2" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : pets && pets.length > 0 ? (
              pets.map((pet: any) => <PetCard key={pet.id} pet={pet} />)
            ) : (
              <div className="col-span-2 text-center py-10">
                <p className="text-muted-foreground">You don't have any pets registered yet.</p>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="appointments">
          {isLoadingAppointments ? (
            // Loading skeleton for appointments
            Array(3).fill(0).map((_, i) => (
              <Card key={i} className="mb-4">
                <CardHeader className="pb-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                  <Skeleton className="h-4 w-32 mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : appointments && appointments.length > 0 ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Upcoming Appointments</h3>
              </div>
              {appointments
                .filter((apt: any) => apt.status === 'scheduled')
                .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((appointment: any) => (
                  <AppointmentCard key={appointment.id} appointment={appointment} />
                ))
              }
              
              <h3 className="text-lg font-semibold mt-8 mb-4">Past Appointments</h3>
              {appointments
                .filter((apt: any) => apt.status === 'completed' || apt.status === 'cancelled')
                .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((appointment: any) => (
                  <AppointmentCard key={appointment.id} appointment={appointment} />
                ))
              }
            </>
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground">You don't have any appointments scheduled.</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="health-plans">
          {isLoadingHealthPlans ? (
            // Loading skeleton for health plans
            Array(2).fill(0).map((_, i) => (
              <Card key={i} className="mb-4">
                <CardHeader className="pb-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-56 mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <div className="mt-3 pt-3 border-t">
                      <Skeleton className="h-4 w-24 mb-2" />
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <Skeleton className="h-4 w-4 mt-0.5" />
                          <div className="flex-1">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-3 w-24 mt-1" />
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Skeleton className="h-4 w-4 mt-0.5" />
                          <div className="flex-1">
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-3 w-32 mt-1" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : healthPlans && healthPlans.length > 0 ? (
            healthPlans.map((healthPlan: any) => <HealthPlanCard key={healthPlan.id} healthPlan={healthPlan} />)
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground">You don't have any health plans yet.</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="notifications">
          {isLoadingNotifications ? (
            // Loading skeleton for notifications
            Array(3).fill(0).map((_, i) => (
              <Card key={i} className="mb-4">
                <CardHeader className="pb-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                  <Skeleton className="h-4 w-32 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4 mt-2" />
                </CardContent>
              </Card>
            ))
          ) : notifications && notifications.length > 0 ? (
            <>
              {unreadCount > 0 && (
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Unread Notifications</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => notifications.filter((n: any) => !n.read).forEach((n: any) => handleMarkAsRead(n.id))}
                    disabled={markAsReadMutation.isPending}
                  >
                    {markAsReadMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Mark all as read
                  </Button>
                </div>
              )}

              {/* Unread notifications */}
              {notifications
                .filter((n: any) => !n.read)
                .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((notification: any) => notifications && (
                  <NotificationCard 
                    key={notification.id} 
                    notification={notification} 
                    onMarkAsRead={handleMarkAsRead}
                  />
                ))
              }
              
              {/* Read notifications */}
              <h3 className="text-lg font-semibold mt-8 mb-4">Previous Notifications</h3>
              {notifications
                .filter((n: any) => n.read)
                .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((notification: any) => (
                  <NotificationCard 
                    key={notification.id} 
                    notification={notification} 
                    onMarkAsRead={handleMarkAsRead}
                  />
                ))
              }
            </>
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground">You don't have any notifications.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Contact Veterinarian Modal */}
      <Dialog open={showMessageModal} onOpenChange={setShowMessageModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Contact Veterinary Team</DialogTitle>
            <DialogDescription>
              Send a message to your veterinary team. They will respond as soon as possible.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="message-subject" className="text-right">
                Subject
              </label>
              <input
                id="message-subject"
                placeholder="Brief subject line"
                className="col-span-3 p-2 border rounded"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="message-priority" className="text-right">
                Priority
              </label>
              <select id="message-priority" className="col-span-3 p-2 border rounded">
                <option value="low">Low - General question</option>
                <option value="medium">Medium - Concern about pet</option>
                <option value="high">High - Urgent medical concern</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="message-content" className="text-right">
                Message
              </label>
              <textarea
                id="message-content"
                placeholder="Describe your question or concern..."
                className="col-span-3 p-2 border rounded"
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowMessageModal(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              onClick={() => {
                toast({
                  title: "Message Sent",
                  description: "Your message has been sent to the veterinary team.",
                });
                setShowMessageModal(false);
              }}
            >
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}