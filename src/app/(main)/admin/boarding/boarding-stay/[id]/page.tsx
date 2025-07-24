'use client';
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ChevronLeft, 
  PawPrint,
  Home,
  Clock,
  Phone,
  CalendarPlus,
  FileEdit,
  SquarePen,
  Clipboard,
  ClipboardCheck,
  ClipboardList,
  Coffee,
  Pill,
  Trash,
  CheckCircle2,
  XCircle,
  Plus
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO, differenceInDays } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePracticeId } from "@/hooks/use-practice-id";
import { useUser } from "@/context/UserContext";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface BoardingStay {
  id: number;
  petId: number;
  pet: {
    id: number;
    name: string;
    species: string;
    breed: string | null;
    ownerId: number;
    owner: {
      id: number;
      name: string;
      email: string;
      phone: string;
    };
  };
  practiceId: number;
  kennelId: number;
  kennel: {
    id: number;
    name: string;
    type: string;
    size: string;
  };
  startDate: string;
  endDate: string;
  status: "scheduled" | "checked_in" | "checked_out" | "cancelled";
  checkInDate: string | null;
  checkOutDate: string | null;
  checkInById: number | null;
  checkOutById: number | null;
  cancelledById: number | null;
  notes: string | null;
  specialInstructions: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  hasMedications: boolean;
  hasFeedingInstructions: boolean;
  hasSpecialRequirements: boolean;
  dailyRate: string | null;
  createdAt: string;
}

interface MedicationSchedule {
  id: number;
  stayId: number;
  practiceId: number;
  name: string;
  instructions: string;
  frequency: string;
  schedule: string;
  lastAdministeredAt: string | null;
  nextDueAt: string | null;
  createdAt: string;
}

interface FeedingSchedule {
  id: number;
  stayId: number;
  practiceId: number;
  foodType: string;
  amount: string;
  frequency: string;
  specialInstructions: string | null;
  schedule: string;
  lastFedAt: string | null;
  nextFeedingAt: string | null;
  createdAt: string;
}

interface BoardingRequirement {
  id: number;
  stayId: number;
  practiceId: number;
  name: string;
  description: string;
  isCompleted: boolean;
  isRequired: boolean;
  completedAt: string | null;
  completedById: number | null;
  createdAt: string;
}

interface BoardingActivity {
  id: number;
  stayId: number;
  practiceId: number;
  type: string;
  notes: string | null;
  performedById: number;
  performedAt: string;
  createdAt: string;
}

// Form schemas
const medicationSchema = z.object({
  name: z.string().min(1, "Medication name is required"),
  instructions: z.string().min(1, "Instructions are required"),
  frequency: z.string().min(1, "Frequency is required"),
  schedule: z.string().min(1, "Schedule is required")
});

const feedingSchema = z.object({
  foodType: z.string().min(1, "Food type is required"),
  amount: z.string().min(1, "Amount is required"),
  frequency: z.string().min(1, "Frequency is required"),
  schedule: z.string().min(1, "Schedule is required"),
  specialInstructions: z.string().optional()
});

const requirementSchema = z.object({
  name: z.string().min(1, "Requirement name is required"),
  description: z.string().min(1, "Description is required"),
  isRequired: z.boolean().default(true)
});

const activitySchema = z.object({
  type: z.string().min(1, "Activity type is required"),
  notes: z.string().optional()
});

