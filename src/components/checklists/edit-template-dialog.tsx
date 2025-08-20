import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import TemplateItems from './template-items';

// Define the form schema
const templateFormSchema = z.object({
  name: z.string().min(3, 'Template name must be at least 3 characters'),
  category: z.string().min(1, 'Please select a category'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  autoAssignToDiagnosis: z.array(z.string()).optional(),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

interface EditTemplateDialogProps {
  template: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditTemplateDialog({ template, open, onOpenChange }: EditTemplateDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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
  
  // Define form
  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: template.name || '',
      category: template.category || '',
      description: template.description || '',
      isActive: template.isActive ?? true,
      autoAssignToDiagnosis: template.autoAssignToDiagnosis || [],
    },
  });

  // Update form values when template changes
  useEffect(() => {
    if (template) {
      form.reset({
        name: template.name || '',
        category: template.category || '',
        description: template.description || '',
        isActive: template.isActive ?? true,
        autoAssignToDiagnosis: template.autoAssignToDiagnosis || [],
      });
    }
  }, [template, form]);

  // Fetch template items
  type TemplateItemRow = {
    id: number;
    title: string;
    description?: string | null;
    position?: number | null;
    isRequired?: boolean | null;
    estimatedDuration?: number | null;
    reminderThreshold?: number | null;
    assigneeRole?: string | null;
  };

  const { data: templateItems = [], refetch } = useQuery<TemplateItemRow[]>({
    queryKey: ['/api/treatment-templates', template.id, 'items'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/treatment-templates/${template.id}/items`);
      return res.json();
    },
    enabled: open && !!template.id,
  });

  // Update mutation
  const mutation = useMutation({
    mutationFn: async (values: TemplateFormValues) => {
      const response = await apiRequest('PATCH', `/api/treatment-templates/${template.id}`, values);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/treatment-templates'] });
      toast({
        title: 'Template updated',
        description: 'Treatment template has been updated successfully.',
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating template',
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
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle>Edit Treatment Template</DialogTitle>
          <DialogDescription>
            Update template details and manage checklist items.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Template Details</TabsTrigger>
            <TabsTrigger value="items">Checklist Items</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
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
                        value={field.value}
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
                          {(field.value || []).map((type, index) => (
                            <Badge key={index} variant="secondary" className="px-2 py-1 flex items-center gap-1">
                              {type}
                              <X 
                                className="h-3 w-3 cursor-pointer" 
                                onClick={() => {
                                  const base = field.value || [];
                                  const newValues = [...base];
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
                              const base = field.value || [];
                              if (value && !base.includes(value)) {
                                const newValues = [...base, value];
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
                    Save Changes
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="items">
            <TemplateItems 
              templateId={template.id} 
              items={templateItems} 
              onItemsChanged={() => refetch()} 
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}