import React, { useState } from 'react';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useUser } from '@/context/UserContext';

// Define the form schema
const checklistFormSchema = z.object({
  name: z.string().min(3, 'Checklist name must be at least 3 characters'),
  petId: z.coerce.number().min(1, 'Please select a pet'),
  templateId: z.coerce.number().optional(),
  priority: z.string().default('medium'),
  status: z.string().default('pending'),
  notes: z.string().optional(),
  dueDate: z.date().optional(),
  appointmentId: z.coerce.number().optional(),
});

type ChecklistFormValues = z.infer<typeof checklistFormSchema>;

interface CreateChecklistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPetId?: number;
  initialAppointmentId?: number;
}

export default function CreateChecklistDialog({ 
  open, 
  onOpenChange, 
  initialPetId, 
  initialAppointmentId 
}: CreateChecklistDialogProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const practiceId = (user && ('currentPracticeId' in user ? (user as any).currentPracticeId : (user as any).practiceId)) as string | number | undefined;
  const petIdWatch = ((): number | undefined => {
    try { return (useForm as any) ? undefined : undefined; } catch { return undefined; }
  })();
  
  // Define form
  const form = useForm<ChecklistFormValues>({
    resolver: zodResolver(checklistFormSchema),
    defaultValues: {
      name: '',
      petId: initialPetId || 0,
      templateId: undefined,
      priority: 'medium',
      status: 'pending',
      notes: '',
      dueDate: undefined,
      appointmentId: initialAppointmentId,
    },
  });

  // Fetch templates for dropdown
  type TemplateSummary = { id: number; name: string; category?: string | null };
  const { data: templates = [] } = useQuery<TemplateSummary[]>({
    queryKey: ['/api/treatment-templates'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/treatment-templates');
      return res.json();
    },
    enabled: open,
  });

  // Fetch pets for dropdown
  type PetSummary = { id: number; name: string; species?: string | null };
  const { data: pets = [] } = useQuery<PetSummary[]>({
    queryKey: ['/api/pets', practiceId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/pets?practiceId=${practiceId}`);
      return res.json();
    },
    enabled: open && !!practiceId,
  });

  // Create mutation
  const mutation = useMutation({
    mutationFn: async (values: ChecklistFormValues) => {
      const payload = {
        name: values.name,
        petId: Number(values.petId),
        templateId: values.templateId ? Number(values.templateId) : null,
        priority: values.priority,
        status: values.status,
        notes: values.notes ?? null,
        dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : null,
        appointmentId: values.appointmentId ? Number(values.appointmentId) : null,
      };
      const response = await apiRequest('POST', '/api/assigned-checklists', payload);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assigned-checklists'] });
      toast({
        title: 'Checklist created',
        description: 'New treatment checklist has been created successfully.',
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creating checklist',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (values: ChecklistFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Create Treatment Checklist</DialogTitle>
          <DialogDescription>
            Create a new checklist for tracking treatment procedures.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Checklist Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Post-Surgery Care" {...field} />
                  </FormControl>
                  <FormDescription>
                    Choose a descriptive name for this checklist.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="petId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pet</FormLabel>
                  <Select 
                    onValueChange={(val) => field.onChange(Number(val))}
                    value={field.value ? String(field.value) : ''}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a pet" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {pets.map((pet: any) => (
                        <SelectItem key={pet.id} value={pet.id.toString()}>
                          {pet.name} ({pet.species})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select the pet this treatment checklist is for.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="templateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template (Optional)</FormLabel>
                  <Select 
                    onValueChange={(val) => field.onChange(val && val !== 'NONE' ? Number(val) : undefined)}
                    value={field.value ? String(field.value) : 'NONE'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template or create from scratch" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="NONE">Create from scratch</SelectItem>
                      {templates.map((template: any) => (
                        <SelectItem key={template.id} value={template.id.toString()}>
                          {template.name} 
                          <Badge variant="outline" className="ml-2">
                            {template.category}
                          </Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Optional: use a template to pre-populate checklist items.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select 
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
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
                    <FormLabel>Status</FormLabel>
                    <Select 
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "pl-3 text-left font-normal",
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
                  <FormDescription>
                    Optional: set a due date for this checklist.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add any additional notes or instructions" 
                      className="resize-none min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Optional: provide additional context or special instructions.
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
                Create Checklist
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}