import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Clock, 
  Calendar, 
  Check, 
  User, 
  AlarmClock,
  CheckCircle2,
  Timer,
  Tag,
  FileText,
  X
} from 'lucide-react';
import { formatDistanceToNow, format, isPast, differenceInDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { getInitials, getAvatarColorFromName } from '@/lib/utils';
import { UserRoleEnum } from '@/db/schema';
import { useUser } from '@/context/UserContext';

interface ViewChecklistDialogProps {
  checklist: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ViewChecklistDialog({ checklist, open, onOpenChange }: ViewChecklistDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const apiEndpoint = user?.role === UserRoleEnum.CLIENT 
    ? '/api/client-portal/checklists' 
    : '/api/assigned-checklists';

  // Fetch checklist details
  const { data: checklistData, isLoading: isLoadingChecklist } = useQuery({
    queryKey: [apiEndpoint, checklist.id],
    queryFn: async () => {
      const res = await apiRequest('GET', `${apiEndpoint}/${checklist.id}`);
      return res.json();
    },
    enabled: open && !!checklist.id,
  });

  // Fetch checklist items separately
  const { data: checklistItems, isLoading: isLoadingItems } = useQuery({
    queryKey: [apiEndpoint, checklist.id, 'items'],
    queryFn: async () => {
      const res = await apiRequest('GET', `${apiEndpoint}/${checklist.id}/items`);
      return res.json();
    },
    enabled: open && !!checklist.id,
  });

  const isLoading = isLoadingChecklist || isLoadingItems;
  const items = checklistItems || checklist.items || [];
  
  // Calculate checklist metrics
  const totalItems = items.length;
  const completedItems = items.filter((item: any) => item.completed).length;
  const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  const totalDuration = items.reduce((acc: number, item: any) => acc + (item.estimatedDuration || 0), 0);

  // Toggle item completion
  const toggleItemMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      const response = await apiRequest('PATCH', `/api/checklist-items/${id}`, {
        completed
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiEndpoint, checklist.id] });
      queryClient.invalidateQueries({ queryKey: [apiEndpoint] });
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

  const handleToggleComplete = (item: any) => {
    toggleItemMutation.mutate({
      id: item.id,
      completed: !item.completed
    });
  };

  const getStatusBadge = (status: string, dueDate?: string | null) => {
    if (status === 'completed') {
      return <Badge className="bg-green-500">Completed</Badge>;
    }
    
    if (status === 'in_progress') {
      return <Badge variant="secondary">In Progress</Badge>;
    }
    
    if (dueDate && isPast(new Date(dueDate))) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    
    if (dueDate && differenceInDays(new Date(dueDate), new Date()) <= 2) {
      return <Badge variant="outline" className="border-orange-500 text-orange-500">Due Soon</Badge>;
    }
    
    return <Badge variant="outline">Pending</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const map: Record<string, JSX.Element> = {
      'urgent': <Badge variant="destructive">Urgent</Badge>,
      'high': <Badge className="bg-orange-500">High</Badge>,
      'medium': <Badge variant="secondary">Medium</Badge>,
      'low': <Badge variant="outline">Low</Badge>
    };
    return map[priority] || map['medium'];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{checklist.name}</DialogTitle>
          <DialogDescription className="flex flex-wrap gap-2 items-center">
            {getStatusBadge(checklist.status, checklist.dueDate)}
            {getPriorityBadge(checklist.priority || 'medium')}
            <span className="text-muted-foreground">
              Created {formatDistanceToNow(new Date(checklist.createdAt), { addSuffix: true })}
            </span>
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tasks">Tasks ({completedItems}/{totalItems})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Pet</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-10 w-10" style={{ backgroundColor: getAvatarColorFromName(checklist.petName) }}>
                      <AvatarFallback>{getInitials(checklist.petName)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{checklist.petName}</p>
                      <p className="text-xs text-muted-foreground">{checklist.petSpecies}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2">
                    <Progress value={completionPercentage} className="h-2" />
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{completionPercentage}% completed</span>
                      <span className="text-xs text-muted-foreground">{completedItems}/{totalItems} tasks</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Due Date</CardTitle>
                </CardHeader>
                <CardContent>
                  {checklist.dueDate ? (
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{format(new Date(checklist.dueDate), 'PPP')}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(checklist.dueDate), { addSuffix: true })}
                      </p>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">No due date set</span>
                  )}
                </CardContent>
              </Card>
            </div>

            {checklist.notes && (
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Notes</h3>
                <div className="rounded-md border p-4">
                  <p className="text-muted-foreground whitespace-pre-line">
                    {checklist.notes}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-lg font-medium">Details</h3>
              <div className="rounded-md border">
                <div className="grid grid-cols-2 gap-4 p-4">
                  <div>
                    <p className="text-sm font-medium">Assigned By</p>
                    <p className="text-sm text-muted-foreground">{checklist.assignedByName || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Assigned To</p>
                    <p className="text-sm text-muted-foreground">{checklist.assignedToName || 'Unassigned'}</p>
                  </div>
                  {checklist.appointmentId && (
                    <>
                      <div>
                        <p className="text-sm font-medium">Related Appointment</p>
                        <p className="text-sm text-muted-foreground">ID: {checklist.appointmentId}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Appointment Date</p>
                        <p className="text-sm text-muted-foreground">
                          {checklist.appointmentDate 
                            ? format(new Date(checklist.appointmentDate), 'PPP')
                            : 'Unknown'}
                        </p>
                      </div>
                    </>
                  )}
                  <div>
                    <p className="text-sm font-medium">Est. Duration</p>
                    <p className="text-sm text-muted-foreground">{totalDuration} minutes</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Template Used</p>
                    <p className="text-sm text-muted-foreground">{checklist.templateName || 'Custom checklist'}</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="tasks">
            {isLoading ? (
              <div className="text-center py-4">Loading tasks...</div>
            ) : items && items.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">Status</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item: any) => (
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
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-1 text-muted-foreground" />
                            <span>{item.assigneeRole.replace('_', ' ')}</span>
                          </div>
                        ) : item.assignedToName ? (
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-1 text-muted-foreground" />
                            <span>{item.assignedToName}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Unassigned</span>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 border rounded-md bg-muted/20">
                <p className="text-muted-foreground">No tasks in this checklist.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}