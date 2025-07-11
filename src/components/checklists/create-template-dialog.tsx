import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

// Define the form schema
const templateFormSchema = z.object({
  name: z.string().min(3, 'Template name must be at least 3 characters'),
  category: z.string().min(1, 'Please select a category'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  autoAssignToDiagnosis: z.array(z.string()).optional(),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateTemplateDialog({ open, onOpenChange }: CreateTemplateDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Define form
  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: '',
      category: '',
      description: '',
      isActive: true,
      autoAssignToDiagnosis: [],
    },
  });
  
  // State for managing appointment type selection
  const [appointmentType, setAppointmentType] = useState<string>('');
  
  // Available appointment types for auto-assignment
  const appointmentTypes = [
    { value: 'surgery', label: 'Surgery' },
    { value: 'dental', label: 'Dental' },
    { value: 'vaccination', label: 'Vaccination' },
    { value: 'checkup', label: 'Checkup' },
    { value: 'wellness', label: 'Wellness' },
    { value: 'emergency', label: 'Emergency' },
    { value: 'in-person', label: 'In-Person Consultation' },
    { value: 'virtual', label: 'Virtual Telemedicine' },
  ];

  // Create mutation
  const mutation = useMutation({
    mutationFn: async (values: TemplateFormValues) => {
      const response = await apiRequest('POST', '/api/treatment-templates', values);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/treatment-templates'] });
      toast({
        title: 'Template created',
        description: 'New treatment template has been created successfully.',
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creating template',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (values: TemplateFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Create Treatment Template</DialogTitle>
          <DialogDescription>
            Create a new template for common treatment procedures and protocols.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Routine Dental Cleaning" {...field} />
                  </FormControl>
                  <FormDescription>
                    Choose a descriptive name for this treatment template.
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
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Surgery">Surgery</SelectItem>
                      <SelectItem value="Dental">Dental</SelectItem>
                      <SelectItem value="Vaccination">Vaccination</SelectItem>
                      <SelectItem value="Wellness">Wellness</SelectItem>
                      <SelectItem value="Emergency">Emergency</SelectItem>
                      <SelectItem value="Diagnostic">Diagnostic</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The category helps organize templates by procedure type.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the treatment template and its purpose" 
                      className="resize-none min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Optional: provide details about when to use this template.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Auto-assign to appointment types */}
            <FormField
              control={form.control}
              name="autoAssignToDiagnosis"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Auto-assign to Appointment Types</FormLabel>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {field.value?.map((type, index) => (
                        <Badge key={index} variant="secondary" className="px-2 py-1 flex items-center gap-1">
                          {type}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={() => {
                              const newValues = [...field.value];
                              newValues.splice(index, 1);
                              field.onChange(newValues);
                            }} 
                          />
                        </Badge>
                      ))}
                    </div>
                    <div className="flex">
                      <Select 
                        onValueChange={(value) => {
                          if (value && !field.value?.includes(value)) {
                            const newValues = [...(field.value || []), value];
                            field.onChange(newValues);
                            setAppointmentType('');
                          }
                        }} 
                        value={appointmentType}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select appointment types to auto-assign" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {appointmentTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <FormDescription>
                    This template will be automatically assigned when an appointment of these types is created.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Template
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}