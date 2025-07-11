import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Check, Clock, Timer, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ViewTemplateDialogProps {
  template: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ViewTemplateDialog({ template, open, onOpenChange }: ViewTemplateDialogProps) {
  // Fetch template items
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['/api/treatment-templates', template.id, 'items'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/treatment-templates/${template.id}/items`);
      return res.json();
    },
    enabled: open && !!template.id,
  });

  // Sort items by position
  const sortedItems = [...items].sort((a, b) => a.position - b.position);

  // Calculate template metrics
  const totalItems = sortedItems.length;
  const requiredItems = sortedItems.filter(item => item.isRequired).length;
  const totalDuration = sortedItems.reduce((acc, item) => acc + (item.estimatedDuration || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{template.name}</DialogTitle>
          <DialogDescription>
            <Badge className="mr-2">{template.category}</Badge>
            {template.createdAt && (
              <span className="text-muted-foreground">
                Created {formatDistanceToNow(new Date(template.createdAt), { addSuffix: true })}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="items">Checklist Items ({totalItems})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Steps</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalItems}</div>
                  <p className="text-xs text-muted-foreground">{requiredItems} required</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Est. Duration</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalDuration} min</div>
                  <p className="text-xs text-muted-foreground">
                    {Math.floor(totalDuration / 60)}h {totalDuration % 60}m
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {template.isActive ? (
                    <Badge variant="default" className="bg-green-500">Active</Badge>
                  ) : (
                    <Badge variant="outline">Inactive</Badge>
                  )}
                </CardContent>
              </Card>
            </div>

            {template.description && (
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Description</h3>
                <p className="text-muted-foreground whitespace-pre-line">
                  {template.description}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-lg font-medium">Template Details</h3>
              <div className="rounded-md border">
                <div className="grid grid-cols-2 p-4">
                  <div>
                    <p className="text-sm font-medium">Creator</p>
                    <p className="text-sm text-muted-foreground">{template.createdByName || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Last Updated</p>
                    <p className="text-sm text-muted-foreground">
                      {template.updatedAt 
                        ? formatDistanceToNow(new Date(template.updatedAt), { addSuffix: true })
                        : 'Never'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="items">
            {isLoading ? (
              <div className="text-center py-4">Loading items...</div>
            ) : sortedItems.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Assigned To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono w-10">{item.position}</TableCell>
                      <TableCell>
                        <div className="font-medium">{item.title}</div>
                        {item.description && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {item.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.isRequired ? (
                          <div className="flex items-center">
                            <Check className="h-4 w-4 mr-1 text-green-500" />
                            <span>Required</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Optional</span>
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
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-1 text-muted-foreground" />
                            <span>{item.assigneeRole.replace('_', ' ')}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Any Staff</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 border rounded-md bg-muted/20">
                <p className="text-muted-foreground">No items in this template.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}