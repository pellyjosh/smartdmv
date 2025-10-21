"use client";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const serviceCodeFormSchema = z.object({
  code: z.string().min(1, { message: "Code is required" }),
  description: z.string().min(1, { message: "Description is required" }),
  defaultPrice: z.string().min(1, { message: "Default price is required" }),
  category: z.string().min(1, { message: "Category is required" }),
  taxable: z.boolean().optional().default(true),
  taxRateId: z.number().nullable().optional(),
  active: z.boolean().optional().default(true),
});

export default function ServiceCodeEditDialog({
  code,
  open,
  onOpenChange,
  practiceId,
}: any) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // Fetch tax rates
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

  const form = useForm({
    resolver: zodResolver(serviceCodeFormSchema),
    defaultValues: {
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
    if (code) {
      form.reset({
        code: code.code || "",
        description: code.description || "",
        defaultPrice: code.defaultPrice?.toString() || "0.00",
        category: code.category || "Other",
        taxable: code.taxable !== undefined ? code.taxable : true,
        taxRateId: code.taxRateId || null,
        active: code.active !== undefined ? code.active : true,
      });
    }
  }, [code]);

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await apiRequest(
        "PUT",
        `/api/practices/${practiceId}/service-codes/${code.id}`,
        values
      );
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/practices", practiceId, "service-codes"],
      });
      toast({ title: "Service code updated" });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({
        title: "Error updating service code",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: any) => mutation.mutate(values);

  if (!code) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Service Code</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                name="code"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter code"
                        {...field}
                        disabled={mutation.isPending}
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
                name="category"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={mutation.isPending}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Examination">Examination</SelectItem>
                        <SelectItem value="Vaccination">Vaccination</SelectItem>
                        <SelectItem value="Surgery">Surgery</SelectItem>
                        <SelectItem value="Laboratory">Laboratory</SelectItem>
                        <SelectItem value="Imaging">Imaging</SelectItem>
                        <SelectItem value="Medication">Medication</SelectItem>
                        <SelectItem value="Hospitalization">
                          Hospitalization
                        </SelectItem>
                        <SelectItem value="Dentistry">Dentistry</SelectItem>
                        <SelectItem value="Emergency">Emergency</SelectItem>
                        <SelectItem value="Grooming">Grooming</SelectItem>
                        <SelectItem value="Boarding">Boarding</SelectItem>
                        <SelectItem value="Consultation">
                          Consultation
                        </SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="description"
                control={form.control}
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter service description"
                        className="resize-none"
                        {...field}
                        disabled={mutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="defaultPrice"
                control={form.control}
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
                          disabled={mutation.isPending}
                          className="pl-7"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              name="taxable"
              control={form.control}
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
                      disabled={mutation.isPending}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            {form.watch("taxable") && (
              <FormField
                name="taxRateId"
                control={form.control}
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
                      disabled={mutation.isPending}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a tax rate" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="default">Default Rate</SelectItem>
                        {taxRates?.map((rate: any) => (
                          <SelectItem key={rate.id} value={rate.id.toString()}>
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
              name="active"
              control={form.control}
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
                      disabled={mutation.isPending}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
