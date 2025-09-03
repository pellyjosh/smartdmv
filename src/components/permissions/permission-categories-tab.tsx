'use client';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, Search, Edit, Trash2, Layers, Shield, 
  Settings, MoreHorizontal, Eye, EyeOff 
} from 'lucide-react';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger
} from '@/components/ui/accordion';

interface PermissionCategory {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  isSystemDefined: boolean;
  sortOrder: number;
  createdAt: string;
  resources: PermissionResource[];
}

interface PermissionResource {
  id: string;
  name: string;
  description: string;
  actions: PermissionAction[];
  isActive: boolean;
}

interface PermissionAction {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

interface PermissionCategoriesTabProps {
  practiceId: number;
  isSuperAdmin: boolean;
}

export default function PermissionCategoriesTab({ practiceId, isSuperAdmin }: PermissionCategoriesTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<PermissionCategory | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch permission categories
  const { data: categories = [], isLoading, error } = useQuery<PermissionCategory[]>({
    queryKey: ['permission-categories', practiceId],
    queryFn: async () => {
      const response = await fetch(`/api/permission-categories?practiceId=${practiceId}`);
      if (!response.ok) throw new Error('Failed to fetch permission categories');
      return response.json();
    },
  });

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (categoryData: any) => {
      const response = await fetch('/api/permission-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...categoryData, practiceId }),
      });
      if (!response.ok) throw new Error('Failed to create permission category');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-categories', practiceId] });
      setIsCreateDialogOpen(false);
      toast({ title: 'Success', description: 'Permission category created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, ...categoryData }: any) => {
      const response = await fetch(`/api/permission-categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData),
      });
      if (!response.ok) throw new Error('Failed to update permission category');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-categories', practiceId] });
      setEditingCategory(null);
      toast({ title: 'Success', description: 'Permission category updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      const response = await fetch(`/api/permission-categories/${categoryId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete permission category');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-categories', practiceId] });
      toast({ title: 'Success', description: 'Permission category deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Toggle category status mutation
  const toggleCategoryMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await fetch(`/api/permission-categories/${id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      if (!response.ok) throw new Error('Failed to toggle category status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-categories', practiceId] });
      toast({ title: 'Success', description: 'Category status updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Filter categories
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateCategory = (data: any) => {
    createCategoryMutation.mutate(data);
  };

  const handleUpdateCategory = (data: any) => {
    updateCategoryMutation.mutate({ id: editingCategory?.id, ...data });
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (confirm('Are you sure you want to delete this permission category? This will affect all associated permissions.')) {
      deleteCategoryMutation.mutate(categoryId);
    }
  };

  const handleToggleCategory = (id: string, isActive: boolean) => {
    toggleCategoryMutation.mutate({ id, isActive });
  };

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Access Restricted</h3>
            <p className="text-muted-foreground">
              Permission categories can only be managed by Super Admins
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Error loading permission categories: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Permission Categories
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Organize permissions into logical categories for better management
              </p>
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Category
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Permission Category</DialogTitle>
                </DialogHeader>
                <CategoryForm onSubmit={handleCreateCategory} isLoading={createCategoryMutation.isPending} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center">Loading permission categories...</div>
            </CardContent>
          </Card>
        ) : filteredCategories.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No categories found</h3>
                <p className="text-muted-foreground mb-4">
                  Create permission categories to organize your system permissions
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Category
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Accordion type="multiple" className="space-y-4">
            {filteredCategories.map((category) => (
              <Card key={category.id}>
                <AccordionItem value={category.id} className="border-none">
                  <AccordionTrigger className="px-6 py-4 hover:no-underline">
                    <div className="flex items-center justify-between w-full mr-4">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          category.isSystemDefined ? 'bg-blue-100' : 'bg-purple-100'
                        }`}>
                          {category.isSystemDefined ? (
                            <Shield className={`h-4 w-4 ${category.isSystemDefined ? 'text-blue-600' : 'text-purple-600'}`} />
                          ) : (
                            <Settings className={`h-4 w-4 ${category.isSystemDefined ? 'text-blue-600' : 'text-purple-600'}`} />
                          )}
                        </div>
                        <div className="text-left">
                          <div className="font-medium flex items-center gap-2">
                            {category.name}
                            {!category.isActive && (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                            {category.isSystemDefined && (
                              <Badge variant="outline">System</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {category.description}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {category.resources.length} resources
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Switch
                            checked={category.isActive}
                            onCheckedChange={(checked) => handleToggleCategory(category.id, checked)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setEditingCategory(category)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              {!category.isSystemDefined && (
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteCategory(category.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  
                  <AccordionContent className="px-6 pb-4">
                    <div className="space-y-4">
                      {/* Resources */}
                      <div>
                        <h4 className="font-medium mb-3">Resources & Actions</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {category.resources.map((resource) => (
                            <div key={resource.id} className="border rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="font-medium text-sm capitalize">
                                  {resource.name.replace(/_/g, ' ')}
                                </h5>
                                <Badge variant={resource.isActive ? "default" : "secondary"} className="text-xs">
                                  {resource.isActive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mb-2">
                                {resource.description}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {resource.actions.map((action) => (
                                  <Badge 
                                    key={action.id} 
                                    variant="outline" 
                                    className={`text-xs ${!action.isActive ? 'opacity-50' : ''}`}
                                  >
                                    {action.name}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Card>
            ))}
          </Accordion>
        )}
      </div>

      {/* Edit Category Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Permission Category</DialogTitle>
          </DialogHeader>
          {editingCategory && (
            <CategoryForm 
              initialData={editingCategory} 
              onSubmit={handleUpdateCategory} 
              isLoading={updateCategoryMutation.isPending}
              readOnly={editingCategory.isSystemDefined}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Category Form Component
function CategoryForm({ 
  initialData, 
  onSubmit, 
  isLoading, 
  readOnly = false 
}: { 
  initialData?: PermissionCategory; 
  onSubmit: (data: any) => void; 
  isLoading: boolean; 
  readOnly?: boolean;
}) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    isActive: initialData?.isActive ?? true,
    sortOrder: initialData?.sortOrder || 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!readOnly) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Category Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter category name"
          required
          disabled={readOnly}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe this category's purpose"
          rows={3}
          disabled={readOnly}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="isActive"
            checked={formData.isActive}
            onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
            disabled={readOnly}
          />
          <Label htmlFor="isActive">Active</Label>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="sortOrder">Sort Order</Label>
          <Input
            id="sortOrder"
            type="number"
            value={formData.sortOrder}
            onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
            placeholder="0"
            disabled={readOnly}
          />
        </div>
      </div>
      
      {!readOnly && (
        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : initialData ? 'Update Category' : 'Create Category'}
          </Button>
        </div>
      )}
    </form>
  );
}
