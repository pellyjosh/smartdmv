import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Pet, HealthPlan } from "@/db/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Calendar } from "lucide-react";
import { format } from "date-fns";

// Form schema for editing health plans
const editHealthPlanFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  startDate: z.string().min(1, { message: "Start date is required" }),
  endDate: z.string().optional(),
  description: z.string().optional(),
});

type EditHealthPlanFormValues = z.infer<typeof editHealthPlanFormSchema>;

interface EditHealthPlanFormProps {
  healthPlan: HealthPlan;
  onSuccess?: () => void;
}

export function EditHealthPlanForm({ healthPlan, onSuccess }: EditHealthPlanFormProps) {
  const { user, userPracticeId } = useUser();
  const { toast } = useToast();

  // Fetch pets to display the associated pet (read-only)
  const { data: pets, isLoading: isPetsLoading } = useQuery<Pet[]>({
    queryKey: ["/api/pets"],
    queryFn: async () => {
      const response = await fetch('/api/pets');
      if (!response.ok) throw new Error('Failed to fetch pets');
      return response.json();
    },
    enabled: !!user,
  });

  // Find the associated pet
  const associatedPet = pets?.find(pet => pet.id === Number(healthPlan.petId));

  // Initialize form with existing health plan data
  const form = useForm<EditHealthPlanFormValues>({
    resolver: zodResolver(editHealthPlanFormSchema),
    defaultValues: {
      name: healthPlan.name,
      startDate: healthPlan.startDate ? new Date(healthPlan.startDate).toISOString().split('T')[0] : '',
      endDate: healthPlan.endDate ? new Date(healthPlan.endDate).toISOString().split('T')[0] : '',
      description: healthPlan.description || '',
    },
  });

  // Update health plan mutation
  const updateHealthPlanMutation = useMutation({
    mutationFn: async (data: EditHealthPlanFormValues) => {
      // Convert date strings to Date objects and then to ISO strings
      const formattedData = {
        ...data,
        startDate: data.startDate ? new Date(data.startDate).toISOString() : null,
        endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
      };

      const res = await apiRequest("PUT", `/api/health-plans/${healthPlan.id}`, formattedData);
      // Let apiRequest throw for non-OK statuses; if it returns, parse JSON
      return await res.json();
    },
    onSuccess: async () => {
      // Use refetchQueries so results are fetched immediately (real-time update)
      try {
        await queryClient.refetchQueries({ queryKey: ["/api/health-plans"], exact: true });
      } catch (e) {
        console.warn('Error refetching queries after health plan update', e);
      }

      toast({
        title: "Health plan updated",
        description: "The health plan has been successfully updated.",
      });

      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: unknown) => {
      // Try to extract a friendly message from the error thrown by apiRequest
      let message = 'Unknown error';
      if (error instanceof Error) message = error.message;
      else if (typeof error === 'string') message = error;

      // Strip HTML if the server returned an HTML error page (e.g., 404 in dev)
      message = message.replace(/<[^>]*>/g, '');

      // Truncate overly long messages
      if (message.length > 300) message = message.substring(0, 300) + '...';

      toast({
        title: "Failed to update health plan",
        description: message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditHealthPlanFormValues) => {
    // Prevent sending requests when auth hasn't been established yet
    if (!user) {
      toast({
        title: 'Not signed in',
        description: 'You must be signed in to update a health plan. Please sign in and try again.',
        variant: 'destructive'
      });
      return;
    }

    updateHealthPlanMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Associated Pet (Read-only) */}
          <div className="space-y-2">
            <FormLabel>Associated Pet</FormLabel>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md border">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-primary-700 font-semibold text-xs">
                  {associatedPet?.name.charAt(0) || "P"}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {associatedPet?.name || `Pet ID: ${healthPlan.petId}`}
                </p>
                <p className="text-sm text-gray-500">
                  {associatedPet ? `${associatedPet.species} ${associatedPet.breed ? `• ${associatedPet.breed}` : ''}` : 'Loading...'}
                </p>
              </div>
            </div>
          </div>

          {/* Health Plan Name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Health Plan Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter health plan name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Start Date */}
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* End Date */}
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Date (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Description */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Additional notes about this health plan..."
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Submit Button */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onSuccess?.()}
              disabled={updateHealthPlanMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={updateHealthPlanMutation.isPending || !user}
            >
              {updateHealthPlanMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Health Plan
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
