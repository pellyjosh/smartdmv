"use client";
import React from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/context/UserContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Loader2 } from "lucide-react";

// Schema for prescription form
const prescriptionFormSchema = z.object({
  soapNoteId: z.number().optional(),
  petId: z.string().min(1, "Pet is required"),
  practiceId: z.string().min(1, "Practice is required"),
  prescribedBy: z.string().min(1, "Prescriber is required"),
  medicationName: z.string().min(1, "Medication name is required"),
  dosage: z.string().min(1, "Dosage is required"),
  route: z.enum(["oral", "injectable", "topical", "ophthalmic", "otic", "nasal", "rectal", "inhaled", "other"]),
  frequency: z.enum(["once", "BID", "TID", "QID", "SID", "PRN", "EOD", "weekly", "biweekly", "monthly", "other"]),
  duration: z.string().min(1, "Duration is required"),
  instructions: z.string().optional(),
  quantityPrescribed: z.number().min(1, "Quantity must be at least 1"),
  refills: z.number().default(0),
  status: z.enum(["active", "dispensed", "completed", "cancelled"]),
});

type PrescriptionFormData = z.infer<typeof prescriptionFormSchema>;

export default function EditPrescriptionPage() {
  const router = useRouter();
  const { id } = useParams();
  const prescriptionId = Array.isArray(id) ? parseInt(id[0]) : parseInt(id as string);
  const { toast } = useToast();
  const { user, userPracticeId } = useUser();

  // Fetch existing prescription
  const { data: prescription, isLoading: isPrescriptionLoading } = useQuery({
    queryKey: ["prescription", prescriptionId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/prescriptions`);
      const allPrescriptions = await response.json();
      return allPrescriptions.find((p: any) => p.id === prescriptionId);
    },
    enabled: !!prescriptionId,
  });

  // Fetch pet data for display
  const { data: pet, isLoading: isPetLoading } = useQuery({
    queryKey: ["pet", prescription?.petId],
    queryFn: async () => {
      if (!prescription?.petId) return null;
      const response = await apiRequest("GET", `/api/pets/${prescription.petId}`);
      return await response.json();
    },
    enabled: !!prescription?.petId,
  });

  const form = useForm<PrescriptionFormData>({
    resolver: zodResolver(prescriptionFormSchema),
    defaultValues: {
      petId: "",
      practiceId: userPracticeId || "",
      prescribedBy: user?.id || "",
      medicationName: "",
      dosage: "",
      route: "oral",
      frequency: "once",
      duration: "",
      instructions: "",
      quantityPrescribed: 1,
      refills: 0,
      status: "active",
    },
  });

  // Set form values when prescription data is loaded
  React.useEffect(() => {
    if (prescription) {
      form.reset({
        soapNoteId: prescription.soapNoteId || undefined,
        petId: prescription.petId,
        practiceId: prescription.practiceId,
        prescribedBy: prescription.prescribedBy,
        medicationName: prescription.medicationName,
        dosage: prescription.dosage,
        route: prescription.route,
        frequency: prescription.frequency,
        duration: prescription.duration,
        instructions: prescription.instructions || "",
        quantityPrescribed: prescription.quantityPrescribed,
        refills: prescription.refills || 0,
        status: prescription.status,
      });
    }
  }, [prescription, form]);

  // Update prescription mutation
  const updatePrescriptionMutation = useMutation({
    mutationFn: async (data: PrescriptionFormData) => {
      const response = await apiRequest("PATCH", `/api/prescriptions/${prescriptionId}`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Prescription Updated",
        description: "The prescription has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
      router.push(`/admin/pet-prescriptions/${prescription?.petId}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update prescription.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PrescriptionFormData) => {
    updatePrescriptionMutation.mutate(data);
  };

  if (!prescriptionId) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertDescription>
            Prescription ID is required.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isPrescriptionLoading) {
    return (
      <div className="container mx-auto py-6 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!prescription) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertDescription>
            Prescription not found.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Edit Prescription</h1>
      </div>

      {pet && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                <span className="font-semibold">{pet.name.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <h3 className="font-semibold">{pet.name}</h3>
                <p className="text-sm text-muted-foreground">{pet.species} • {pet.breed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Prescription Details</CardTitle>
          <p className="text-sm text-muted-foreground">
            {prescription.medicationName} - {prescription.dosage}
          </p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="medicationName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Medication Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Amoxicillin" {...field} />
                      </FormControl>
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
                        <Input placeholder="e.g., 500mg, 5ml" {...field} />
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="once">Once</SelectItem>
                          <SelectItem value="SID">SID (once daily)</SelectItem>
                          <SelectItem value="BID">BID (twice daily)</SelectItem>
                          <SelectItem value="TID">TID (three times daily)</SelectItem>
                          <SelectItem value="QID">QID (four times daily)</SelectItem>
                          <SelectItem value="PRN">PRN (as needed)</SelectItem>
                          <SelectItem value="EOD">EOD (every other day)</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="biweekly">Bi-weekly</SelectItem>
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
                    <FormItem>
                      <FormLabel>Duration</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 7 days, 2 weeks" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quantityPrescribed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
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
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="dispensed">Dispensed</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
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
                        placeholder="Administration instructions, precautions, etc."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updatePrescriptionMutation.isPending}
                >
                  {updatePrescriptionMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Prescription"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