export default function BoardingStayPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const practiceId = usePracticeId();
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Dialog states
  const [medicationDialogOpen, setMedicationDialogOpen] = useState(false);
  const [feedingDialogOpen, setFeedingDialogOpen] = useState(false);
  const [requirementDialogOpen, setRequirementDialogOpen] = useState(false);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  
  // Forms
  const medicationForm = useForm<z.infer<typeof medicationSchema>>({
    resolver: zodResolver(medicationSchema),
    defaultValues: {
      name: "",
      instructions: "",
      frequency: "daily",
      schedule: "morning"
    }
  });
  
  const feedingForm = useForm<z.infer<typeof feedingSchema>>({
    resolver: zodResolver(feedingSchema),
    defaultValues: {
      foodType: "",
      amount: "",
      frequency: "twice_daily",
      schedule: "morning_evening",
      specialInstructions: ""
    }
  });
  
  const requirementForm = useForm<z.infer<typeof requirementSchema>>({
    resolver: zodResolver(requirementSchema),
    defaultValues: {
      name: "",
      description: "",
      isRequired: true
    }
  });
  
  const activityForm = useForm<z.infer<typeof activitySchema>>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      type: "exercise",
      notes: ""
    }
  });
  
  // Fetch boarding stay data
  const { data: stay, isLoading: stayLoading } = useQuery({
    queryKey: ["/api/boarding/stays", params.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/boarding/stays/${params.id}`);
      return await res.json();
    },
    enabled: !!params.id
  });
  
  // Fetch medication schedules
  const { data: medications, isLoading: medicationsLoading } = useQuery({
    queryKey: ["/api/boarding/stays", params.id, "medications"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/boarding/medication-schedules?stayId=${params.id}`);
      return await res.json();
    },
    enabled: !!params.id && activeTab === "medications"
  });
  
  // Fetch feeding schedules
  const { data: feedings, isLoading: feedingsLoading } = useQuery({
    queryKey: ["/api/boarding/stays", params.id, "feedings"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/boarding/feeding-schedules?stayId=${params.id}`);
      return await res.json();
    },
    enabled: !!params.id && activeTab === "feeding"
  });
  
  // Fetch requirements
  const { data: requirements, isLoading: requirementsLoading } = useQuery({
    queryKey: ["/api/boarding/stays", params.id, "requirements"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/boarding/requirements?stayId=${params.id}`);
      return await res.json();
    },
    enabled: !!params.id && activeTab === "requirements"
  });
  
  // Fetch activities
  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ["/api/boarding/stays", params.id, "activities"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/boarding/activities?stayId=${params.id}`);
      return await res.json();
    },
    enabled: !!params.id && activeTab === "activities"
  });
  
  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/boarding/stays/${params.id}/check-in`, { checkInById: user?.id });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boarding/stays", params.id] });
      toast({
        title: "Success",
        description: "Pet successfully checked in"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to check in pet: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // Check-out mutation
  const checkOutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/boarding/stays/${params.id}/check-out`, { checkOutById: user?.id });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boarding/stays", params.id] });
      toast({
        title: "Success",
        description: "Pet successfully checked out"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to check out pet: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/boarding/stays/${params.id}/cancel`, { cancelledById: user?.id });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boarding/stays", params.id] });
      toast({
        title: "Success",
        description: "Boarding reservation cancelled"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to cancel reservation: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // Create medication mutation
  const createMedicationMutation = useMutation({
    mutationFn: async (data: z.infer<typeof medicationSchema>) => {
      const res = await apiRequest("POST", `/api/boarding/stays/${params.id}/medications`, {
        ...data,
        stayId: parseInt(params.id),
        practiceId
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boarding/stays", params.id, "medications"] });
      setMedicationDialogOpen(false);
      medicationForm.reset();
      toast({
        title: "Success",
        description: "Medication schedule added"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to add medication schedule: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // Create feeding mutation
  const createFeedingMutation = useMutation({
    mutationFn: async (data: z.infer<typeof feedingSchema>) => {
      const res = await apiRequest("POST", `/api/boarding/stays/${params.id}/feedings`, {
        ...data,
        stayId: parseInt(params.id),
        practiceId
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boarding/stays", params.id, "feedings"] });
      setFeedingDialogOpen(false);
      feedingForm.reset();
      toast({
        title: "Success",
        description: "Feeding schedule added"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to add feeding schedule: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // Create requirement mutation
  const createRequirementMutation = useMutation({
    mutationFn: async (data: z.infer<typeof requirementSchema>) => {
      const res = await apiRequest("POST", `/api/boarding/stays/${params.id}/requirements`, {
        ...data,
        stayId: parseInt(params.id),
        practiceId
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boarding/stays", params.id, "requirements"] });
      setRequirementDialogOpen(false);
      requirementForm.reset();
      toast({
        title: "Success",
        description: "Requirement added"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to add requirement: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // Create activity mutation
  const createActivityMutation = useMutation({
    mutationFn: async (data: z.infer<typeof activitySchema>) => {
      const res = await apiRequest("POST", `/api/boarding/stays/${params.id}/activities`, {
        ...data,
        stayId: parseInt(params.id),
        practiceId,
        performedById: user?.id,
        performedAt: new Date().toISOString()
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boarding/stays", params.id, "activities"] });
      setActivityDialogOpen(false);
      activityForm.reset();
      toast({
        title: "Success",
        description: "Activity logged"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to log activity: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // Complete requirement mutation
  const completeRequirementMutation = useMutation({
    mutationFn: async (requirementId: number) => {
      const res = await apiRequest("POST", `/api/boarding/requirements/${requirementId}/complete`, {
        completedById: user?.id
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boarding/stays", params.id, "requirements"] });
      toast({
        title: "Success",
        description: "Requirement marked as completed"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to complete requirement: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // Format date for display
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString || dateString === 'null' || dateString === 'undefined') return "N/A";
    try {
      return format(parseISO(dateString), "MMM d, yyyy");
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return "Invalid Date";
    }
  };
  
  // Format datetime for display
  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString || dateString === 'null' || dateString === 'undefined') return "N/A";
    try {
      return format(parseISO(dateString), "MMM d, yyyy h:mm a");
    } catch (error) {
      console.error('Error formatting datetime:', dateString, error);
      return "Invalid Date";
    }
  };
  
  // Handle check-in
  const handleCheckIn = () => {
    if (confirm("Confirm check-in for this pet?")) {
      checkInMutation.mutate();
    }
  };
  
  // Handle check-out
  const handleCheckOut = () => {
    if (confirm("Confirm check-out for this pet?")) {
      checkOutMutation.mutate();
    }
  };
  
  // Handle cancel
  const handleCancel = () => {
    if (confirm("Are you sure you want to cancel this boarding reservation?")) {
      cancelMutation.mutate();
    }
  };
  
  // Handle requirement completion
  const handleCompleteRequirement = (requirementId: number) => {
    completeRequirementMutation.mutate(requirementId);
  };
  
  // Calculate total duration and cost
  const calculateDuration = (start: string | null | undefined, end: string | null | undefined) => {
    // Debug logging
    console.log('calculateDuration called with:', { start, end, startType: typeof start, endType: typeof end });
    
    if (!start || !end || start === 'null' || end === 'null' || start === 'undefined' || end === 'undefined') {
      console.log('calculateDuration: Invalid date values, returning 0');
      return 0;
    }
    try {
      const result = differenceInDays(parseISO(end), parseISO(start)) + 1; // Include both start and end days
      console.log('calculateDuration result:', result);
      return result;
    } catch (error) {
      console.error('Error calculating duration:', { start, end }, error);
      return 0;
    }
  };
  
  const calculateTotalCost = (dailyRate: string | null | undefined, days: number) => {
    if (!dailyRate || dailyRate === 'null' || dailyRate === 'undefined') {
      return "0.00";
    }
    try {
      return (parseFloat(dailyRate) * days).toFixed(2);
    } catch (error) {
      console.error('Error calculating total cost:', { dailyRate, days }, error);
      return "0.00";
    }
  };

  // Use API data directly - no mock data needed
  const displayStay = stay;
  const displayMedications = medications || [];
  const displayFeedings = feedings || [];
  const displayRequirements = requirements || [];
  const displayActivities = activities || [];
  
  // Calculate duration and cost only if stay data is available
  // const stayDuration = displayStay && displayStay.startDate && displayStay.endDate 
  //   ? calculateDuration(displayStay.startDate, displayStay.endDate) 
  //   : 0;
  const stayDuration = 0; // Temporarily disabled to avoid errors
  const totalCost = displayStay?.dailyRate ? calculateTotalCost(displayStay.dailyRate, stayDuration) : "N/A";
  
  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    let variant = "outline";
    switch (status) {
      case "checked_in":
        variant = "default";
        break;
      case "checked_out":
        variant = "secondary";
        break;
      case "scheduled":
        variant = "outline";
        break;
      case "cancelled":
        variant = "destructive";
        break;
    }
    
    return (
      <Badge variant={variant as any} className="capitalize">
        {status.replace("_", " ")}
      </Badge>
    );
  };
  
  if (stayLoading) {
    return (
      <div className="container mx-auto py-6 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!displayStay) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center mb-6">
          <Link href="/admin/boarding">
            <Button variant="ghost" size="sm" className="mr-4">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Boarding
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="text-center py-8">
            <h2 className="text-xl font-semibold mb-2">Boarding Stay Not Found</h2>
            <p className="text-muted-foreground">The boarding stay you're looking for doesn't exist or has been removed.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Link href="/admin/boarding">
          <Button variant="ghost" size="sm" className="mr-4">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Boarding
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight flex items-center">
              <PawPrint className="h-6 w-6 mr-2" />
              {displayStay.pet.name} - Boarding Details
            </h1>
            <StatusBadge status={displayStay.status} />
          </div>
          <p className="text-muted-foreground mt-1">
            {formatDate(displayStay.startDate)} to {formatDate(displayStay.endDate)} ({stayDuration} days)
          </p>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-2 mb-6 justify-end">
        {displayStay.status === "scheduled" && (
          <>
            <Button variant="default" onClick={handleCheckIn}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Check In
            </Button>
            <Button variant="destructive" onClick={handleCancel}>
              <XCircle className="h-4 w-4 mr-2" />
              Cancel Reservation
            </Button>
          </>
        )}
        
        {displayStay.status === "checked_in" && (
          <Button variant="default" onClick={handleCheckOut}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Check Out
          </Button>
        )}
        
        {displayStay.status !== "cancelled" && displayStay.status !== "checked_out" && (
          <Link href={`/admin/boarding/boarding-stay/${params.id}/edit`}>
            <Button variant="outline">
              <FileEdit className="h-4 w-4 mr-2" />
              Edit Reservation
            </Button>
          </Link>
        )}
      </div>
      
      <Tabs defaultValue="overview" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">
            <Clipboard className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="medications">
            <Pill className="h-4 w-4 mr-2" />
            Medications
          </TabsTrigger>
          <TabsTrigger value="feeding">
            <Coffee className="h-4 w-4 mr-2" />
            Feeding
          </TabsTrigger>
          <TabsTrigger value="requirements">
            <ClipboardCheck className="h-4 w-4 mr-2" />
            Requirements
          </TabsTrigger>
          <TabsTrigger value="activities">
            <ClipboardList className="h-4 w-4 mr-2" />
            Activities
          </TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Boarding Details</CardTitle>
                  <CardDescription>General information about this boarding stay</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h3 className="font-medium text-sm text-muted-foreground">Stay Dates</h3>
                      <p>{formatDate(displayStay.startDate)} to {formatDate(displayStay.endDate)}</p>
                      <p className="text-sm mt-1">{stayDuration} days</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-sm text-muted-foreground">Kennel</h3>
                      <p>{displayStay.kennel.name}</p>
                      <p className="text-sm mt-1 capitalize">{displayStay.kennel.type.replace("_", " ")}, {displayStay.kennel.size}</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-sm text-muted-foreground">Daily Rate</h3>
                      <p>${displayStay.dailyRate}</p>
                      <p className="text-sm mt-1">Total: ${totalCost}</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-medium text-sm text-muted-foreground">Check-in</h3>
                      <p>{displayStay.checkInDate ? formatDateTime(displayStay.checkInDate) : "Not checked in yet"}</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-sm text-muted-foreground">Check-out</h3>
                      <p>{displayStay.checkOutDate ? formatDateTime(displayStay.checkOutDate) : "Not checked out yet"}</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">Special Instructions</h3>
                    <p className="whitespace-pre-line">{displayStay.specialInstructions || "No special instructions provided"}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">Notes</h3>
                    <p className="whitespace-pre-line">{displayStay.notes || "No notes available"}</p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="border rounded-md p-3 text-center">
                      <h3 className="font-medium mb-1">Medications</h3>
                      <Badge variant={displayStay.hasMedications ? "default" : "outline"}>
                        {displayStay.hasMedications ? "Required" : "None"}
                      </Badge>
                    </div>
                    <div className="border rounded-md p-3 text-center">
                      <h3 className="font-medium mb-1">Feeding Instructions</h3>
                      <Badge variant={displayStay.hasFeedingInstructions ? "default" : "outline"}>
                        {displayStay.hasFeedingInstructions ? "Required" : "None"}
                      </Badge>
                    </div>
                    <div className="border rounded-md p-3 text-center">
                      <h3 className="font-medium mb-1">Special Requirements</h3>
                      <Badge variant={displayStay.hasSpecialRequirements ? "default" : "outline"}>
                        {displayStay.hasSpecialRequirements ? "Required" : "None"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {(displayStay.status === "checked_in" || displayStay.status === "checked_out") && (
                <Card>
                  <CardHeader>
                    <CardTitle>Activity Summary</CardTitle>
                    <CardDescription>Recent activities and upcoming requirements</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                      <div>
                        <h3 className="font-medium mb-2">Recent Activities</h3>
                        {activitiesLoading ? (
                          <div className="animate-pulse h-24 bg-muted rounded-md"></div>
                        ) : displayActivities.length > 0 ? (
                          <ul className="space-y-2">
                            {displayActivities.slice(0, 3).map((activity: BoardingActivity) => (
                              <li key={activity.id} className="text-sm border-l-2 border-primary pl-3 py-1">
                                <div className="font-medium capitalize">{activity.type}</div>
                                <div className="text-muted-foreground">{formatDateTime(activity.performedAt)}</div>
                                {activity.notes && <div className="mt-1">{activity.notes}</div>}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-muted-foreground">No activities logged yet</p>
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium mb-2">Pending Requirements</h3>
                        {requirementsLoading ? (
                          <div className="animate-pulse h-24 bg-muted rounded-md"></div>
                        ) : displayRequirements.filter((r: BoardingRequirement) => !r.isCompleted).length > 0 ? (
                          <ul className="space-y-2">
                            {displayRequirements.filter((r: BoardingRequirement) => !r.isCompleted).map((req: BoardingRequirement) => (
                              <li key={req.id} className="text-sm border-l-2 border-destructive pl-3 py-1">
                                <div className="font-medium">{req.name}</div>
                                <div className="text-muted-foreground text-xs">{req.description}</div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-muted-foreground">No pending requirements</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            
            {/* Right Column */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Pet Information</CardTitle>
                  <CardDescription>Details about the boarding pet</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-medium text-sm text-muted-foreground">Name</h3>
                      <p className="font-medium text-lg">{displayStay.pet.name}</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-sm text-muted-foreground">Species / Breed</h3>
                      <p>{displayStay.pet.species}{displayStay.pet.breed ? ` / ${displayStay.pet.breed}` : ''}</p>
                    </div>
                    <Link href={`/clients/${displayStay.pet.ownerId}/pets/${displayStay.pet.id}`}>
                      <Button variant="outline" size="sm" className="w-full mt-2">
                        View Pet Profile
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Owner & Emergency Contact</CardTitle>
                  <CardDescription>Contact information</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-medium text-sm text-muted-foreground">Owner</h3>
                      <p>{displayStay.pet.owner.name}</p>
                      <p className="text-sm">{displayStay.pet.owner.email}</p>
                      <p className="text-sm">{displayStay.pet.owner.phone}</p>
                    </div>
                    <Separator />
                    <div>
                      <h3 className="font-medium text-sm text-muted-foreground">Emergency Contact</h3>
                      <p>{displayStay.emergencyContactName}</p>
                      <p className="text-sm">{displayStay.emergencyContactPhone}</p>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Link href={`/clients/${displayStay.pet.ownerId}`}>
                        <Button variant="outline" size="sm" className="w-full">
                          View Owner
                        </Button>
                      </Link>
                      <Button variant="outline" size="sm" className="w-full">
                        <Phone className="h-4 w-4 mr-2" />
                        Call
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        {/* Medications Tab */}
        <TabsContent value="medications">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Medication Schedule</CardTitle>
                <CardDescription>Track and manage medications for this boarding stay</CardDescription>
              </div>
              <Dialog open={medicationDialogOpen} onOpenChange={setMedicationDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Medication
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Medication</DialogTitle>
                    <DialogDescription>
                      Enter medication details for this boarding stay
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Form {...medicationForm}>
                    <form onSubmit={medicationForm.handleSubmit((data) => createMedicationMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={medicationForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Medication Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter medication name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={medicationForm.control}
                        name="instructions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Instructions</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter administration instructions" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={medicationForm.control}
                          name="frequency"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Frequency</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="daily">Once Daily</SelectItem>
                                  <SelectItem value="twice_daily">Twice Daily</SelectItem>
                                  <SelectItem value="three_times_daily">Three Times Daily</SelectItem>
                                  <SelectItem value="every_other_day">Every Other Day</SelectItem>
                                  <SelectItem value="weekly">Weekly</SelectItem>
                                  <SelectItem value="as_needed">As Needed</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={medicationForm.control}
                          name="schedule"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Schedule</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="morning">Morning</SelectItem>
                                  <SelectItem value="noon">Noon</SelectItem>
                                  <SelectItem value="evening">Evening</SelectItem>
                                  <SelectItem value="morning_evening">Morning & Evening</SelectItem>
                                  <SelectItem value="morning_noon_evening">Morning, Noon & Evening</SelectItem>
                                  <SelectItem value="with_food">With Food</SelectItem>
                                  <SelectItem value="as_needed">As Needed</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <DialogFooter>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setMedicationDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit"
                          disabled={createMedicationMutation.isPending}
                        >
                          {createMedicationMutation.isPending ? "Adding..." : "Add Medication"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {medicationsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : displayMedications.length === 0 ? (
                <div className="text-center py-8">
                  <h3 className="font-medium mb-2">No Medications Added</h3>
                  <p className="text-muted-foreground">Add medications for this boarding stay</p>
                </div>
              ) : (
                <div className="divide-y">
                  {displayMedications.map((med: MedicationSchedule) => (
                    <div key={med.id} className="py-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium text-lg">{med.name}</h3>
                          <p className="text-muted-foreground text-sm">
                            {med.frequency.replace("_", " ")} • {med.schedule.replace(/_/g, " ")}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm">
                            Log
                          </Button>
                          <Button variant="ghost" size="icon">
                            <SquarePen className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="mb-3">{med.instructions}</p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Last administered: </span>
                          {med.lastAdministeredAt ? formatDateTime(med.lastAdministeredAt) : "Not yet administered"}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Next due: </span>
                          {med.nextDueAt ? formatDateTime(med.nextDueAt) : "N/A"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Feeding Tab */}
        <TabsContent value="feeding">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Feeding Schedule</CardTitle>
                <CardDescription>Track and manage feeding for this boarding stay</CardDescription>
              </div>
              <Dialog open={feedingDialogOpen} onOpenChange={setFeedingDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Feeding Schedule
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Feeding Schedule</DialogTitle>
                    <DialogDescription>
                      Enter feeding details for this boarding stay
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Form {...feedingForm}>
                    <form onSubmit={feedingForm.handleSubmit((data) => createFeedingMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={feedingForm.control}
                        name="foodType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Food Type</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter food type" {...field} />
                            </FormControl>
                            <FormDescription>
                              Specify if owner provided or clinic food
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={feedingForm.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter amount (e.g., 1 cup)" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={feedingForm.control}
                          name="frequency"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Frequency</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="once_daily">Once Daily</SelectItem>
                                  <SelectItem value="twice_daily">Twice Daily</SelectItem>
                                  <SelectItem value="three_times_daily">Three Times Daily</SelectItem>
                                  <SelectItem value="custom">Custom</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={feedingForm.control}
                          name="schedule"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Schedule</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="morning">Morning</SelectItem>
                                  <SelectItem value="noon">Noon</SelectItem>
                                  <SelectItem value="evening">Evening</SelectItem>
                                  <SelectItem value="morning_evening">Morning & Evening</SelectItem>
                                  <SelectItem value="morning_noon_evening">Morning, Noon & Evening</SelectItem>
                                  <SelectItem value="custom">Custom</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={feedingForm.control}
                        name="specialInstructions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Special Instructions</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter any special feeding instructions" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <DialogFooter>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setFeedingDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit"
                          disabled={createFeedingMutation.isPending}
                        >
                          {createFeedingMutation.isPending ? "Adding..." : "Add Feeding Schedule"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {feedingsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : displayFeedings.length === 0 ? (
                <div className="text-center py-8">
                  <h3 className="font-medium mb-2">No Feeding Schedules Added</h3>
                  <p className="text-muted-foreground">Add feeding schedules for this boarding stay</p>
                </div>
              ) : (
                <div className="divide-y">
                  {displayFeedings.map((feeding: FeedingSchedule) => (
                    <div key={feeding.id} className="py-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium text-lg">{feeding.foodType}</h3>
                          <p className="text-muted-foreground text-sm">
                            {feeding.amount} • {feeding.frequency.replace(/_/g, " ")} • {feeding.schedule.replace(/_/g, " ")}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm">
                            Log Feeding
                          </Button>
                          <Button variant="ghost" size="icon">
                            <SquarePen className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {feeding.specialInstructions && (
                        <p className="mb-3">{feeding.specialInstructions}</p>
                      )}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Last fed: </span>
                          {feeding.lastFedAt ? formatDateTime(feeding.lastFedAt) : "Not yet fed"}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Next feeding: </span>
                          {feeding.nextFeedingAt ? formatDateTime(feeding.nextFeedingAt) : "N/A"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Requirements Tab */}
        <TabsContent value="requirements">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Requirements</CardTitle>
                <CardDescription>Special care requirements for this boarding stay</CardDescription>
              </div>
              <Dialog open={requirementDialogOpen} onOpenChange={setRequirementDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Requirement
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Requirement</DialogTitle>
                    <DialogDescription>
                      Enter care requirement details for this boarding stay
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Form {...requirementForm}>
                    <form onSubmit={requirementForm.handleSubmit((data) => createRequirementMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={requirementForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Requirement Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter requirement name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={requirementForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe the requirement in detail" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={requirementForm.control}
                        name="isRequired"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between">
                            <div className="space-y-0.5">
                              <FormLabel>Required</FormLabel>
                              <FormDescription>
                                Mark if this requirement is mandatory
                              </FormDescription>
                            </div>
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={field.onChange}
                                className="h-4 w-4 rounded border-gray-300"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <DialogFooter>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setRequirementDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit"
                          disabled={createRequirementMutation.isPending}
                        >
                          {createRequirementMutation.isPending ? "Adding..." : "Add Requirement"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {requirementsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : displayRequirements.length === 0 ? (
                <div className="text-center py-8">
                  <h3 className="font-medium mb-2">No Requirements Added</h3>
                  <p className="text-muted-foreground">Add care requirements for this boarding stay</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Incomplete Requirements */}
                  <div>
                    <h3 className="font-medium mb-3">Pending Requirements</h3>
                    {displayRequirements.filter((r: BoardingRequirement) => !r.isCompleted).length === 0 ? (
                      <p className="text-muted-foreground">No pending requirements</p>
                    ) : (
                      <div className="divide-y border rounded-md">
                        {displayRequirements
                          .filter((r: BoardingRequirement) => !r.isCompleted)
                          .map((req: BoardingRequirement) => (
                            <div key={req.id} className="p-4">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h3 className="font-medium">{req.name}</h3>
                                  {req.isRequired && (
                                    <Badge variant="outline" className="mt-1">Required</Badge>
                                  )}
                                </div>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleCompleteRequirement(req.id)}
                                  disabled={completeRequirementMutation.isPending}
                                >
                                  Mark Complete
                                </Button>
                              </div>
                              <p className="text-sm">{req.description}</p>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Completed Requirements */}
                  <div>
                    <h3 className="font-medium mb-3">Completed Requirements</h3>
                    {displayRequirements.filter((r: BoardingRequirement) => r.isCompleted).length === 0 ? (
                      <p className="text-muted-foreground">No completed requirements</p>
                    ) : (
                      <div className="divide-y border rounded-md">
                        {displayRequirements
                          .filter((r: BoardingRequirement) => r.isCompleted)
                          .map((req: BoardingRequirement) => (
                            <div key={req.id} className="p-4">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h3 className="font-medium">{req.name}</h3>
                                  {req.isRequired && (
                                    <Badge variant="outline" className="mt-1">Required</Badge>
                                  )}
                                </div>
                                <Badge variant="default">
                                  Completed {req.completedAt ? formatDate(req.completedAt) : ""}
                                </Badge>
                              </div>
                              <p className="text-sm">{req.description}</p>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Activities Tab */}
        <TabsContent value="activities">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Activity Log</CardTitle>
                <CardDescription>Track all activities during this boarding stay</CardDescription>
              </div>
              <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Log Activity
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Log Activity</DialogTitle>
                    <DialogDescription>
                      Record a new activity for this boarding stay
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Form {...activityForm}>
                    <form onSubmit={activityForm.handleSubmit((data) => createActivityMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={activityForm.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Activity Type</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="exercise">Exercise / Walk</SelectItem>
                                <SelectItem value="play">Play Time</SelectItem>
                                <SelectItem value="grooming">Grooming</SelectItem>
                                <SelectItem value="socialization">Socialization</SelectItem>
                                <SelectItem value="health_check">Health Check</SelectItem>
                                <SelectItem value="medication">Medication Given</SelectItem>
                                <SelectItem value="feeding">Feeding</SelectItem>
                                <SelectItem value="bathroom">Bathroom Break</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={activityForm.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter notes about this activity" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <DialogFooter>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setActivityDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit"
                          disabled={createActivityMutation.isPending}
                        >
                          {createActivityMutation.isPending ? "Logging..." : "Log Activity"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {activitiesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : displayActivities.length === 0 ? (
                <div className="text-center py-8">
                  <h3 className="font-medium mb-2">No Activities Logged</h3>
                  <p className="text-muted-foreground">Log activities for this boarding stay</p>
                </div>
              ) : (
                <div className="divide-y">
                  {displayActivities.map((activity: BoardingActivity) => (
                    <div key={activity.id} className="py-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium capitalize">{activity.type.replace("_", " ")}</h3>
                          <p className="text-muted-foreground text-sm">
                            {formatDateTime(activity.performedAt)}
                          </p>
                        </div>
                      </div>
                      {activity.notes && (
                        <p className="mt-1">{activity.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}