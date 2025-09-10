'use client';
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/context/UserContext";
import { format, parseISO, compareDesc, safeParse } from "@/lib/date-utils";
import { Calendar as CalendarIcon, Check, ChevronLeft, ChevronRight, Filter, Search, Stethoscope, Clipboard, CalendarCheck, Pill, HeartPulse, Pen, AlertTriangle, Clock, Video } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { } from "@/db/schema";
import { isVeterinarian, isTechnician, isPracticeAdministrator } from '@/lib/rbac-helpers';
import { Pet } from "@/db/schemas/petsSchema";

// Define types for the timeline items
export type TimelineItemType = 
  | "appointment" 
  | "telemedicine"
  | "soap_note" 
  | "prescription" 
  | "health_plan" 
  | "health_plan_milestone" 
  | "checklist"
  | "checklist_item";

export interface TimelineItem {
  id: number;
  type: TimelineItemType;
  title: string;
  description: string;
  date: string;
  status: string;
  petId: number;
  petName?: string;
  metadata?: any;
}

export default function PatientTimelinePage() {
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
  const [selectedEventTypes, setSelectedEventTypes] = useState<TimelineItemType[]>([
    "appointment", "telemedicine", "soap_note", "prescription", "health_plan", "health_plan_milestone", "checklist", "checklist_item"
  ]);
  const [timelineView, setTimelineView] = useState<"all" | "completed" | "pending">("all");
  const [dateRangeStart, setDateRangeStart] = useState<Date | null>(null);
  const [dateRangeEnd, setDateRangeEnd] = useState<Date | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [groupByDate, setGroupByDate] = useState(true);
  const [petSelectorOpen, setPetSelectorOpen] = useState(false);

  // Get the petId from URL query params if available
  const searchParams = new URLSearchParams(window.location.search);
  const petIdFromUrl = searchParams.get("petId");

  // When the component mounts, if petId is in URL, set the selected pet
  useState(() => {
    if (petIdFromUrl) {
      setSelectedPetId(Number(petIdFromUrl));
    }
  });

  // Check permissions
  const isPractitioner = isVeterinarian(user as any) || isTechnician(user as any) || isPracticeAdministrator(user as any);
  
  if (!isPractitioner) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">
              You don't have permission to access the patient timeline. This feature is available to veterinarians, technicians, and administrators.
            </p>
            <Button className="mt-4" onClick={() => router.push("/")}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get practice ID based on user type
  const practiceId = useMemo(() => {
    if (!user) return null;
    
    // For practice users (CLIENT, PRACTICE_ADMINISTRATOR, VETERINARIAN, PRACTICE_MANAGER)
    if ('practiceId' in user) {
      return user.practiceId;
    }
    
    // For administrators and super admins
    if ('currentPracticeId' in user) {
      return user.currentPracticeId;
    }
    
    return null;
  }, [user]);

  // Fetch all pets
  const { data: pets, isLoading: isPetsLoading } = useQuery<Pet[]>({
    queryKey: ["/api/pets", practiceId],
    enabled: !!practiceId,
    queryFn: async () => {
      if (!practiceId) {
        throw new Error('No practice ID available');
      }
      
      const response = await fetch(`/api/pets?practiceId=${practiceId}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error fetching pets: ${response.status} ${response.statusText} - ${errorText}`);
        throw new Error(`Failed to fetch pets: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`Fetched ${data.length} pets for practice ${practiceId}`);
      return data;
    }
  });

  // Fetch timeline data for the selected pet
  const { data: timelineData, isLoading: isTimelineLoading, error: timelineError } = useQuery<TimelineItem[]>({
    queryKey: ["/api/pets", selectedPetId, "timeline"],
    enabled: !!selectedPetId,
    queryFn: async ({ queryKey }) => {
      const petId = queryKey[1];
      console.log(`Fetching timeline data for pet ${petId}...`);
      
      try {
        // First, try to fetch regular pet timeline data
        const response = await fetch(`/api/pets/${petId}/timeline`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Error fetching timeline data: ${response.status} ${response.statusText} - ${errorText}`);
          throw new Error(`Failed to fetch timeline data: ${response.status} ${response.statusText}`);
        }
        
        const data: TimelineItem[] = await response.json();
        console.log(`Timeline data fetched for pet ${petId}: ${data.length} items`);
        
        // Debug: Log some sample dates to understand their format
        if (data.length > 0) {
          console.log('Sample timeline item dates:', data.slice(0, 3).map(item => ({
            id: item.id,
            type: item.type,
            date: item.date,
            dateType: typeof item.date
          })));
        }
        
        // Check if telemedicine data is present
        const hasTelemedEvents = data.some((item: TimelineItem) => item.type === "telemedicine");
        if (!hasTelemedEvents) {
          console.log("No telemedicine events found in the regular timeline data");
          console.log("Will query for virtual appointments separately");
          
          // Make a query to get any telemedicine appointments that might be missing
          try {
            // For debugging, let's query for any virtual appointments for this pet
            // Use forTimeline=true to get all historical virtual appointments too
            const virtualApptsResponse = await fetch(`/api/appointments/virtual?petId=${petId}&forTimeline=true`, {
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              }
            });
            
            if (virtualApptsResponse.ok) {
              const virtualAppts: any[] = await virtualApptsResponse.json();
              console.log(`Found ${virtualAppts.length} virtual appointments for pet ${petId}:`, virtualAppts);
              
              // If found, transform virtual appointments into timeline items and add them
              const telemedEvents: TimelineItem[] = virtualAppts.map((appt: any) => ({
                id: appt.id,
                type: "telemedicine",
                title: appt.title || "Virtual Consultation",
                description: `Virtual appointment with ${appt.practitionerId ? `Dr. ${appt.practitionerId}` : 'a provider'}`,
                date: appt.date,
                status: appt.status,
                petId: appt.petId,
                petName: data[0]?.petName || "Unknown",
                metadata: {
                  practitionerId: appt.practitionerId,
                  duration: appt.duration,
                  notes: appt.notes,
                  summary: appt.summary
                }
              }));
              
              console.log(`Adding ${telemedEvents.length} telemedicine events to the timeline data`);
              return [...data, ...telemedEvents];
            }
          } catch (virtualError) {
            console.error("Error fetching virtual appointments:", virtualError);
            // Don't fail the main timeline if this supplementary query fails
          }
        }
        
        return data;
      } catch (error) {
        console.error("Timeline data fetch error:", error);
        throw error;
      }
    },
  });

  // Get the selected pet details
  const selectedPet = useMemo(() => {
    if (!pets || !selectedPetId) return null;
    return pets.find((pet: Pet) => Number(pet.id) === selectedPetId);
  }, [pets, selectedPetId]);

  // Helper function to parse dates more robustly
  const parseTimelineDate = (dateValue: any): Date | null => {
    if (!dateValue) return null;
    
    // If it's already a Date object
    if (dateValue instanceof Date) {
      return isNaN(dateValue.getTime()) ? null : dateValue;
    }
    
    // If it's a number (timestamp)
    if (typeof dateValue === 'number') {
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? null : date;
    }
    
    // If it's a string, use safeParse
    if (typeof dateValue === 'string') {
      return safeParse(dateValue);
    }
    
    return null;
  };

  // Filter and sort timeline items
  const filteredTimelineItems = useMemo(() => {
    if (!timelineData) return [];
    
    let items = [...timelineData];
    
    console.log(`Filtering ${items.length} timeline items`);
    
    // Debug telemedicine items
    const telemedicineItems = items.filter(item => item.type === "telemedicine");
    if (telemedicineItems.length > 0) {
      console.log(`Found ${telemedicineItems.length} telemedicine items:`, telemedicineItems);
    } else {
      console.log(`No telemedicine items found in the timeline data`);
    }
    
    // Filter by event types
    items = items.filter(item => selectedEventTypes.includes(item.type));
    
    // Filter by status
    if (timelineView === "completed") {
      items = items.filter(item => 
        item.status === "completed" || 
        item.status === "fulfilled" || 
        item.status === "locked"
      );
    } else if (timelineView === "pending") {
      items = items.filter(item => 
        item.status === "scheduled" || 
        item.status === "active" || 
        item.status === "pending"
      );
    }
    
    // Filter by date range
    if (dateRangeStart) {
      console.log(`Filtering by start date: ${dateRangeStart}`);
      // Create a new date object to avoid modifying the original
      const startDateNoTime = new Date(dateRangeStart);
      startDateNoTime.setHours(0, 0, 0, 0);
      
      items = items.filter(item => {
        const parsedDate = parseTimelineDate(item.date);
        if (!parsedDate) {
          console.warn(`Invalid date encountered: ${item.date}`);
          return false; // Filter out items with invalid dates
        }
        console.log(`Item date: ${parsedDate}, comparing with start date: ${startDateNoTime}, result: ${parsedDate >= startDateNoTime}`);
        return parsedDate >= startDateNoTime;
      });
    }
    if (dateRangeEnd) {
      console.log(`Filtering by end date: ${dateRangeEnd}`);
      const endDate = new Date(dateRangeEnd);
      endDate.setHours(23, 59, 59, 999);
      
      items = items.filter(item => {
        const parsedDate = parseTimelineDate(item.date);
        if (!parsedDate) {
          console.warn(`Invalid date encountered: ${item.date}`);
          return false; // Filter out items with invalid dates
        }
        console.log(`Item date: ${parsedDate}, comparing with end date: ${endDate}, result: ${parsedDate <= endDate}`);
        return parsedDate <= endDate;
      });
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => 
        item.title.toLowerCase().includes(query) || 
        item.description.toLowerCase().includes(query)
      );
    }
    
    // Sort by date, most recent first
    items.sort((a, b) => {
      const dateA = parseTimelineDate(a.date);
      const dateB = parseTimelineDate(b.date);
      
      // Handle case where one or both dates are invalid
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1; // Invalid dates go to the end
      if (!dateB) return -1;
      
      return compareDesc(dateA, dateB);
    });
    
    return items;
  }, [timelineData, selectedEventTypes, timelineView, dateRangeStart, dateRangeEnd, searchQuery]);

  // Group timeline items by date
  const groupedTimelineItems = useMemo(() => {
    if (!filteredTimelineItems || !groupByDate) return null;
    
    const groups: Record<string, TimelineItem[]> = {};
    
    filteredTimelineItems.forEach(item => {
      const parsedDate = parseTimelineDate(item.date);
      
      // Skip items with invalid dates
      if (!parsedDate) {
        console.warn(`Invalid date encountered in grouping: ${item.date}`);
        return;
      }
      
      const dateStr = format(parsedDate, 'yyyy-MM-dd');
      
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      
      groups[dateStr].push(item);
    });
    
    return groups;
  }, [filteredTimelineItems, groupByDate]);

  // Functions to toggle event type filters
  const toggleEventType = (type: TimelineItemType) => {
    if (selectedEventTypes.includes(type)) {
      setSelectedEventTypes(selectedEventTypes.filter(t => t !== type));
    } else {
      setSelectedEventTypes([...selectedEventTypes, type]);
    }
  };

  // Reset filters
  const resetFilters = () => {
    setSelectedEventTypes(["appointment", "telemedicine", "soap_note", "prescription", "health_plan", "health_plan_milestone", "checklist", "checklist_item"]);
    setTimelineView("all");
    setDateRangeStart(null);
    setDateRangeEnd(null);
    setSearchQuery("");
  };

  // Helper to get an icon for the timeline item type
  const getTimelineItemIcon = (type: TimelineItemType) => {
    switch (type) {
      case "appointment":
        return <CalendarIcon className="h-4 w-4" />;
      case "telemedicine":
        return <Video className="h-4 w-4" />;
      case "soap_note":
        return <Pen className="h-4 w-4" />;
      case "prescription":
        return <Pill className="h-4 w-4" />;
      case "health_plan":
        return <HeartPulse className="h-4 w-4" />;
      case "health_plan_milestone":
        return <Check className="h-4 w-4" />;
      case "checklist":
        return <Clipboard className="h-4 w-4" />;
      case "checklist_item":
        return <CalendarCheck className="h-4 w-4" />;
      default:
        return <CalendarIcon className="h-4 w-4" />;
    }
  };

  // Helper to get a label for the timeline item type
  const getTimelineItemTypeLabel = (type: TimelineItemType) => {
    switch (type) {
      case "appointment":
        return "Appointment";
      case "telemedicine":
        return "Telemedicine";
      case "soap_note":
        return "SOAP Note";
      case "prescription":
        return "Prescription";
      case "health_plan":
        return "Health Plan";
      case "health_plan_milestone":
        return "Health Plan Milestone";
      case "checklist":
        return "Checklist";
      case "checklist_item":
        return "Checklist Item";
      default:
        return type;
    }
  };

  // Helper to get a color for the timeline item status
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "fulfilled":
      case "locked":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
      case "active":
      case "scheduled":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "overdue":
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Render individual timeline item
  const renderTimelineItem = (item: TimelineItem) => {
    return (
      <Card key={`${item.type}-${item.id}`} className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-slate-100">
                {getTimelineItemIcon(item.type)}
              </div>
              <div>
                <CardTitle className="text-base">{item.title}</CardTitle>
                <CardDescription>
                  {getTimelineItemTypeLabel(item.type)} • {
                    (() => {
                      const parsedDate = parseTimelineDate(item.date);
                      return parsedDate ? format(parsedDate, 'PPp') : 'Date unavailable';
                    })()
                  }
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className={`${getStatusColor(item.status)}`}>
              {item.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">{item.description}</p>
          
          {/* Render additional metadata based on item type */}
          {item.metadata && (
            <div className="mt-4 text-sm">
              {item.type === "prescription" && (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1">
                    <Pill className="h-3 w-3" />
                    <span className="text-slate-500">Medication:</span>
                    <span className="font-medium">{item.metadata.medication}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span className="text-slate-500">Dosage:</span>
                    <span className="font-medium">{item.metadata.dosage}</span>
                  </div>
                </div>
              )}
              
              {item.type === "appointment" && (
                <div className="text-sm text-slate-500 mt-2">
                  {item.metadata.notes && (
                    <div className="mt-2">
                      <span className="font-medium">Notes: </span>
                      {item.metadata.notes}
                    </div>
                  )}
                </div>
              )}
              
              {item.type === "telemedicine" && (
                <div className="text-sm text-slate-500 mt-2">
                  <div className="flex items-center gap-1 text-blue-600">
                    <Video className="h-3 w-3" />
                    <span className="font-medium">Virtual Consultation</span>
                  </div>
                  {item.metadata?.duration && (
                    <div className="mt-1">
                      <span className="font-medium">Duration: </span>
                      {Math.floor(item.metadata.duration / 60)} minutes
                    </div>
                  )}
                  {item.metadata?.notes && (
                    <div className="mt-2">
                      <span className="font-medium">Notes: </span>
                      {item.metadata.notes}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <div className="flex justify-between w-full">
            <Button variant="outline" size="sm" 
              onClick={() => {
                // Navigate to the detailed view based on item type
                switch (item.type) {
                  case "appointment":
                    router.push(`/appointments/${item.id}`);
                    break;
                  case "telemedicine":
                    router.push(`/telemedicine/${item.id}`);
                    break;
                  case "soap_note":
                    router.push(`/soap-notes?noteId=${item.id}`);
                    break;
                  case "prescription":
                    router.push(`/soap-notes?noteId=${item.metadata?.soapNoteId}`);
                    break;
                  case "health_plan":
                    router.push(`/health-plans?planId=${item.id}`);
                    break;
                  case "checklist":
                  case "checklist_item":
                    router.push(`/checklists?checklistId=${item.type === "checklist" ? item.id : item.metadata?.checklistId}`);
                    break;
                  default:
                    break;
                }
              }}
            >
              View Details
            </Button>
            <span className="text-xs text-slate-500">ID: {item.id}</span>
          </div>
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0 mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Patient Timeline</h1>
          <p className="text-muted-foreground">
            Comprehensive chronological view of patient events and activities
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Popover open={petSelectorOpen} onOpenChange={setPetSelectorOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={petSelectorOpen}
                className="w-[250px] justify-between"
              >
                {selectedPetId ? (
                  (() => {
                    const selectedPet = pets?.find(pet => Number(pet.id) === selectedPetId);
                    return selectedPet ? `${selectedPet.name} (${selectedPet.species})` : "Select a patient";
                  })()
                ) : "Select a patient"}
                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-0">
              <Command>
                <CommandInput placeholder="Search patients..." />
                <CommandList>
                  <CommandEmpty>
                    {isPetsLoading ? "Loading pets..." : "No pets found."}
                  </CommandEmpty>
                  <CommandGroup>
                    {pets && pets.map((pet: Pet) => (
                      <CommandItem
                        key={pet.id}
                        value={`${pet.name} ${pet.species} ${pet.breed || ''}`}
                        onSelect={() => {
                          setSelectedPetId(Number(pet.id));
                          setPetSelectorOpen(false);
                        }}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{pet.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {pet.species} {pet.breed ? `• ${pet.breed}` : ''}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {selectedPet && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                {selectedPet.photoPath ? (
                  <AvatarImage src={selectedPet.photoPath} alt={selectedPet.name} />
                ) : (
                  <AvatarFallback className="text-lg bg-primary-100 text-primary-800">
                    {selectedPet.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              
              <div>
                <h2 className="text-2xl font-bold">{selectedPet.name}</h2>
                <div className="flex items-center gap-2 text-slate-500">
                  <span>{selectedPet.species}</span>
                  {selectedPet.breed && (
                    <>
                      <span>•</span>
                      <span>{selectedPet.breed}</span>
                    </>
                  )}
                  {selectedPet.dateOfBirth && (
                    <>
                      <span>•</span>
                      <span>Born: {
                        (() => {
                          const parsedDate = parseTimelineDate(selectedPet.dateOfBirth);
                          return parsedDate ? format(parsedDate, 'MMM dd, yyyy') : 'Date unavailable';
                        })()
                      }</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Filters Collapsible */}
      <Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen} className="mb-6">
        <CollapsibleContent>
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-sm font-medium mb-3">Event Types</h3>
                  <div className="space-y-2">
                    {(["appointment", "telemedicine", "soap_note", "prescription", "health_plan", "health_plan_milestone", "checklist", "checklist_item"] as TimelineItemType[]).map(type => (
                      <div key={type} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`event-type-${type}`}
                          checked={selectedEventTypes.includes(type)}
                          onChange={() => toggleEventType(type)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <label htmlFor={`event-type-${type}`} className="flex items-center gap-1.5 text-sm">
                          {getTimelineItemIcon(type)}
                          {getTimelineItemTypeLabel(type)}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-3">Status Filter</h3>
                  <div className="space-y-2">
                    <Tabs value={timelineView} onValueChange={(value) => setTimelineView(value as any)}>
                      <TabsList className="w-full">
                        <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
                        <TabsTrigger value="completed" className="flex-1">Completed</TabsTrigger>
                        <TabsTrigger value="pending" className="flex-1">Pending</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  
                  <h3 className="text-sm font-medium mb-3 mt-6">Date Range</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="justify-start text-left font-normal w-full">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRangeStart ? format(dateRangeStart, 'PP') : "Start date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dateRangeStart as Date}
                          onSelect={(date) => setDateRangeStart(date || null)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="justify-start text-left font-normal w-full">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRangeEnd ? format(dateRangeEnd, 'PP') : "End date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dateRangeEnd as Date}
                          onSelect={(date) => setDateRangeEnd(date || null)}
                          initialFocus
                          disabled={(date) => dateRangeStart ? date < dateRangeStart : false}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-3">Search & View Options</h3>
                  <div className="relative mb-4">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                      type="search"
                      placeholder="Search timeline..."
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-4">
                    <Switch
                      id="group-by-date"
                      checked={groupByDate}
                      onCheckedChange={setGroupByDate}
                    />
                    <Label htmlFor="group-by-date">Group by date</Label>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="w-full mt-4" 
                    onClick={resetFilters}
                  >
                    Reset Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Timeline Content */}
      <div className="mt-6">
        {!selectedPetId ? (
          <Card>
            <CardContent className="py-10 text-center">
              <Stethoscope className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium">Select a Patient</h3>
              <p className="text-muted-foreground mt-2 mb-4">
                Choose a pet from the dropdown above to view their timeline
              </p>
            </CardContent>
          </Card>
        ) : isTimelineLoading ? (
          <div className="space-y-4">
            {Array(5).fill(0).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div>
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-32 mt-1" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-24" />
                  </div>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mt-2" />
                  <Skeleton className="h-4 w-3/4 mt-2" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-9 w-28" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : filteredTimelineItems.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-xl font-medium">No Events Found</h3>
              <p className="text-muted-foreground mt-2">
                No timeline events match your current filters
              </p>
              <Button onClick={resetFilters} className="mt-4">
                Reset Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {groupByDate && groupedTimelineItems ? (
              Object.keys(groupedTimelineItems)
                .sort((a, b) => {
                  const dateA = parseTimelineDate(a);
                  const dateB = parseTimelineDate(b);
                  
                  // Handle case where one or both dates are invalid
                  if (!dateA && !dateB) return 0;
                  if (!dateA) return 1; // Invalid dates go to the end
                  if (!dateB) return -1;
                  
                  return compareDesc(dateA, dateB);
                })
                .map(dateStr => (
                  <div key={dateStr}>
                    <div className="relative flex items-center py-2 mb-4">
                      <div className="flex-grow border-t border-gray-200"></div>
                      <span className="flex-shrink mx-4 text-gray-600 text-sm font-medium">
                        {
                          (() => {
                            const parsedDate = parseTimelineDate(dateStr);
                            return parsedDate ? format(parsedDate, 'MMMM d, yyyy') : 'Date unavailable';
                          })()
                        }
                      </span>
                      <div className="flex-grow border-t border-gray-200"></div>
                    </div>
                    
                    <div className="space-y-4">
                      {groupedTimelineItems[dateStr].map(item => renderTimelineItem(item))}
                    </div>
                  </div>
                ))
            ) : (
              <div className="space-y-4">
                {filteredTimelineItems.map(item => renderTimelineItem(item))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}