'use client';
import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { MedicationRoute, DosageFrequency } from "@/db/schema";
import { AlertCircle, CheckCircle, Info, Loader2, Pill } from "lucide-react";

// Form schema for prescription
const prescriptionFormSchema = z.object({
  inventoryItemId: z.coerce.number(),
  dosage: z.string().min(1, "Dosage is required"),
  route: z.string().min(1, "Route is required"),
  frequency: z.string().min(1, "Frequency is required"),
  duration: z.string().min(1, "Duration is required"),
  quantityPrescribed: z.string().min(1, "Quantity prescribed is required"),
  instructions: z.string().optional(),
  refills: z.coerce.number().optional(),
});

type PrescriptionFormValues = z.infer<typeof prescriptionFormSchema>;

interface PrescriptionFormProps {
  soapNoteId: number;
  practiceId: number;
  onPrescriptionCreated?: () => void;
  onCancel?: () => void;
}

export function PrescriptionForm({ soapNoteId, practiceId, onPrescriptionCreated, onCancel }: PrescriptionFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [drugInteractions, setDrugInteractions] = useState<any[]>([]);
  const [aiDrugInteractions, setAiDrugInteractions] = useState<any[]>([]);
  const [isCheckingInteractions, setIsCheckingInteractions] = useState(false);
  const [isCheckingAiInteractions, setIsCheckingAiInteractions] = useState(false);

  // Fetch inventory items that can be prescribed
  const { data: inventoryItems, isLoading: isLoadingInventory } = useQuery({
    queryKey: ['/api/inventory', { type: 'medication' }],
    queryFn: async () => {
      const response = await fetch(`/api/inventory?type=medication`);
      if (!response.ok) {
        throw new Error("Failed to fetch medications");
      }
      return response.json();
    }
  });
  
  // Fetch existing prescriptions for the current SOAP note (patient)
  const { data: existingPrescriptions } = useQuery({
    queryKey: ['/api/prescriptions', { soapNoteId }],
    queryFn: async () => {
      const response = await fetch(`/api/prescriptions?soapNoteId=${soapNoteId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch existing prescriptions");
      }
      return response.json();
    },
    enabled: !!soapNoteId
  });

  // Form definition
  const form = useForm<PrescriptionFormValues>({
    resolver: zodResolver(prescriptionFormSchema),
    defaultValues: {
      inventoryItemId: undefined,
      dosage: "",
      route: "",
      frequency: "",
      duration: "",
      quantityPrescribed: "",
      instructions: "",
      refills: 0,
    },
  });

  // Create prescription mutation
  const createPrescription = useMutation({
    mutationFn: async (data: PrescriptionFormValues) => {
      setIsSubmitting(true);
      try {
        const response = await fetch('/api/prescriptions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...data,
            soapNoteId,
            practiceId,
            status: "active"
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create prescription");
        }

        return await response.json();
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: () => {
      toast({
        title: "Prescription created",
        description: "The prescription has been created successfully",
      });
      // Invalidate SOAP note and prescriptions cache
      queryClient.invalidateQueries({ queryKey: ['/api/soap-notes', soapNoteId] });
      queryClient.invalidateQueries({ queryKey: ['/api/prescriptions'] });
      
      form.reset();
      
      if (onPrescriptionCreated) {
        onPrescriptionCreated();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating prescription",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Submit handler
  function onSubmit(data: PrescriptionFormValues) {
    createPrescription.mutate(data);
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Pill className="mr-2 h-5 w-5" />
          Add Prescription
        </CardTitle>
        <CardDescription>
          Prescribe medication for this patient
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="inventoryItemId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Medication</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      
                      // Reset previous interaction data
                      setDrugInteractions([]);
                      setAiDrugInteractions([]);
                      
                      // Check for drug interactions when a medication is selected
                      if (value && existingPrescriptions?.length > 0) {
                        setIsCheckingInteractions(true);
                        setIsCheckingAiInteractions(true);
                        
                        // Parse the selected medication ID
                        const selectedMedicationId = Number(value);
                        
                        if (isNaN(selectedMedicationId)) {
                          console.error('Invalid medication ID');
                          setIsCheckingInteractions(false);
                          setIsCheckingAiInteractions(false);
                          return;
                        }
                        
                        // Get currently prescribed medications for this patient
                        const currentMedicationIds = existingPrescriptions
                          .map((prescription: any) => prescription.inventoryItemId)
                          .filter((id: number) => id !== selectedMedicationId);

                        if (currentMedicationIds.length > 0) {
                          // Check for manual database interactions
                          fetch(`/api/medication-interactions/check?medicationId=${selectedMedicationId}&currentMeds=${currentMedicationIds.join(',')}`)
                            .then(response => response.json())
                            .then(data => {
                              setDrugInteractions(data.interactions || []);
                              setIsCheckingInteractions(false);
                            })
                            .catch(error => {
                              console.error('Error checking drug interactions:', error);
                              setIsCheckingInteractions(false);
                            });
                            
                          // Check for AI interactions
                          fetch(`/api/medication-interactions/ai-check?medicationId=${selectedMedicationId}&currentMeds=${currentMedicationIds.join(',')}`)
                            .then(response => response.json())
                            .then(data => {
                              setAiDrugInteractions(data.interactions || []);
                              setIsCheckingAiInteractions(false);
                            })
                            .catch(error => {
                              console.error('Error checking AI drug interactions:', error);
                              setIsCheckingAiInteractions(false);
                            });
                        } else {
                          setDrugInteractions([]);
                          setAiDrugInteractions([]);
                          setIsCheckingInteractions(false);
                          setIsCheckingAiInteractions(false);
                        }
                      }
                    }}
                    defaultValue={field.value?.toString()}
                    disabled={isLoadingInventory || isCheckingInteractions || isCheckingAiInteractions}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select medication" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingInventory ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Loading...
                        </div>
                      ) : inventoryItems?.length > 0 ? (
                        inventoryItems.map((item: any) => (
                          <SelectItem 
                            key={item.id} 
                            value={item.id.toString()}
                            disabled={item.quantity < 1}
                          >
                            {item.name} ({item.quantity > 0 ? `${item.quantity} ${item.unit || 'units'} available` : 'Out of stock'})
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-center text-muted-foreground">
                          No medications found
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {(isCheckingInteractions || isCheckingAiInteractions) && (
              <div className="flex items-center text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {isCheckingInteractions && isCheckingAiInteractions
                  ? "Checking for potential drug interactions..."
                  : isCheckingInteractions
                  ? "Checking database for known interactions..."
                  : "Consulting AI for potential interactions..."}
              </div>
            )}
            
            {drugInteractions.length > 0 && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Known Drug Interactions Detected</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-5 mt-2">
                    {drugInteractions.map((interaction: any, index: number) => (
                      <li key={index} className="mt-1">
                        <strong>{interaction.drug1Name}</strong> and <strong>{interaction.drug2Name}</strong>: {interaction.severity} - {interaction.description}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {aiDrugInteractions.length > 0 && (
              <Alert className="mt-2 border-amber-200 bg-amber-50 text-amber-900">
                <Info className="h-4 w-4" />
                <AlertTitle>AI-Suggested Potential Interactions</AlertTitle>
                <AlertDescription>
                  <div className="text-xs text-amber-700 mb-2">
                    These potential interactions are suggested by AI and may require veterinary verification.
                  </div>
                  <ul className="list-disc pl-5 mt-2">
                    {aiDrugInteractions.map((interaction, index) => (
                      <li key={`ai-${index}`} className="mt-1">
                        <strong>{interaction.drug1Name}</strong> and <strong>{interaction.drug2Name}</strong>:
                        <span className={`ml-1 font-medium ${
                          interaction.severity === 'critical' ? 'text-red-600' :
                          interaction.severity === 'high' ? 'text-red-500' :
                          interaction.severity === 'moderate' ? 'text-amber-600' : 'text-amber-500'
                        }`}>
                          {interaction.severity}
                        </span> - {interaction.description}
                        {interaction.recommendation && (
                          <div className="text-xs italic mt-1 ml-1">
                            Recommendation: {interaction.recommendation}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex justify-end">
                    <Button 
                      type="button" 
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Confirm with user first
                        if (window.confirm('Add selected AI-suggested interaction to the database?')) {
                          // Get selected medication ID and name
                          const formValues = form.getValues();
                          const inventoryId = formValues.inventoryItemId;
                          
                          if (!inventoryId) {
                            toast({
                              title: "Error",
                              description: "No medication selected",
                              variant: "destructive",
                            });
                            return;
                          }
                          
                          const selectedMedicationId = Number(inventoryId);
                          
                          if (isNaN(selectedMedicationId)) {
                            toast({
                              title: "Error",
                              description: "Invalid medication ID",
                              variant: "destructive",
                            });
                            return;
                          }
                          
                          // Use the first AI interaction as an example - in a real implementation, you'd want to let
                          // the user select which interaction(s) to save
                          const interaction = aiDrugInteractions[0];
                          
                          // Find medication name from inventory items
                          const selectedItem = inventoryItems?.find((item: any) => item.id === selectedMedicationId);
                          
                          if (!selectedItem) {
                            toast({
                              title: "Error",
                              description: "Selected medication not found in inventory",
                              variant: "destructive",
                            });
                            return;
                          }
                          
                          // Determine which drug is the selected one
                          const drug1Id = selectedMedicationId;
                          const selectedMedName = selectedItem.name;
                          
                          // Find the other drug name based on the interaction
                          const otherDrugName = interaction.drug1Name === selectedMedName
                            ? interaction.drug2Name
                            : interaction.drug1Name;
                            
                          // Find the ID of the other drug from existing prescriptions
                          const otherPrescription = existingPrescriptions?.find(
                            (p: any) => inventoryItems?.find((i: any) => i.id === p.inventoryItemId)?.name === otherDrugName
                          );
                          
                          if (!otherPrescription) {
                            toast({
                              title: "Error",
                              description: "Could not determine the other medication ID",
                              variant: "destructive",
                            });
                            return;
                          }
                          
                          const drug2Id = otherPrescription.inventoryItemId;
                          
                          // Save to database
                          fetch('/api/medication-interactions/save-ai-interaction', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              drug1Id,
                              drug2Id,
                              drug1Name: interaction.drug1Name,
                              drug2Name: interaction.drug2Name,
                              severity: interaction.severity,
                              description: interaction.description,
                              recommendation: interaction.recommendation,
                            }),
                          })
                          .then(response => response.json())
                          .then(data => {
                            if (data.error) {
                              toast({
                                title: "Error",
                                description: data.error,
                                variant: "destructive",
                              });
                            } else {
                              toast({
                                title: "Success",
                                description: "AI-suggested interaction saved to database",
                              });
                              
                              // Refresh drug interactions
                              fetch(`/api/medication-interactions/check?medicationId=${selectedMedicationId}&currentMeds=${drug2Id}`)
                                .then(response => response.json())
                                .then(data => {
                                  setDrugInteractions(data.interactions || []);
                                  
                                  // Remove the saved interaction from AI suggestions
                                  setAiDrugInteractions(prev => 
                                    prev.filter(i => 
                                      !(i.drug1Name === interaction.drug1Name && 
                                        i.drug2Name === interaction.drug2Name)
                                    )
                                  );
                                });
                            }
                          })
                          .catch(error => {
                            toast({
                              title: "Error",
                              description: "Failed to save interaction",
                              variant: "destructive",
                            });
                          });
                        }
                      }}
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1" />
                      Add to known interactions
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dosage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dosage</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 10mg" {...field} />
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
                    <FormLabel>Route</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select route" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(MedicationRoute).map((route) => (
                          <SelectItem key={route} value={route}>
                            {route}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(DosageFrequency).map((frequency) => (
                          <SelectItem key={frequency} value={frequency}>
                            {frequency}
                          </SelectItem>
                        ))}
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
                  <FormItem>
                    <FormLabel>Duration</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 7 days" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantityPrescribed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 30" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="refills"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Refills</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instructions</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Special instructions for the patient" 
                      className="resize-none" 
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Prescription
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}