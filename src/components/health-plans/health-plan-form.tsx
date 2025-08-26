import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Pet } from "@/db/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Calendar, ListPlus } from "lucide-react";
import { addDays } from "date-fns";

// Form schema for creating health plans
const healthPlanFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  petId: z.coerce.number({ message: "Please select a pet" }),
  startDate: z.date({ message: "Start date is required" }),
  endDate: z.date({ message: "End date is required" }).optional().nullable(),
  notes: z.string().optional(),
});

type HealthPlanFormValues = z.infer<typeof healthPlanFormSchema>;

// Schema for creating milestones
const milestoneSchema = z.object({
  title: z.string().min(2, { message: "Title must be at least 2 characters" }),
  description: z.string().optional(),
  dueDate: z.date().optional().nullable(),
});

type MilestoneFormValues = z.infer<typeof milestoneSchema>;

interface HealthPlanFormProps {
  onSuccess?: () => void;
}

export function HealthPlanForm({ onSuccess }: HealthPlanFormProps) {
  const { user, userPracticeId} = useUser();
  const { toast } = useToast();
  const [milestones, setMilestones] = useState<MilestoneFormValues[]>([]);
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDescription, setMilestoneDescription] = useState("");
  const [milestoneDueDate, setMilestoneDueDate] = useState<string>("");

  // Fetch pets
  const { data: pets, isLoading: isPetsLoading } = useQuery<Pet[]>({
    queryKey: ["/api/pets"],
    queryFn: async () => {
      const response = await fetch('/api/pets');
      if (!response.ok) throw new Error('Failed to fetch pets');
      return response.json();
    },
    enabled: !!user,
  });

  // Initialize form
  const form = useForm<HealthPlanFormValues>({
    resolver: zodResolver(healthPlanFormSchema),
    defaultValues: {
      name: "",
      startDate: new Date(),
      endDate: addDays(new Date(), 365), // Default to 1 year
      notes: "",
    },
  });

  // Create health plan mutation
  const createHealthPlanMutation = useMutation({
    mutationFn: async (data: HealthPlanFormValues) => {
      // Convert dates to ISO strings
      const formattedData = {
        ...data,
        startDate: data.startDate.toISOString(),
        endDate: data.endDate ? data.endDate.toISOString() : null,
        practiceId: userPracticeId,
        createdById: user?.id,
      };
      
      const res = await apiRequest("POST", "/api/health-plans", formattedData);
      return await res.json();
    },
    onSuccess: async (healthPlan) => {
      // If there are milestones, create them
      if (milestones.length > 0) {
        const promises = milestones.map(milestone => {
          const milestoneData = {
            ...milestone,
            healthPlanId: healthPlan.id,
            dueDate: milestone.dueDate ? milestone.dueDate.toISOString() : null,
          };
          return apiRequest("POST", `/api/health-plans/${healthPlan.id}/milestones`, milestoneData);
        });
        
        await Promise.all(promises);
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/health-plans"] });
      toast({
        title: "Health plan created",
        description: "The health plan has been successfully created.",
      });
      
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create health plan",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Add milestone to list
  const addMilestone = () => {
    if (!milestoneTitle) {
      toast({
        title: "Missing information",
        description: "Milestone title is required.",
        variant: "destructive",
      });
      return;
    }
    
    const newMilestone: MilestoneFormValues = {
      title: milestoneTitle,
      description: milestoneDescription || undefined,
      dueDate: milestoneDueDate ? new Date(milestoneDueDate) : null,
    };
    
    setMilestones([...milestones, newMilestone]);
    setMilestoneTitle("");
    setMilestoneDescription("");
    setMilestoneDueDate("");
    
    toast({
      title: "Milestone added",
      description: "The milestone has been added to the health plan.",
    });
  };

  // Remove milestone from list
  const removeMilestone = (index: number) => {
    const updatedMilestones = [...milestones];
    updatedMilestones.splice(index, 1);
    setMilestones(updatedMilestones);
  };

  // Handle form submission
  const onSubmit = (data: HealthPlanFormValues) => {
    createHealthPlanMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Health Plan Name</FormLabel>
                <FormControl>
                  <Input placeholder="Annual Wellness Plan" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="petId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Patient</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(Number(value))}
                  defaultValue={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a patient" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {isPetsLoading ? (
                      <SelectItem value="loading" disabled>Loading patients...</SelectItem>
                    ) : pets && pets.length > 0 ? (
                      pets.map((pet) => (
                        <SelectItem key={pet.id} value={pet.id.toString()}>
                          {pet.name} ({pet.species})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>No patients available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      value={field.value ? new Date(field.value).toISOString().slice(0, 10) : ''}
                      onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      value={field.value ? new Date(field.value).toISOString().slice(0, 10) : ''}
                      onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Additional Notes</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Enter any additional notes or instructions..." 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="space-y-4 mt-6">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-slate-500" />
              <h3 className="text-lg font-medium">Milestones & Treatments</h3>
            </div>
            
            {/* Milestone list */}
            {milestones.length > 0 ? (
              <div className="border border-slate-200 rounded-md divide-y divide-slate-200">
                {milestones.map((milestone, index) => (
                  <div key={index} className="p-3 flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-slate-900">{milestone.title}</h4>
                      {milestone.description && (
                        <p className="text-sm text-slate-500 mt-1">{milestone.description}</p>
                      )}
                      {milestone.dueDate && (
                        <p className="text-xs text-slate-400 mt-2">
                          Due: {milestone.dueDate.toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => removeMilestone(index)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-4 border border-dashed border-slate-200 rounded-md">
                <p className="text-sm text-slate-500">No milestones added yet</p>
              </div>
            )}
            
            {/* Add milestone form */}
            <div className="border border-slate-200 rounded-md p-4">
              <h4 className="text-sm font-medium mb-3">Add New Milestone</h4>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="milestone-title">Title</Label>
                  <Input 
                    id="milestone-title" 
                    value={milestoneTitle}
                    onChange={(e) => setMilestoneTitle(e.target.value)}
                    placeholder="Vaccination"
                  />
                </div>
                
                <div>
                  <Label htmlFor="milestone-description">Description</Label>
                  <Textarea 
                    id="milestone-description" 
                    value={milestoneDescription}
                    onChange={(e) => setMilestoneDescription(e.target.value)}
                    placeholder="First dose of vaccine"
                    rows={2}
                  />
                </div>
                
                <div>
                  <Label htmlFor="milestone-date">Due Date</Label>
                  <Input 
                    id="milestone-date" 
                    type="date" 
                    value={milestoneDueDate}
                    onChange={(e) => setMilestoneDueDate(e.target.value)}
                  />
                </div>
                
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full"
                  onClick={addMilestone}
                >
                  <ListPlus className="h-4 w-4 mr-2" />
                  Add Milestone
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <Button 
              type="submit"
              disabled={createHealthPlanMutation.isPending}
            >
              {createHealthPlanMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : "Create Health Plan"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

// Trash icon component
function Trash(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  );
}

// Label component
function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium mb-1">
      {children}
    </label>
  );
}
