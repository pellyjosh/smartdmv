import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  MoreHorizontal, 
  Plus, 
  Trash2, 
  GripVertical, 
  ChevronUp, 
  ChevronDown,
  Timer,
  Clock 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserRoleEnum } from '@/lib/db-types';

// Define the form schema for template items
const templateItemSchema = z.object({
  title: z.string().min(3, 'Item title must be at least 3 characters'),
  description: z.string().optional(),
  position: z.coerce.number().default(0),
  isRequired: z.boolean().default(false),
  estimatedDuration: z.coerce.number().min(0).optional(),
  assigneeRole: z.string().optional(),
  reminderThreshold: z.coerce.number().min(0).optional(),
});

type TemplateItemFormValues = z.infer<typeof templateItemSchema>;

interface TemplateItemsProps {
  templateId: number;
  items: any[];
  onItemsChanged: () => void;
}

export default function TemplateItems({ templateId, items = [], onItemsChanged }: TemplateItemsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);

  // Create form for adding new items
  const form = useForm<TemplateItemFormValues>({
    resolver: zodResolver(templateItemSchema),
    defaultValues: {
      title: '',
      description: '',
      position: items.length + 1,
      isRequired: false,
      estimatedDuration: 0,
      assigneeRole: '',
      reminderThreshold: 0,
    },
  });

  // Create form for editing items
  const editForm = useForm<TemplateItemFormValues>({
    resolver: zodResolver(templateItemSchema),
    defaultValues: {
      title: '',
      description: '',
      position: 0,
      isRequired: false,
      estimatedDuration: 0,
      assigneeRole: '',
      reminderThreshold: 0,
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (values: TemplateItemFormValues) => {
      const response = await apiRequest('POST', '/api/template-items', {
        ...values,
        templateId,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/treatment-templates', templateId, 'items'] });
      toast({
        title: 'Item added',
        description: 'Checklist item has been added successfully.',
      });
      form.reset();
      setShowAddForm(false);
      onItemsChanged();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error adding item',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: TemplateItemFormValues }) => {
      const response = await apiRequest('PATCH', `/api/template-items/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/treatment-templates', templateId, 'items'] });
      toast({
        title: 'Item updated',
        description: 'Checklist item has been updated successfully.',
      });
      setEditingItem(null);
      onItemsChanged();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating item',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/template-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/treatment-templates', templateId, 'items'] });
      toast({
        title: 'Item deleted',
        description: 'Checklist item has been deleted successfully.',
      });
      setItemToDelete(null);
      onItemsChanged();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting item',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Position mutation
  const reorderMutation = useMutation({
    mutationFn: async ({ id, newPosition }: { id: number; newPosition: number }) => {
      const response = await apiRequest('PATCH', `/api/template-items/${id}`, {
        position: newPosition,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/treatment-templates', templateId, 'items'] });
      onItemsChanged();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error reordering items',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (values: TemplateItemFormValues) => {
    createMutation.mutate(values);
  };

  const onEditSubmit = (values: TemplateItemFormValues) => {
    if (editingItem) {
      updateMutation.mutate({
        id: editingItem.id,
        data: values,
      });
    }
  };

  const handleDelete = () => {
    if (itemToDelete) {
      deleteMutation.mutate(itemToDelete.id);
    }
  };

  const handleEdit = (item: any) => {
    editForm.reset({
      title: item.title,
      description: item.description || '',
      position: item.position,
      isRequired: item.isRequired || false,
      estimatedDuration: item.estimatedDuration || 0,
      assigneeRole: item.assigneeRole || '',
      reminderThreshold: item.reminderThreshold || 0,
    });
    setEditingItem(item);
  };

  const moveUp = (item: any) => {
    if (item.position <= 1) return;
    const newPosition = item.position - 1;
    reorderMutation.mutate({
      id: item.id,
      newPosition,
    });
  };

  const moveDown = (item: any) => {
    if (item.position >= items.length) return;
    const newPosition = item.position + 1;
    reorderMutation.mutate({
      id: item.id,
      newPosition,
    });
  };

  // Sort items by position
  const sortedItems = [...items].sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-4 py-2">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Checklist Items</h3>
        <Button 
          size="sm" 
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Item
        </Button>
      </div>

      {showAddForm && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Add Checklist Item</CardTitle>
            <CardDescription>Add a new item to this treatment template.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Check vital signs" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Instructions or details for this task" 
                          className="resize-none h-20"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="estimatedDuration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Est. Duration (minutes)</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="assigneeRole"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assignee Role</FormLabel>
                        <Select 
                          onValueChange={(v) => field.onChange(v === 'ANY' ? undefined : v)} 
                          value={field.value ?? 'ANY'}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Any role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ANY">Any Staff</SelectItem>
                            <SelectItem value={UserRoleEnum.VETERINARIAN}>Veterinarian</SelectItem>
                            <SelectItem value={UserRoleEnum.TECHNICIAN}>Technician</SelectItem>
                            <SelectItem value={UserRoleEnum.RECEPTIONIST}>Receptionist</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-center space-x-4 py-2">
                  <FormField
                    control={form.control}
                    name="isRequired"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="m-0">Required Item</FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="reminderThreshold"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <div className="flex items-center space-x-2">
                          <FormLabel className="min-w-32">Reminder (hours before due)</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" {...field} />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending}
                  >
                    Add Item
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {editingItem && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Edit Checklist Item</CardTitle>
            <CardDescription>Update this checklist item.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-3">
                <FormField
                  control={editForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Check vital signs" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Instructions or details for this task" 
                          className="resize-none h-20"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="estimatedDuration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Est. Duration (minutes)</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="assigneeRole"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assignee Role</FormLabel>
                        <Select 
                          onValueChange={(v) => field.onChange(v === 'ANY' ? undefined : v)} 
                          value={field.value ?? 'ANY'}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Any role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ANY">Any Staff</SelectItem>
                            <SelectItem value={UserRoleEnum.VETERINARIAN}>Veterinarian</SelectItem>
                            <SelectItem value={UserRoleEnum.TECHNICIAN}>Technician</SelectItem>
                            <SelectItem value={UserRoleEnum.RECEPTIONIST}>Receptionist</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-center space-x-4 py-2">
                  <FormField
                    control={editForm.control}
                    name="isRequired"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="m-0">Required Item</FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="reminderThreshold"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <div className="flex items-center space-x-2">
                          <FormLabel className="min-w-32">Reminder (hours before due)</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" {...field} />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setEditingItem(null)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateMutation.isPending}
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {sortedItems.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>Task</TableHead>
              <TableHead>Required</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono w-10">
                  <div className="flex flex-col items-center">
                    <span>{item.position}</span>
                    <div className="flex mt-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0"
                        onClick={() => moveUp(item)}
                        disabled={item.position <= 1}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0"
                        onClick={() => moveDown(item)}
                        disabled={item.position >= items.length}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{item.title}</div>
                  {item.description && (
                    <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {item.description}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {item.isRequired ? (
                    <Badge variant="default">Required</Badge>
                  ) : (
                    <Badge variant="outline">Optional</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {item.estimatedDuration > 0 ? (
                    <div className="flex items-center">
                      <Timer className="h-4 w-4 mr-1 text-muted-foreground" />
                      <span>{item.estimatedDuration} min</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {item.assigneeRole ? (
                    <Badge variant="secondary">
                      {item.assigneeRole.replace('_', ' ')}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">Any Staff</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(item)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setItemToDelete(item)} className="text-destructive">
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-8 border rounded-md bg-muted/20">
          <p className="text-muted-foreground">No items in this template. Add some items to get started.</p>
        </div>
      )}

      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Checklist Item?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this item from the template?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}