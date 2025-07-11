import React, { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { 
  insertTreatmentSchema, 
  Treatment,
  UserRole
} from "@/db/schema";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/context/UserContext";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { 
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Popover, PopoverContent, PopoverTrigger 
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarIcon, Loader2 } from "lucide-react";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle 
} from "@/components/ui/dialog";

interface TreatmentFormProps {
  soapNoteId: number;
  petId: number;
  isOpen: boolean;
  onClose: () => void;
  treatmentToEdit?: Treatment;
}

// Extend the treatment schema with validation
const treatmentFormSchema = insertTreatmentSchema.extend({
  name: z.string().min(1, "Name is required"),
  category: z.enum(["medication", "procedure", "surgery", "therapy", "diagnostic", "wellness", "other"], {
    required_error: "Please select a category",
  }),
  followUpDate: z.date().optional().nullable(),
});

type TreatmentFormValues = z.infer<typeof treatmentFormSchema>;

export function TreatmentForm({ 
  soapNoteId, 
  petId, 
  isOpen, 
  onClose, 
  treatmentToEdit 
}: TreatmentFormProps) {
  const { toast } = useToast();
  const { user, userPracticeId } = useUser();
  const [isEditing, setIsEditing] = useState(!!treatmentToEdit);

  const form = useForm<TreatmentFormValues>({
    resolver: zodResolver(treatmentFormSchema),
    defaultValues: {
      soapNoteId,
      petId,
      practiceId: userPracticeId || 0,
      practitionerId: user?.id || 0,
      name: "",
      category: "medication",
      description: "",
      status: "planned",
      startDate: new Date(),
      followUpNeeded: false,
      followUpDate: null,
      followUpNotes: "",
    }
  });

  const { data: inventoryItems, isLoading: isLoadingInventory } = useQuery({
    queryKey: ['/api/inventory', userPracticeId],
    queryFn: async () => {
      const response = await fetch(`/api/inventory?practiceId=${userPracticeId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch inventory items');
      }
      return response.json();
    },
    enabled: !!userPracticeId && form.watch("category") === "medication"
  });

  const createTreatment = useMutation({
    mutationFn: async (data: TreatmentFormValues) => {
      const response = await apiRequest('POST', '/api/treatments', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/treatments/soap-note', soapNoteId] });
      toast({
        title: "Treatment added",
        description: "The treatment has been successfully added.",
        variant: "default",
      });
      form.reset();
      onClose();
    },
    onError: (error) => {
      console.error('Error creating treatment:', error);
      toast({
        title: "Error",
        description: "Failed to add treatment. Please try again.",
        variant: "destructive",
      });
    }
  });

  const updateTreatment = useMutation({
    mutationFn: async (data: TreatmentFormValues & { id?: number }) => {
      const { id, ...updateData } = data;
      if (!id) throw new Error("Treatment ID is required for updates");
      
      const response = await apiRequest('PATCH', `/api/treatments/${id}`, updateData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/treatments/soap-note', soapNoteId] });
      toast({
        title: "Treatment updated",
        description: "The treatment has been successfully updated.",
        variant: "default",
      });
      form.reset();
      onClose();
    },
    onError: (error) => {
      console.error('Error updating treatment:', error);
      toast({
        title: "Error",
        description: "Failed to update treatment. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Initialize form with treatment data when editing
  useEffect(() => {
    if (treatmentToEdit) {
      setIsEditing(true);
      // Convert dates to Date objects
      const formValues = {
        ...treatmentToEdit,
        startDate: treatmentToEdit.startDate ? new Date(treatmentToEdit.startDate) : new Date(),
        followUpDate: treatmentToEdit.followUpDate ? new Date(treatmentToEdit.followUpDate) : null,
      };
      form.reset(formValues);
    } else {
      setIsEditing(false);
      form.reset({
        soapNoteId,
        petId,
        practiceId: userPracticeId || 0,
        practitionerId: user?.id || 0,
        name: "",
        category: "medication",
        description: "",
        status: "planned",
        startDate: new Date(),
        followUpNeeded: false,
        followUpDate: null,
        followUpNotes: "",
      });
    }
  }, [treatmentToEdit, soapNoteId, petId, user, form]);

  const onSubmit = (data: TreatmentFormValues) => {
    if (isEditing && treatmentToEdit) {
      updateTreatment.mutate({ ...data, id: treatmentToEdit.id });
    } else {
      createTreatment.mutate(data);
    }
  };

  const isPending = createTreatment.isPending || updateTreatment.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Treatment" : "Add New Treatment"}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update the details of this treatment."
              : "Record a new treatment, procedure, or medication."
            }
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Treatment Name*</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter treatment name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category*</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="medication">Medication</SelectItem>
                        <SelectItem value="procedure">Procedure</SelectItem>
                        <SelectItem value="surgery">Surgery</SelectItem>
                        <SelectItem value="therapy">Therapy</SelectItem>
                        <SelectItem value="diagnostic">Diagnostic</SelectItem>
                        <SelectItem value="wellness">Wellness</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status*</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="planned">Planned</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="discontinued">Discontinued</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter treatment description" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Conditional fields based on category */}
              {form.watch("category") === "medication" && (
                <>
                  <FormField
                    control={form.control}
                    name="inventoryItemId"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Medication</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))} 
                          value={field.value?.toString() || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select medication from inventory" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoadingInventory ? (
                              <div className="flex items-center justify-center p-2">
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                <span>Loading...</span>
                              </div>
                            ) : inventoryItems && inventoryItems.length > 0 ? (
                              inventoryItems
                                .filter((item: any) => item.type === "medication")
                                .map((item: any) => (
                                  <SelectItem key={item.id} value={item.id.toString()}>
                                    {item.name} ({item.quantity > 0 ? `${item.quantity} available` : "Out of stock"})
                                  </SelectItem>
                                ))
                            ) : (
                              <div className="p-2 text-center text-sm text-muted-foreground">
                                No medication items found in inventory
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Select medication from inventory or leave blank if not tracked
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="dosage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dosage</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 10mg, 5ml" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="route"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Administration Route</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select route" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="oral">Oral</SelectItem>
                            <SelectItem value="injectable">Injectable</SelectItem>
                            <SelectItem value="topical">Topical</SelectItem>
                            <SelectItem value="ophthalmic">Ophthalmic</SelectItem>
                            <SelectItem value="otic">Otic</SelectItem>
                            <SelectItem value="nasal">Nasal</SelectItem>
                            <SelectItem value="rectal">Rectal</SelectItem>
                            <SelectItem value="inhaled">Inhaled</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="frequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frequency</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="once">Once</SelectItem>
                            <SelectItem value="BID">BID (Twice daily)</SelectItem>
                            <SelectItem value="TID">TID (Three times daily)</SelectItem>
                            <SelectItem value="QID">QID (Four times daily)</SelectItem>
                            <SelectItem value="SID">SID (Once daily)</SelectItem>
                            <SelectItem value="PRN">PRN (As needed)</SelectItem>
                            <SelectItem value="EOD">EOD (Every other day)</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="biweekly">Biweekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Duration</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., 7 days, 2 weeks" 
                            {...field} 
                            value={field.value || ""} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            placeholder="1" 
                            {...field} 
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 1)}
                            value={field.value || 1} 
                          />
                        </FormControl>
                        <FormDescription>
                          Quantity of medication to dispense
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
              
              {form.watch("category") === "procedure" || form.watch("category") === "surgery" && (
                <>
                  <FormField
                    control={form.control}
                    name="procedureCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Procedure Code</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., CPT12345" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Body Location/Site</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Left forelimb" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
              
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Treatment Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter any additional notes" 
                        {...field} 
                        value={field.value || ""} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="outcome"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Outcome</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter treatment outcome" 
                        {...field} 
                        value={field.value || ""} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="followUpNeeded"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 col-span-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Follow-up Required</FormLabel>
                      <FormDescription>
                        Check if this treatment requires a follow-up
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              {form.watch("followUpNeeded") && (
                <>
                  <FormField
                    control={form.control}
                    name="followUpDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col col-span-2">
                        <FormLabel>Follow-up Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value || undefined}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="followUpNotes"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Follow-up Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter follow-up instructions" 
                            {...field} 
                            value={field.value || ""} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
              
              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        value={field.value || ""} 
                      />
                    </FormControl>
                    <FormDescription>Treatment cost in dollars</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="billed"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Billed to Client</FormLabel>
                      <FormDescription>
                        Mark if this treatment has been billed
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Update Treatment" : "Add Treatment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}