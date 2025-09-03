import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { MoreHorizontal, FilePenLine, Trash2, Eye, Copy } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import EditTemplateDialog from './edit-template-dialog';
import ViewTemplateDialog from './view-template-dialog';
import { canEditTemplates, canDeleteTemplates } from '@/lib/rbac-helpers';
import { useUser } from '@/context/UserContext';

export default function TemplatesList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const [templateToEdit, setTemplateToEdit] = useState<any>(null);
  const [templateToView, setTemplateToView] = useState<any>(null);
  const [templateToDelete, setTemplateToDelete] = useState<any>(null);

  type TemplateRow = {
    id: number;
    name: string;
    category?: string | null;
    createdAt: string | Date;
    createdByName?: string | null;
  };

  const { data: templates = [], isLoading } = useQuery<TemplateRow[]>({
    queryKey: ['/api/treatment-templates'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/treatment-templates');
      return res.json();
    },
    staleTime: 60000, // 1 minute
  });

  const canEditTemplatesPermission = canEditTemplates(user);
  const canDeleteTemplatesPermission = canDeleteTemplates(user);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/treatment-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/treatment-templates'] });
      toast({
        title: 'Template deleted',
        description: 'The treatment template has been deleted successfully.',
      });
      setTemplateToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting template',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleDelete = () => {
    if (templateToDelete) {
      deleteMutation.mutate(templateToDelete.id);
    }
  };

  const getCategoryBadgeVariant = (category: string) => {
    const map: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      'Surgery': 'destructive',
      'Dental': 'secondary',
      'Vaccination': 'default',
      'Wellness': 'outline',
    };
    return map[category] || 'default';
  };

  if (isLoading) {
    return <div>Loading templates...</div>;
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No treatment templates found. Create one to get started.</p>
      </div>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Created By</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.map((template: any) => (
            <TableRow key={template.id}>
              <TableCell className="font-medium">{template.name}</TableCell>
              <TableCell>
                <Badge variant={getCategoryBadgeVariant(template.category)}>
                  {template.category}
                </Badge>
              </TableCell>
              <TableCell>{template.createdByName || 'Unknown'}</TableCell>
              <TableCell>
                {template.createdAt ? (
                  (() => {
                    const date = new Date(template.createdAt);
                    return isNaN(date.getTime()) ? 'Unknown' : formatDistanceToNow(date, { addSuffix: true });
                  })()
                ) : 'Unknown'}
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
                    <DropdownMenuItem onClick={() => setTemplateToView(template)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    {canEditTemplatesPermission && (
                      <DropdownMenuItem onClick={() => setTemplateToEdit(template)}>
                        <FilePenLine className="mr-2 h-4 w-4" />
                        Edit Template
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem>
                      <Copy className="mr-2 h-4 w-4" />
                      Duplicate
                    </DropdownMenuItem>
                    {canDeleteTemplatesPermission && (
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => setTemplateToDelete(template)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {templateToEdit && (
        <EditTemplateDialog
          template={templateToEdit}
          open={!!templateToEdit}
          onOpenChange={(open) => !open && setTemplateToEdit(null)}
        />
      )}

      {templateToView && (
        <ViewTemplateDialog
          template={templateToView}
          open={!!templateToView}
          onOpenChange={(open) => !open && setTemplateToView(null)}
        />
      )}

      <AlertDialog open={!!templateToDelete} onOpenChange={(open) => !open && setTemplateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this template?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the template
              and all of its associated items.
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