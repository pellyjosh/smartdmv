"use client";
import React, { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, ArrowLeft } from "lucide-react";
import { usePractice } from "@/hooks/use-practice";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

// Schema
const serviceCodeFormSchema = z.object({
  practiceId: z.number(),
  code: z.string().min(1, { message: "Code is required" }),
  description: z.string().min(1, { message: "Description is required" }),
  defaultPrice: z.string().min(1, { message: "Default price is required" }),
  category: z.string().min(1, { message: "Category is required" }),
  taxable: z.boolean().default(true),
  taxRateId: z.number().nullable().optional(),
  active: z.boolean().default(true),
});

type ServiceCodeFormValues = z.infer<typeof serviceCodeFormSchema>;

const SERVICE_CATEGORIES = [
  "Examination",
  "Vaccination",
  "Surgery",
  "Laboratory",
  "Imaging",
  "Medication",
  "Hospitalization",
  "Dentistry",
  "Emergency",
  "Grooming",
  "Boarding",
  "Consultation",
  "Other",
];

const NewServiceCodePage = () => {
  const { toast } = useToast();
  const { practice } = usePractice();
  const practiceId = practice?.id;
  const router = useRouter();

  // Queries
  const { data: taxRates = [], isLoading: isLoadingTaxRates } = useQuery({
    queryKey: ["/api/practices", practiceId, "tax-rates"],
    queryFn: async () => {
      if (!practiceId) return [] as any[];
      const res = await apiRequest(
        "GET",
        `/api/practices/${practiceId}/tax-rates`
      );
      if (!res.ok) throw new Error("Failed to fetch tax rates");
      return res.json();
    },
    enabled: !!practiceId,
  });

  // Form
  const form = useForm<ServiceCodeFormValues>({
    resolver: zodResolver(serviceCodeFormSchema),
    defaultValues: {
      practiceId: practiceId || 0,
      code: "",
      description: "",
      defaultPrice: "0.00",
      category: "Other",
      taxable: true,
      taxRateId: null,
      active: true,
    },
  });

  useEffect(() => {
    if (practiceId) form.setValue("practiceId", practiceId);
  }, [practiceId, form]);

  // Mutation
  const createServiceCodeMutation = useMutation({
    mutationFn: async (data: ServiceCodeFormValues) => {
      const res = await apiRequest(
        "POST",
        `/api/practices/${practiceId}/service-codes`,
        data
      );
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Service code created",
        description: "The service code has been created successfully.",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/practices", practiceId, "service-codes"],
      });
      router.push("/admin/billing");
    },
    onError: (error: any) => {
      toast({
        title: "Error creating service code",
        description: error.message || "Failed",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: ServiceCodeFormValues) =>
    createServiceCodeMutation.mutate(values);

  const isLoading = isLoadingTaxRates;
  const isSaving = createServiceCodeMutation.isPending;

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-72" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => router.push("/admin/billing")}
          className="flex items-center"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">New Service Code</h1>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Service Code Details</CardTitle>
              <CardDescription>
                Enter the details for this service code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter code"
                          {...field}
                          disabled={isSaving}
                        />
                      </FormControl>
                      <FormDescription>
                        A short unique identifier for this service
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isSaving}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SERVICE_CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
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
                  name="description"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter service description"
                          className="resize-none"
                          {...field}
                          disabled={isSaving}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="defaultPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Price</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5">$</span>
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            disabled={isSaving}
                            className="pl-7"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="taxable"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Taxable</FormLabel>
                        <FormDescription>
                          Is this service subject to tax?
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSaving}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                {form.watch("taxable") && (
                  <FormField
                    control={form.control}
                    name="taxRateId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax Rate</FormLabel>
                        <Select
                          value={field.value?.toString() || "default"}
                          onValueChange={(v) =>
                            field.onChange(
                              v && v !== "default" ? parseInt(v) : null
                            )
                          }
                          disabled={isSaving}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a tax rate" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="default">
                              Default Rate
                            </SelectItem>
                            {taxRates?.map((rate: any) => (
                              <SelectItem
                                key={rate.id}
                                value={rate.id.toString()}
                              >
                                {rate.name} ({rate.rate}%)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Leave blank to use the default tax rate
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active</FormLabel>
                        <FormDescription>
                          Inactive codes won't appear in service selection
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSaving}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/billing")}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Service Code
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default NewServiceCodePage;
