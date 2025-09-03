import React, { useState, useEffect } from 'react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, CalendarIcon, Check, Plus, Pencil, User, AlertCircle, Flag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { UserRoleEnum } from '@/lib/db-types';
import { useUser } from '@/context/UserContext';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Define the form schema
const checklistFormSchema = z.object({
  name: z.string().min(3, 'Checklist name must be at least 3 characters'),
  petId: z.coerce.number().min(1, 'Please select a pet'),
  priority: z.string().default('medium'),
  status: z.string().default('pending'),
  notes: z.string().optional(),
  dueDate: z.date().optional(),
});

type ChecklistFormValues = z.infer<typeof checklistFormSchema>;

interface EditChecklistDialogProps {
  checklist: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditChecklistDialog({ 
  checklist, 
  open, 
  onOpenChange 
}: EditChecklistDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState('details');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showEditItemDialog, setShowEditItemDialog] = useState(false);
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);

  // Fetch pets for dropdown
  const practiceId = (user && ('currentPracticeId' in user ? (user as any).currentPracticeId : (user as any).practiceId)) as string | number | undefined;
  const { data: pets = [] } = useQuery({
    queryKey: ['/api/pets', practiceId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/pets?practiceId=${practiceId}`);
      return res.json();
    },
    enabled: open && !!practiceId,
  });

  // Fetch staff members for task assignment
  const { data: staffMembers = [] } = useQuery({
    queryKey: ['/api/users/staff'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/users/staff');
      return res.json();
    },
    enabled: open && user?.role !== UserRoleEnum.CLIENT,
  });

  // Fetch checklist items
  const { data: checklistItems = [], refetch: refetchItems } = useQuery({
    queryKey: ['/api/assigned-checklists', checklist.id, 'items'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/assigned-checklists/${checklist.id}/items`);
      return res.json();
    },
    enabled: open && !!checklist.id,
  });

  // Define form
  const form = useForm<ChecklistFormValues>({
    resolver: zodResolver(checklistFormSchema),
    defaultValues: {
      name: checklist.name || '',
      petId: checklist.petId || 0,
      priority: checklist.priority || 'medium',
      status: checklist.status || 'pending',
      notes: checklist.notes || '',
      dueDate: checklist.dueDate ? new Date(checklist.dueDate) : undefined,
    },
  });

  // Update form values when checklist changes
  useEffect(() => {
    if (checklist) {
      form.reset({
        name: checklist.name || '',
        petId: checklist.petId || 0,
        priority: checklist.priority || 'medium',
        status: checklist.status || 'pending',
        notes: checklist.notes || '',
        dueDate: checklist.dueDate ? new Date(checklist.dueDate) : undefined,
      });
    }
  }, [checklist, form]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (values: ChecklistFormValues) => {
      const payload = {
        name: values.name,
        petId: values.petId ? Number(values.petId) : null,
        priority: values.priority,
        status: values.status,
        notes: values.notes ?? null,
        // dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : null, // TEMPORARILY DISABLED
      };
      const response = await apiRequest('PATCH', `/api/assigned-checklists/${checklist.id}`, payload);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assigned-checklists'] });
      toast({
        title: 'Checklist updated',
        description: 'The treatment checklist has been updated successfully.',
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating checklist',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Toggle item completion
  const toggleItemMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      const response = await apiRequest('PATCH', `/api/checklist-items/${id}`, {
        completed
      });
      return await response.json();
    },
    onSuccess: () => {
      refetchItems();
      toast({
        title: 'Item updated',
        description: 'The checklist item has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating item',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (values: ChecklistFormValues) => {
    updateMutation.mutate(values);
  };

  // Item assignment mutation
  const assignItemMutation = useMutation({
    mutationFn: async ({ id, assignedToId }: { id: number; assignedToId?: number }) => {
      const response = await apiRequest('PATCH', `/api/checklist-items/${id}`, {
        assignedToId: assignedToId || null
      });
      return await response.json();
    },
    onSuccess: () => {
      refetchItems();
      toast({
        title: 'Task assigned',
        description: 'The task has been assigned successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error assigning task',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update item mutation
  const updateItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('PATCH', `/api/checklist-items/${data.id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      refetchItems();
      setShowEditItemDialog(false);
      setEditingItem(null);
      toast({
        title: 'Task updated',
        description: 'The checklist task has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating task',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Add item mutation
  const addItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/checklist-items', {
        checklistId: checklist.id,
        ...data
      });
      return await response.json();
    },
    onSuccess: () => {
      refetchItems();
      setShowAddItemDialog(false);
      addItemForm.reset();
      toast({
        title: 'Task added',
        description: 'New checklist task has been added successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error adding task',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleToggleComplete = (item: any) => {
    toggleItemMutation.mutate({
      id: item.id,
      completed: !item.completed
    });
  };

  const handleAssignItem = (itemId: number, assignedToId: string) => {
    const parsed = assignedToId === 'NONE' ? undefined : parseInt(assignedToId, 10);
    assignItemMutation.mutate({
      id: itemId,
      assignedToId: typeof parsed === 'number' && !isNaN(parsed) ? parsed : undefined
    });
  };

  const handleEditItem = (item: any) => {
    setEditingItem(item);
    setShowEditItemDialog(true);
  };

  // Define a form schema for the edit item dialog
  const editItemFormSchema = z.object({
    title: z.string().min(2, "Title must be at least 2 characters"),
    description: z.string().optional(),
    priority: z.string().optional(),
    dueDate: z.date().optional().nullable(),
    assignedToId: z.string().optional(),
    notes: z.string().optional(),
  });

  // Create a form for editing items
  const editItemForm = useForm<z.infer<typeof editItemFormSchema>>({
    resolver: zodResolver(editItemFormSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      dueDate: null,
      assignedToId: "",
      notes: "",
    },
  });

  // Create a form for adding new items
  const addItemForm = useForm<z.infer<typeof editItemFormSchema>>({
    resolver: zodResolver(editItemFormSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      dueDate: null,
      assignedToId: "",
      notes: "",
    },
  });

  // Update form when editing item changes
  useEffect(() => {
    if (editingItem) {
      editItemForm.reset({
        title: editingItem.title || "",
        description: editingItem.description || "",
        priority: editingItem.priority || "medium",
        dueDate: editingItem.dueDate ? new Date(editingItem.dueDate) : null,
        assignedToId: editingItem.assignedToId?.toString() || "",
        notes: editingItem.notes || "",
      });
    }
  }, [editingItem, editItemForm]);

  // Handle item edit form submission
  const onEditItemSubmit = (values: z.infer<typeof editItemFormSchema>) => {
    if (!editingItem) return;
    
    updateItemMutation.mutate({
      id: editingItem.id,
      title: values.title,
      description: values.description,
      priority: values.priority,
      dueDate: values.dueDate,
      assignedToId: values.assignedToId ? parseInt(values.assignedToId) : null,
      notes: values.notes,
    });
  };

  // Handle add item form submission
  const onAddItemSubmit = (values: z.infer<typeof editItemFormSchema>) => {
    addItemMutation.mutate({
      title: values.title,
      description: values.description,
      priority: values.priority,
      dueDate: values.dueDate,
      assignedToId: values.assignedToId ? parseInt(values.assignedToId) : null,
      notes: values.notes,
    });
  };

  return (
    <>
      {/* Main checklist dialog */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle>Edit Treatment Checklist</DialogTitle>
          <DialogDescription>
            Update checklist details and manage tasks.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Checklist Details</TabsTrigger>
            <TabsTrigger value="tasks">Manage Tasks</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Checklist Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Post-Surgery Care" {...field} />
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
                      <FormLabel>Pet</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value.toString()}
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
                          defaultValue={field.value}
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
                          defaultValue={field.value}
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

                <div className="grid grid-cols-2 gap-4">
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
                </div>
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
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="tasks">
            <div className="space-y-4 py-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Checklist Tasks</h3>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowAddItemDialog(true)}>
                    <Plus className="mr-1 h-4 w-4" /> Add Task
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setActiveTab('details')}>
                    <Pencil className="mr-1 h-4 w-4" /> Edit Checklist
                  </Button>
                </div>
              </div>
              
              {checklistItems.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">Status</TableHead>
                      <TableHead>Task</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {checklistItems.map((item: any) => (
                      <TableRow key={item.id} className={item.completed ? "bg-muted/20" : ""}>
                        <TableCell>
                          <Checkbox 
                            checked={item.completed} 
                            onCheckedChange={() => handleToggleComplete(item)}
                            className={item.completed ? "bg-green-500 border-green-500" : ""}
                          />
                        </TableCell>
                        <TableCell>
                          <div className={`font-medium ${item.completed ? "line-through text-muted-foreground" : ""}`}>
                            {item.title}
                          </div>
                          {item.description && (
                            <div className={`text-sm mt-1 ${item.completed ? "text-muted-foreground/70" : "text-muted-foreground"}`}>
                              {item.description}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.assigneeRole ? (
                            <span>{item.assigneeRole.replace('_', ' ')}</span>
                          ) : item.assignedToName ? (
                            <span>{item.assignedToName}</span>
                          ) : (
                            <span className="text-muted-foreground">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Select 
                              value={item.assignedToId ? item.assignedToId.toString() : 'NONE'}
                              onValueChange={(value) => handleAssignItem(item.id, value)}
                            >
                              <SelectTrigger className="h-8 w-[140px]">
                                <SelectValue placeholder="Assign to" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="NONE">Unassigned</SelectItem>
                                {staffMembers.map((staff: any) => (
                                  <SelectItem key={staff.id} value={staff.id.toString()}>
                                    {staff.firstName} {staff.lastName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleEditItem(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 border rounded-md bg-muted/20">
                  <p className="text-muted-foreground">No tasks in this checklist.</p>
                  <Button size="sm" className="mt-4" onClick={() => setShowAddItemDialog(true)}>
                    <Plus className="mr-1 h-4 w-4" /> Add Task
                  </Button>
                </div>
              )}
              
              <div className="pt-4 text-right">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>

    {/* Edit Item Dialog */}
    <Dialog open={showEditItemDialog} onOpenChange={setShowEditItemDialog}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            Edit task details and assignment
          </DialogDescription>
        </DialogHeader>
        
        <Form {...editItemForm}>
          <form onSubmit={editItemForm.handleSubmit(onEditItemSubmit)} className="space-y-4 py-4">
            <FormField
              control={editItemForm.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Task title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={editItemForm.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Task description" 
                      className="resize-none h-20"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Describe what needs to be done
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={editItemForm.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
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
                control={editItemForm.control}
                name="assignedToId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned To</FormLabel>
                    <Select 
                      onValueChange={(val) => field.onChange(val === 'NONE' ? '' : val)} 
                      defaultValue={field.value || 'NONE'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Assign to" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NONE">Unassigned</SelectItem>
                        {staffMembers.map((staff: any) => (
                          <SelectItem key={staff.id} value={staff.id.toString()}>
                            {staff.firstName} {staff.lastName} ({staff.role.replace('_', ' ')})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={editItemForm.control}
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
                            <span>Pick a due date</span>
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
                  <FormDescription>
                    When should this task be completed
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={editItemForm.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes or instructions" 
                      className="resize-none h-20"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Any special instructions or additional context
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setShowEditItemDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateItemMutation.isPending}>
                {updateItemMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Task
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    {/* Add Item Dialog */}
    <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
          <DialogDescription>
            Add a new task to this checklist
          </DialogDescription>
        </DialogHeader>
        
        <Form {...addItemForm}>
          <form onSubmit={addItemForm.handleSubmit(onAddItemSubmit)} className="space-y-4 py-4">
            <FormField
              control={addItemForm.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Task title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={addItemForm.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Task description" 
                      className="resize-none h-20"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Describe what needs to be done
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={addItemForm.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
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
                control={addItemForm.control}
                name="assignedToId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned To</FormLabel>
                    <Select 
                      onValueChange={(val) => field.onChange(val === 'NONE' ? '' : val)} 
                      defaultValue={field.value || 'NONE'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Assign to" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NONE">Unassigned</SelectItem>
                        {staffMembers.map((staff: any) => (
                          <SelectItem key={staff.id} value={staff.id.toString()}>
                            {staff.firstName} {staff.lastName} ({staff.role.replace('_', ' ')})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={addItemForm.control}
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
                            <span>Pick a due date</span>
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
                  <FormDescription>
                    When should this task be completed
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={addItemForm.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes or instructions" 
                      className="resize-none h-20"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Any special instructions or additional context
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddItemDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addItemMutation.isPending}>
                {addItemMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Task
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  </>
);
}