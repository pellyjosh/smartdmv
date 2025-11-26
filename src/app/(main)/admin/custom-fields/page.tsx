"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Loader2, Plus, Pencil, Trash2, ChevronDown, ChevronRight,
  MoveVertical, ArrowUpDown, AlertCircle, Info, Database,
  FileSymlink, Check, Settings, Tag, Grid3X3, Link2, Unlink,
  MoveHorizontal, ArrowLeftRight, X
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';

import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useUser } from '@/context/UserContext';
import { Switch } from '@/components/ui/switch';
import { apiRequest } from '@/lib/queryClient';
import { UserRoleEnum } from "@/db/schemas/usersSchema";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCustomFields, type CustomFieldCategory, type CustomFieldGroup, type CustomFieldValue, type CustomFieldDependency } from '@/hooks/use-custom-fields';

//' (see below for folder content) Draggable field item component for the relationship builder
interface FieldItemProps {
  id: string;
  name: string;
  type: "group" | "value";
  isParent?: boolean;
  index?: number;
  group?: CustomFieldGroup;
  value?: CustomFieldValue;
  onRemove?: () => void;
}

const FieldItem = ({
  id,
  name,
  type,
  isParent = false,
  index,
  onRemove
}: FieldItemProps) => {
  return (
    <div
      className={`p-3 rounded-md border mb-2 cursor-move flex justify-between items-center ${isParent ? 'bg-primary/10' : 'bg-card'}`}
      data-id={id}
    >
      <div className="flex items-center gap-2">
        {type === "group" ? (
          <Tag className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Grid3X3 className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="font-medium">{name}</span>
        {isParent && (
          <Badge variant="outline" className="ml-2 text-xs">
            Parent
          </Badge>
        )}
      </div>

      {onRemove && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="h-8 w-8"
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Remove</span>
        </Button>
      )}
    </div>
  );
};

// Relationship visualization component
interface RelationshipLinkProps {
  dependencyId: number;
  parentId: number;
  parentName: string;
  childId: number;
  childName: string;
  type: string;
  onDelete: () => void;
  onEdit: (dependencyId: number) => void;
}

const RelationshipLink = ({
  dependencyId,
  parentId,
  parentName,
  childId,
  childName,
  type,
  onDelete,
  onEdit
}: RelationshipLinkProps) => {
  return (
    <div className="bg-muted p-3 rounded-md border mb-3 flex items-center justify-between">
      <div className="flex-1 flex items-center gap-2">
        <div className="font-medium">{parentName}</div>
        <ArrowLeftRight className="h-4 w-4 mx-2 text-muted-foreground" />
        <div className="font-medium">{childName}</div>
        <Badge variant="outline" className="ml-2">
          {type === "show_when_selected" ? "Show When Selected" :
           type === "hide_when_selected" ? "Hide When Selected" : "Filter Values"}
        </Badge>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(dependencyId)}
          className="h-8 w-8"
        >
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Edit Relationship</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="h-8 w-8"
        >
          <Unlink className="h-4 w-4" />
          <span className="sr-only">Delete Relationship</span>
        </Button>
      </div>
    </div>
  );
};

// Relationship builder component
interface RelationshipBuilderProps {
  setActiveTab: (tab: string) => void;
}

const RelationshipBuilder = ({ setActiveTab }: RelationshipBuilderProps) => {
  const { toast } = useToast();
  const { user, userPracticeId } = useUser();
  const practiceId = userPracticeId;

  const {
    groups,
    values,
    dependencies,
    getDependenciesByGroupId,
    createDependency,
    updateDependency,
    deleteDependency,
    isDependencyMutating,
    invalidateCustomFieldQueries
  } = useCustomFields();

  const groupList: CustomFieldGroup[] = Array.isArray(groups) ? (groups as CustomFieldGroup[]) : [];
  const valueList: CustomFieldValue[] = Array.isArray(values) ? (values as CustomFieldValue[]) : [];
  const dependencyList: CustomFieldDependency[] = Array.isArray(dependencies) ? (dependencies as CustomFieldDependency[]) : [];

  // State for managing the UI
  const [selectedParentGroup, setSelectedParentGroup] = useState<CustomFieldGroup | null>(null);
  const [selectedChildGroup, setSelectedChildGroup] = useState<CustomFieldGroup | null>(null);
  const [selectedParentValue, setSelectedParentValue] = useState<CustomFieldValue | null>(null);
  const [dependencyType, setDependencyType] = useState<"show_when_selected" | "hide_when_selected" | "filter_values">("show_when_selected");
  const [editingDependencyId, setEditingDependencyId] = useState<number | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Find groups with specific keys for common use cases
  const speciesGroup = groupList.find((g: CustomFieldGroup) =>
    g.key === 'species' || g.key === 'animal_species' || g.key === 'pet_species'
  );

  const breedGroup = groupList.find((g: CustomFieldGroup) =>
    g.key === 'breeds' || g.key === 'animal_breeds' || g.key === 'pet_breeds'
  );

  // Get existing dependencies between species and breeds
  const speciesBreedDependencies = speciesGroup && breedGroup
    ? dependencyList.filter((d: CustomFieldDependency) =>
        d.parentGroupId === speciesGroup.id && d.childGroupId === breedGroup.id
      )
    : [];

  // Initialize drag sensors
  const sensors = [
    { sensor: MouseSensor, options: { activationConstraint: { distance: 5 } } },
    { sensor: TouchSensor, options: { activationConstraint: { delay: 250, tolerance: 5 } } }
  ];

  // Handle creating a new dependency
  const handleCreateDependency = useCallback(() => {
    if (!selectedParentGroup || !selectedChildGroup || !practiceId) {
      toast({
        title: "Cannot create relationship",
        description: "Please select both parent and child groups first.",
        variant: "destructive",
      });
      return;
    }

    const newDependency = {
      parentGroupId: selectedParentGroup.id,
      childGroupId: selectedChildGroup.id,
      parentValueId: selectedParentValue?.id || null,
      filterType: dependencyType,
      practiceId: Number(practiceId)
    };

    createDependency(newDependency);

    // Reset selections after creating
    setSelectedParentGroup(null);
    setSelectedChildGroup(null);
    setSelectedParentValue(null);
  }, [
    selectedParentGroup,
    selectedChildGroup,
    selectedParentValue,
    dependencyType,
    practiceId,
    createDependency,
    toast
  ]);

  // Handle deleting a dependency
  const handleDeleteDependency = useCallback((id: number) => {
    deleteDependency(id);
  }, [deleteDependency]);

  // Handle editing a dependency
  const handleEditDependency = useCallback((id: number) => {
    const dependency = dependencyList.find((dep: CustomFieldDependency) => dep.id === id);
    if (!dependency) {
      toast({
        title: "Error",
        description: "Could not find the dependency to edit",
        variant: "destructive",
      });
      return;
    }

    // Ensure we're on the relationships tab
    setActiveTab("relationships");

    // Find the parent and child groups
    const parentGroup = groupList.find((g: CustomFieldGroup) => g.id === dependency.parentGroupId);
    const childGroup = groupList.find((g: CustomFieldGroup) => g.id === dependency.childGroupId);
    const parentValue = dependency.parentValueId
      ? valueList.find((v: CustomFieldValue) => v.id === dependency.parentValueId)
      : null;

    if (!parentGroup || !childGroup) {
      toast({
        title: "Error",
        description: "Could not find the groups associated with this dependency",
        variant: "destructive",
      });
      return;
    }

    // Set the state for editing
    setSelectedParentGroup(parentGroup);
    setSelectedChildGroup(childGroup);
    setSelectedParentValue(parentValue || null);
    setDependencyType(dependency.filterType);
    setEditingDependencyId(id);
    setIsEditMode(true);

    // Use a small timeout to ensure tab change happens first
    setTimeout(() => {
      // Scroll to the relationship builder section
      const builderSection = document.getElementById('relationship-builder');
      if (builderSection) {
        builderSection.scrollIntoView({ behavior: 'smooth' });
      }

      toast({
        title: "Edit Mode",
        description: "Now editing the selected relationship. Make changes and click Update.",
      });
    }, 100);
  }, [dependencies, groups, values, toast, setActiveTab]);

  // Handle updating a dependency
  const handleUpdateDependency = useCallback((id: number) => {
    if (!selectedParentGroup || !selectedChildGroup || !practiceId) {
      toast({
        title: "Cannot update relationship",
        description: "Please select both parent and child groups first.",
        variant: "destructive",
      });
      return;
    }

    const updatedDependency = {
      parentGroupId: selectedParentGroup.id,
      childGroupId: selectedChildGroup.id,
      parentValueId: selectedParentValue?.id || null,
      filterType: dependencyType,
    };

    updateDependency({
      id: id,
      data: updatedDependency
    });

    // Reset edit mode and selections after updating
    setEditingDependencyId(null);
    setIsEditMode(false);
    setSelectedParentGroup(null);
    setSelectedChildGroup(null);
    setSelectedParentValue(null);
    setDependencyType("show_when_selected");

    toast({
      title: "Success",
      description: "The relationship has been updated successfully.",
    });
  }, [
    selectedParentGroup,
    selectedChildGroup,
    selectedParentValue,
    dependencyType,
    practiceId,
    updateDependency,
    toast
  ]);

  // Get parent group values
  const parentGroupValues = selectedParentGroup
    ? valueList.filter((v: CustomFieldValue) => v.groupId === selectedParentGroup.id).sort((a: CustomFieldValue, b: CustomFieldValue) => a.sortOrder - b.sortOrder)
    : [];

  return (
    <div className="space-y-6">
      {/* Species-Breeds Quick Setup Section */}
      {speciesGroup && breedGroup && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span>Species-Breeds Relationship</span>
              <Badge variant="outline" className="ml-2">Common Setup</Badge>
            </CardTitle>
            <CardDescription>
              Quickly establish relationships between species and breeds.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <h4 className="text-sm font-medium mb-2">Species Group</h4>
                  <div className="border rounded-md p-2 bg-card">
                    {speciesGroup.name}
                    <Badge variant="outline" className="ml-2 text-xs font-mono">{speciesGroup.key}</Badge>
                  </div>
                </div>
                <ArrowLeftRight className="h-6 w-6 text-muted-foreground" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium mb-2">Breeds Group</h4>
                  <div className="border rounded-md p-2 bg-card">
                    {breedGroup.name}
                    <Badge variant="outline" className="ml-2 text-xs font-mono">{breedGroup.key}</Badge>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Current Relationships</h4>
                {speciesBreedDependencies && speciesBreedDependencies.length > 0 ? (
                  <div className="space-y-2">
                    {speciesBreedDependencies.map((dep) => {
                      const parentValue = dep.parentValueId
                        ? valueList.find((v: CustomFieldValue) => v.id === dep.parentValueId)
                        : null;

                      const parentName = parentValue
                        ? `${speciesGroup.name}: ${parentValue.label}`
                        : speciesGroup.name;

                      return (
                        <RelationshipLink
                          key={dep.id}
                          dependencyId={dep.id}
                          parentId={dep.parentGroupId}
                          parentName={parentName}
                          childId={dep.childGroupId}
                          childName={breedGroup.name}
                          type={dep.filterType}
                          onDelete={() => handleDeleteDependency(dep.id)}
                          onEdit={(id) => handleEditDependency(id)}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center p-4 border border-dashed rounded-md">
                    <p className="text-muted-foreground">No species-breed relationships defined yet.</p>
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Add New Relationship</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="species-value">Species Value (Optional)</Label>
                    <select
                      id="species-value"
                      className="w-full p-2 border rounded-md"
                      value={selectedParentValue?.id || ""}
                      onChange={(e) => {
                        const valueId = parseInt(e.target.value);
                        const value = valueList.find((v: CustomFieldValue) => v.id === valueId) || null;
                        setSelectedParentValue(value);
                      }}
                    >
                      <option value="">All Species (No Filter)</option>
                      {valueList
                        .filter((v: CustomFieldValue) => v.groupId === speciesGroup.id)
                        .map((value: CustomFieldValue) => (
                          <option key={value.id} value={value.id}>{value.label}</option>
                        ))
                      }
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      If selected, breeds will only show for this specific species.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="dependency-type">Relationship Type</Label>
                    <select
                      id="dependency-type"
                      className="w-full p-2 border rounded-md"
                      value={dependencyType}
                      onChange={(e) => setDependencyType(e.target.value as any)}
                    >
                      <option value="show_when_selected">Show Breeds When Species Selected</option>
                      <option value="hide_when_selected">Hide Breeds When Species Selected</option>
                      <option value="filter_values">Filter Breeds Based on Species</option>
                    </select>
                  </div>
                </div>
                <Button
                  className="mt-4 w-full"
                  onClick={() => {
                    createDependency({
                      parentGroupId: speciesGroup.id,
                      childGroupId: breedGroup.id,
                      parentValueId: selectedParentValue?.id || null,
                      filterType: dependencyType,
                      practiceId: Number(practiceId!)
                    });
                    setSelectedParentValue(null);
                  }}
                  disabled={isDependencyMutating}
                >
                  {isDependencyMutating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Link2 className="mr-2 h-4 w-4" />
                      Create Relationship
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom Field Groups Listing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Available Field Groups</CardTitle>
          <CardDescription>
            These are your custom field groups that can be linked together.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupList.map((group: CustomFieldGroup) => (
              <Card key={group.id} className="overflow-hidden border shadow-sm">
                <CardHeader className="p-3">
                  <CardTitle className="text-base flex items-center">
                    {group.name}
                    {group.isSystem && (
                      <Badge variant="secondary" className="ml-2 text-xs">System</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    <Badge variant="outline" className="text-xs font-mono">
                      {group.key}
                    </Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="text-sm">
                    <div className="mb-2">
                      <span className="text-muted-foreground">Values: </span>
                      <span className="font-medium">
                        {valueList.filter((v: CustomFieldValue) => v.groupId === group.id).length || 0}
                      </span>
                    </div>
                    <div className="mb-2 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setSelectedParentGroup(group)}
                      >
                        Set as Parent
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setSelectedChildGroup(group)}
                      >
                        Set as Child
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Relationship Builder Interface */}
      <Card id="relationship-builder">
        <CardHeader>
          <CardTitle className="text-lg">Custom Relationship Builder</CardTitle>
          <CardDescription>
            {isEditMode
              ? "Edit an existing relationship between field groups."
              : "Create custom relationships between any field groups."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-medium mb-3">Parent Group</h3>
              {selectedParentGroup ? (
                <div className="border rounded-md p-3 bg-primary/5">
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-medium">{selectedParentGroup.name}</div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedParentGroup(null)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="mb-3">
                    <Label htmlFor="parent-value" className="text-xs">Filter by specific value (optional)</Label>
                    <select
                      id="parent-value"
                      className="w-full p-2 border rounded-md mt-1"
                      value={selectedParentValue?.id || ""}
                      onChange={(e) => {
                        const valueId = parseInt(e.target.value);
                        const value = valueList.find((v: CustomFieldValue) => v.id === valueId) || null;
                        setSelectedParentValue(value);
                      }}
                    >
                      <option value="">All Values (No Filter)</option>
                      {parentGroupValues?.map(value => (
                        <option key={value.id} value={value.id}>{value.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed rounded-md p-4 flex flex-col items-center justify-center text-muted-foreground">
                  <p className="mb-2 text-center">No parent group selected</p>
                  <p className="text-xs text-center mb-3">Select a parent group from the list above</p>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-medium mb-3">Relationship Type</h3>
              <div className="border rounded-md p-3">
                <select
                  className="w-full p-2 border rounded-md mb-3"
                  value={dependencyType}
                  onChange={(e) => setDependencyType(e.target.value as any)}
                >
                  <option value="show_when_selected">Show When Selected</option>
                  <option value="hide_when_selected">Hide When Selected</option>
                  <option value="filter_values">Filter Values</option>
                </select>

                <div className="text-xs text-muted-foreground space-y-2">
                  <p className="font-medium">Explanation:</p>
                  {dependencyType === "show_when_selected" && (
                    <p>Child field will only be visible when the parent field is selected.</p>
                  )}
                  {dependencyType === "hide_when_selected" && (
                    <p>Child field will be hidden when the parent field is selected.</p>
                  )}
                  {dependencyType === "filter_values" && (
                    <p>Child field values will be filtered based on the selected parent value.</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-3">Child Group</h3>
              {selectedChildGroup ? (
                <div className="border rounded-md p-3">
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-medium">{selectedChildGroup.name}</div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedChildGroup(null)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed rounded-md p-4 flex flex-col items-center justify-center text-muted-foreground">
                  <p className="mb-2 text-center">No child group selected</p>
                  <p className="text-xs text-center mb-3">Select a child group from the list above</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-6">
            {isEditMode && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setEditingDependencyId(null);
                  setIsEditMode(false);
                  setSelectedParentGroup(null);
                  setSelectedChildGroup(null);
                  setSelectedParentValue(null);
                  setDependencyType("show_when_selected");
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel Editing
              </Button>
            )}

            <Button
              className="w-full"
              disabled={!selectedParentGroup || !selectedChildGroup || isDependencyMutating}
              onClick={isEditMode && editingDependencyId ?
                () => handleUpdateDependency(editingDependencyId) :
                handleCreateDependency
              }
            >
              {isDependencyMutating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditMode ? "Updating Relationship..." : "Creating Relationship..."}
                </>
              ) : (
                <>
                  {isEditMode ? (
                    <>
                      <Pencil className="mr-2 h-4 w-4" />
                      Update Relationship
                    </>
                  ) : (
                    <>
                      <Link2 className="mr-2 h-4 w-4" />
                      Create Relationship
                    </>
                  )}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing Relationships List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Existing Relationships</CardTitle>
          <CardDescription>
            All current relationships between your custom field groups.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dependencyList.length > 0 ? (
            <div className="space-y-3">
              {dependencyList.map((dep: CustomFieldDependency) => {
                const parentGroup = groupList.find((g: CustomFieldGroup) => g.id === dep.parentGroupId);
                const childGroup = groupList.find((g: CustomFieldGroup) => g.id === dep.childGroupId);
                const parentValue = dep.parentValueId
                  ? valueList.find((v: CustomFieldValue) => v.id === dep.parentValueId)
                  : null;

                if (!parentGroup || !childGroup) return null;

                const parentName = parentValue
                  ? `${parentGroup.name}: ${parentValue.label}`
                  : parentGroup.name;

                return (
                  <RelationshipLink
                    key={dep.id}
                    dependencyId={dep.id}
                    parentId={dep.parentGroupId}
                    parentName={parentName}
                    childId={dep.childGroupId}
                    childName={childGroup.name}
                    type={dep.filterType}
                    onDelete={() => handleDeleteDependency(dep.id)}
                    onEdit={(id) => handleEditDependency(id)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center p-6 border border-dashed rounded-md">
              <p className="text-muted-foreground">No relationships defined yet.</p>
              <p className="text-sm text-muted-foreground mt-2">Create your first relationship using the tools above.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Helper functions outside the component to avoid hooks rule violations
const generateKey = (name: string) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
};

// Component that displays the category tooltip
const CategoryTooltip = ({ category }: { category: CustomFieldCategory }) => {
  if (!category.key) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="mr-2">
            <code className="text-xs">{category.key}</code>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Unique identifier for API access</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Component that displays the category actions
const CategoryActions = ({
  category,
  canManageCustomFields,
  onEdit,
  onDelete
}: {
  category: CustomFieldCategory,
  canManageCustomFields: boolean,
  onEdit: (category: CustomFieldCategory) => void,
  onDelete: (category: CustomFieldCategory) => void
}) => {
  if (!canManageCustomFields || category.isSystem) return null;

  return (
    <div className="flex gap-1">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => onEdit(category)}>
              <Pencil className="h-3.5 w-3.5" />
              <span className="sr-only">Edit category</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Edit this category</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => onDelete(category)}>
              <Trash2 className="h-3.5 w-3.5" />
              <span className="sr-only">Delete category</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Delete this category and all its groups</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

// Component that displays the group actions
const GroupActions = ({
  group,
  canManageCustomFields,
  onEdit,
  onDelete
}: {
  group: CustomFieldGroup,
  canManageCustomFields: boolean,
  onEdit: (group: CustomFieldGroup) => void,
  onDelete: (group: CustomFieldGroup) => void
}) => {
  if (!canManageCustomFields || group.isSystem) return null;

  return (
    <div className="flex gap-1">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => onEdit(group)}>
              <Pencil className="h-3.5 w-3.5" />
              <span className="sr-only">Edit group</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Edit this group</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => onDelete(group)}>
              <Trash2 className="h-3.5 w-3.5" />
              <span className="sr-only">Delete group</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Delete this group and all its values</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

// Component that displays the value actions menu
const ValueActionsMenu = ({
  value,
  group,
  values,
  canManageCustomFields,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete
}: {
  value: CustomFieldValue,
  group: CustomFieldGroup,
  values: CustomFieldValue[],
  canManageCustomFields: boolean,
  onMoveUp: (value: CustomFieldValue) => void,
  onMoveDown: (value: CustomFieldValue) => void,
  onEdit: (value: CustomFieldValue) => void,
  onDelete: (value: CustomFieldValue) => void
}) => {
  const groupValues = Array.isArray(values)
    ? values.filter(v => v.groupId === group.id).sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

  const isFirstValue = groupValues[0]?.id === value.id;
  const isLastValue = groupValues.slice(-1)[0]?.id === value.id;

  if (!canManageCustomFields) return null;

  return (
    <div className="flex justify-end items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoveVertical className="h-3.5 w-3.5" />
            <span className="sr-only">Reorder value</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => onMoveUp(value)}
            disabled={isFirstValue}
          >
            Move Up
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onMoveDown(value)}
            disabled={isLastValue}
          >
            Move Down
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button variant="ghost" size="icon" onClick={() => onEdit(value)}>
        <Pencil className="h-3.5 w-3.5" />
        <span className="sr-only">Edit value</span>
      </Button>

      {!value.isSystem && (
        <Button variant="ghost" size="icon" onClick={() => onDelete(value)}>
          <Trash2 className="h-3.5 w-3.5" />
          <span className="sr-only">Delete value</span>
        </Button>
      )}
    </div>
  );
};

// Main component
const CustomFieldsPage = () => {
  const { user, userPracticeId } = useUser();
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [activeGroup, setActiveGroup] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<string>("categories");

  const {
    categories,
    groups,
    values,
    dependencies,
    isLoading,
    invalidateCustomFieldQueries
  } = useCustomFields();

  const categoryList: CustomFieldCategory[] = Array.isArray(categories) ? (categories as CustomFieldCategory[]) : [];
  const groupList: CustomFieldGroup[] = Array.isArray(groups) ? (groups as CustomFieldGroup[]) : [];
  const valueList: CustomFieldValue[] = Array.isArray(values) ? (values as CustomFieldValue[]) : [];
  const dependencyList: CustomFieldDependency[] = Array.isArray(dependencies) ? (dependencies as CustomFieldDependency[]) : [];

  // Dialog states
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [valueDialogOpen, setValueDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CustomFieldCategory | null>(null);
  const [editingGroup, setEditingGroup] = useState<CustomFieldGroup | null>(null);
  const [editingValue, setEditingValue] = useState<CustomFieldValue | null>(null);

  // Form states
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    key: '',
    description: '',
    isSystem: false,
    practiceId: Number(userPracticeId) || 0
  });

  const [groupForm, setGroupForm] = useState({
    name: '',
    key: '',
    description: '',
    isSystem: false,
    categoryId: 0,
    practiceId: Number(userPracticeId) || 0
  });

  const [valueForm, setValueForm] = useState({
    value: '',
    label: '',
    isActive: true,
    sortOrder: 0,
    isDefault: false,
    isSystem: false,
    groupId: 0,
    practiceId: Number(userPracticeId) || 0
  });


  // Mutations for creating data
  const createCategoryMutation = useMutation({
    mutationFn: async (category: typeof categoryForm) => {
      const res = await apiRequest('POST', '/api/custom-fields/categories', category);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Category created',
        description: 'The custom field category has been created successfully.',
      });
      setCategoryForm({
        name: '',
        key: '',
        description: '',
        isSystem: false,
        practiceId: Number(userPracticeId) || 0
      });
      setCategoryDialogOpen(false);
      invalidateCustomFieldQueries();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creating category',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: async (group: typeof groupForm) => {
      const res = await apiRequest('POST', '/api/custom-fields/groups', group);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Group created',
        description: 'The custom field group has been created successfully.',
      });
      setGroupForm({
        name: '',
        key: '',
        description: '',
        isSystem: false,
        categoryId: 0,
        practiceId: Number(userPracticeId) || 0
      });
      setGroupDialogOpen(false);
      invalidateCustomFieldQueries();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creating group',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const createValueMutation = useMutation({
    mutationFn: async (value: typeof valueForm) => {
      const res = await apiRequest('POST', '/api/custom-fields/values', value);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Value created',
        description: 'The custom field value has been created successfully.',
      });
      setValueForm({
        value: '',
        label: '',
        isActive: true,
        sortOrder: 0,
        isDefault: false,
        isSystem: false,
        groupId: 0,
        practiceId: Number(userPracticeId) || 0
      });
      setValueDialogOpen(false);
      invalidateCustomFieldQueries();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creating value',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutations for updating data
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<typeof categoryForm> }) => {
      const res = await apiRequest('PUT', `/api/custom-fields/categories/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Category updated',
        description: 'The custom field category has been updated successfully.',
      });
      setCategoryDialogOpen(false);
      invalidateCustomFieldQueries();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating category',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<typeof groupForm> }) => {
      const res = await apiRequest('PUT', `/api/custom-fields/groups/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Group updated',
        description: 'The custom field group has been updated successfully.',
      });
      setGroupDialogOpen(false);
      invalidateCustomFieldQueries();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating group',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateValueMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<typeof valueForm> }) => {
      const res = await apiRequest('PUT', `/api/custom-fields/values/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Value updated',
        description: 'The custom field value has been updated successfully.',
      });
      setValueDialogOpen(false);
      invalidateCustomFieldQueries();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating value',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutations for deleting data
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/custom-fields/categories/${id}`);
      if (res.ok) return id;
      throw new Error('Failed to delete category');
    },
    onSuccess: () => {
      toast({
        title: 'Category deleted',
        description: 'The custom field category has been deleted successfully.',
      });
      invalidateCustomFieldQueries();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting category',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/custom-fields/groups/${id}`);
      if (res.ok) return id;
      throw new Error('Failed to delete group');
    },
    onSuccess: () => {
      toast({
        title: 'Group deleted',
        description: 'The custom field group has been deleted successfully.',
      });
      invalidateCustomFieldQueries();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting group',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteValueMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/custom-fields/values/${id}`);
      if (res.ok) return id;
      throw new Error('Failed to delete value');
    },
    onSuccess: () => {
      toast({
        title: 'Value deleted',
        description: 'The custom field value has been deleted successfully.',
      });
      invalidateCustomFieldQueries();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting value',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Add mutation handlers for reordering values
  const reorderValueMutation = useMutation({
    mutationFn: async ({ id, newSortOrder }: { id: number; newSortOrder: number }) => {
      const res = await apiRequest('PUT', `/api/custom-fields/values/${id}`, { sortOrder: newSortOrder });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Values reordered',
        description: 'The sort order has been updated successfully.',
      });
      invalidateCustomFieldQueries();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error reordering values',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Form submission handlers
  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCategory) {
      updateCategoryMutation.mutate({
        id: editingCategory.id,
        data: {
          name: categoryForm.name,
          key: categoryForm.key,
          description: categoryForm.description
        }
      });
    } else {
      createCategoryMutation.mutate(categoryForm);
    }
  };

  const handleGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingGroup) {
      updateGroupMutation.mutate({
        id: editingGroup.id,
        data: {
          name: groupForm.name,
          key: groupForm.key,
          description: groupForm.description,
          isSystem: groupForm.isSystem
        }
      });
    } else {
      createGroupMutation.mutate(groupForm);
    }
  };

  const handleValueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingValue) {
      updateValueMutation.mutate({
        id: editingValue.id,
        data: {
          value: valueForm.value,
          label: valueForm.label,
          isActive: valueForm.isActive,
          sortOrder: valueForm.sortOrder,
          isDefault: valueForm.isDefault,
        }
      });
    } else {
      createValueMutation.mutate(valueForm);
    }
  };

  // Dialog open handlers
  const openAddCategoryDialog = useCallback(() => {
    setEditingCategory(null);
    setCategoryForm({
      name: '',
      key: '',
      description: '',
      isSystem: false,
      practiceId: Number(userPracticeId) || 0
    });
    setCategoryDialogOpen(true);
  }, [userPracticeId]);

  const openEditCategoryDialog = useCallback((category: CustomFieldCategory) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      key: category.key,
      description: category.description || '',
      isSystem: category.isSystem,
      practiceId: category.practiceId
    });
    setCategoryDialogOpen(true);
  }, []);

  const openAddGroupDialog = useCallback((categoryId: number) => {
    setEditingGroup(null);
    setGroupForm({
      name: '',
      key: '',
      description: '',
      isSystem: false,
      categoryId: categoryId,
      practiceId: Number(userPracticeId) || 0
    });
    setGroupDialogOpen(true);
  }, [userPracticeId]);

  const openEditGroupDialog = useCallback((group: CustomFieldGroup) => {
    setEditingGroup(group);
    setGroupForm({
      name: group.name,
      key: group.key,
      description: group.description || '',
      isSystem: group.isSystem,
      categoryId: group.categoryId,
      practiceId: group.practiceId
    });
    setGroupDialogOpen(true);
  }, []);

  const openAddValueDialog = useCallback((groupId: number) => {
    setEditingValue(null);
    setValueForm({
      value: '',
      label: '',
      isActive: true,
      sortOrder: valueList.filter((v: CustomFieldValue) => v.groupId === groupId).length,
      isDefault: false,
      isSystem: false,
      groupId: groupId,
      practiceId: Number(userPracticeId) || 0
    });
    setValueDialogOpen(true);
  }, [userPracticeId, valueList]);

  const openEditValueDialog = useCallback((value: CustomFieldValue) => {
    setEditingValue(value);
    setValueForm({
      value: value.value,
      label: value.label,
      isActive: value.isActive,
      sortOrder: value.sortOrder,
      isDefault: value.isDefault,
      isSystem: value.isSystem,
      groupId: value.groupId,
      practiceId: value.practiceId
    });
    setValueDialogOpen(true);
  }, []);

  // Deletion handlers
  const handleDeleteCategory = useCallback((category: CustomFieldCategory) => {
    if (window.confirm(`Are you sure you want to delete the category "${category.name}"? This will also delete all groups and values within this category.`)) {
      deleteCategoryMutation.mutate(category.id);
    }
  }, [deleteCategoryMutation]);

  const handleDeleteGroup = useCallback((group: CustomFieldGroup) => {
    if (window.confirm(`Are you sure you want to delete the group "${group.name}"? This will also delete all values within this group.`)) {
      deleteGroupMutation.mutate(group.id);
    }
  }, [deleteGroupMutation]);

  const handleDeleteValue = useCallback((value: CustomFieldValue) => {
    if (window.confirm(`Are you sure you want to delete the value "${value.label}"?`)) {
      deleteValueMutation.mutate(value.id);
    }
  }, [deleteValueMutation]);

  // Function to sync all custom field selects
  const syncCustomFieldSelects = useCallback(() => {
    // Log that we're syncing
    console.log("Syncing all custom field selects");

    // Invalidate all queries first
    invalidateCustomFieldQueries();

    // Then refresh all instances
    // @ts-ignore
    if (window.refreshCustomFieldSelects) {
      // @ts-ignore
      Object.keys(window.refreshCustomFieldSelects).forEach(key => {
        // @ts-ignore
        if (typeof window.refreshCustomFieldSelects[key] === 'function') {
          console.log(`Syncing custom field select: ${key}`);
          // @ts-ignore
          window.refreshCustomFieldSelects[key]();
        }
      });
    }

    toast({
      title: "Custom Fields Synced",
      description: "All custom field dropdowns have been refreshed with the latest data.",
    });
  }, [invalidateCustomFieldQueries, toast]);

  const resetCustomFieldsToDefaults = useCallback(async () => {
    try {
      if (!userPracticeId) {
        toast({ title: "Practice not found", description: "Cannot reset without a valid practice." });
        return;
      }
      const confirmed = window.confirm("Reset custom fields to default values? This will replace current fields.");
      if (!confirmed) return;
      const res = await fetch(`/api/custom-fields/reset/practice/${userPracticeId}`, { method: 'POST' });
      if (!res.ok) throw new Error('Reset failed');
      invalidateCustomFieldQueries();
      // @ts-ignore
      if (window.refreshCustomFieldSelects) {
        // @ts-ignore
        Object.keys(window.refreshCustomFieldSelects).forEach(key => {
          // @ts-ignore
          if (typeof window.refreshCustomFieldSelects[key] === 'function') {
            // @ts-ignore
            window.refreshCustomFieldSelects[key]();
          }
        });
      }
      toast({ title: "Custom Fields Reset", description: "Defaults have been restored and UI refreshed." });
    } catch (e: any) {
      toast({ title: "Reset failed", description: e?.message || String(e), variant: 'destructive' });
    }
  }, [invalidateCustomFieldQueries, toast, userPracticeId]);

  // Function to move a value up or down in the sort order
  const moveValue = useCallback((value: CustomFieldValue, direction: 'up' | 'down') => {
    const groupValues = valueList
      .filter((v: CustomFieldValue) => v.groupId === value.groupId)
      .sort((a: CustomFieldValue, b: CustomFieldValue) => a.sortOrder - b.sortOrder);

    const currentIndex = groupValues.findIndex(v => v.id === value.id);
    if (direction === 'up' && currentIndex > 0) {
      const newOrder = groupValues[currentIndex - 1].sortOrder;
      const otherValueId = groupValues[currentIndex - 1].id;

      // Update the value being moved up
      reorderValueMutation.mutate({ id: value.id, newSortOrder: newOrder });
      // Update the value being moved down
      reorderValueMutation.mutate({ id: otherValueId, newSortOrder: value.sortOrder });
    } else if (direction === 'down' && currentIndex < groupValues.length - 1) {
      const newOrder = groupValues[currentIndex + 1].sortOrder;
      const otherValueId = groupValues[currentIndex + 1].id;

      // Update the value being moved down
      reorderValueMutation.mutate({ id: value.id, newSortOrder: newOrder });
      // Update the value being moved up
      reorderValueMutation.mutate({ id: otherValueId, newSortOrder: value.sortOrder });
    }
  }, [valueList, reorderValueMutation]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // Check if user has permission to manage custom fields
  const canManageCustomFields = user && (
    user.role === UserRoleEnum.SUPER_ADMIN ||
    user.role === UserRoleEnum.PRACTICE_ADMINISTRATOR ||
    user.role === UserRoleEnum.PRACTICE_MANAGER
  );

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customizable Dropdown Fields</h1>
          <p className="text-muted-foreground mt-2">
            Configure and manage dropdown fields to standardize data entry across your practice
          </p>
        </div>
        <div className="flex gap-2">
          {canManageCustomFields && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={resetCustomFieldsToDefaults} variant="outline">
                      <FileSymlink className="w-4 h-4 mr-2" />
                      Reset
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Reset custom fields to seeded defaults for this practice</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={openAddCategoryDialog}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Category
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Create a new dropdown category</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
        </div>
      </div>

      {!canManageCustomFields && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex gap-2 items-center text-yellow-700">
              <AlertCircle className="h-5 w-5" />
              <p>
                You don't have permission to manage custom fields. Please contact your practice administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {categoryList.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-12 flex flex-col items-center justify-center">
            <Database className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Custom Fields Configured</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Start by adding a category, then create groups and dropdown values within it.
              Custom fields allow you to standardize data entry for your practice.
            </p>
            {canManageCustomFields && (
              <Button onClick={openAddCategoryDialog} size="lg">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Category
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList>
            <TabsTrigger value="categories">Categories View</TabsTrigger>
            <TabsTrigger value="relationships">Field Relationships</TabsTrigger>
            <TabsTrigger value="usage">Usage Guide</TabsTrigger>
          </TabsList>

          <TabsContent value="relationships" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Field Relationships</CardTitle>
                <CardDescription>
                  Create visual relationships between custom fields like species and breeds.
                  Drag and drop items to create connections between parent and child fields.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RelationshipBuilder setActiveTab={setActiveTab} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <div className="grid grid-cols-1 gap-6">
              {categoryList.map((category: CustomFieldCategory) => (
                <Card key={category.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="bg-card p-4 border-b">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1"
                          onClick={() => setActiveCategory(activeCategory === category.id ? null : category.id)}
                        >
                          {activeCategory === category.id ?
                            <ChevronDown className="w-5 h-5" /> :
                            <ChevronRight className="w-5 h-5" />
                          }
                          <span className="sr-only">Toggle category</span>
                        </Button>
                        <div>
                          <CardTitle className="text-xl flex items-center">
                            {category.name}
                            {category.isSystem && (
                              <Badge variant="secondary" className="ml-2">
                                System
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription>
                            {category.description || "No description provided"}
                          </CardDescription>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <CategoryTooltip category={category} />
                        <CategoryActions
                          category={category}
                          canManageCustomFields={!!canManageCustomFields}
                          onEdit={openEditCategoryDialog}
                          onDelete={handleDeleteCategory}
                        />
                      </div>
                    </div>
                  </CardHeader>

                  {activeCategory === category.id && (
                    <CardContent className="p-4">
                      <div className="mb-4 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-muted-foreground" />
                          <h3 className="font-medium">Field Groups</h3>
                        </div>
                        {canManageCustomFields && (
                          <Button size="sm" variant="outline" onClick={() => openAddGroupDialog(category.id)}>
                            <Plus className="w-4 h-4 mr-1" /> Add Group
                          </Button>
                        )}
                      </div>

                      {groupList.filter((g: CustomFieldGroup) => g.categoryId === category.id).length === 0 ? (
                        <div className="rounded-md border border-dashed p-8 flex flex-col items-center justify-center text-muted-foreground">
                          <FileSymlink className="h-8 w-8 mb-2 opacity-50" />
                          <p className="text-center mb-2">No groups defined for this category.</p>
                          {canManageCustomFields && (
                            <Button size="sm" variant="outline" onClick={() => openAddGroupDialog(category.id)}>
                              <Plus className="w-4 h-4 mr-1" /> Create First Group
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <Accordion type="multiple" className="w-full">
                            {groupList.filter((g: CustomFieldGroup) => g.categoryId === category.id).map((group: CustomFieldGroup) => (
                              <AccordionItem key={group.id} value={`group-${group.id}`}>
                                <AccordionTrigger className="p-3 rounded-md hover:bg-muted/50 transition-colors">
                                  <div className="flex justify-between items-center w-full pr-4">
                                    <div className="flex items-center gap-2 text-left">
                                      <div>
                                        <span className="font-medium">{group.name}</span>
                                        <div className="flex flex-wrap gap-1 items-center mt-1">
                                          <Badge variant="outline" className="text-xs font-mono">
                                            {group.key}
                                          </Badge>
                                          {group.isSystem && (
                                            <Badge variant="secondary" className="text-xs">
                                              System
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <GroupActions
                                      group={group}
                                      canManageCustomFields={!!canManageCustomFields}
                                      onEdit={openEditGroupDialog}
                                      onDelete={handleDeleteGroup}
                                    />
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-3 pt-1">
                                  <div className="mt-2 mb-4">
                                    {group.description && (
                                      <div className="mb-3 text-sm text-muted-foreground">
                                        {group.description}
                                      </div>
                                    )}

                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center">
                                        <Grid3X3 className="h-4 w-4 mr-2 text-muted-foreground" />
                                        <span className="text-sm font-medium">Field Values</span>
                                      </div>

                                      {canManageCustomFields && (
                                        <Button size="sm" variant="outline" onClick={() => openAddValueDialog(group.id)}>
                                          <Plus className="h-3 w-3 mr-1" /> Add Value
                                        </Button>
                                      )}
                                    </div>
                                  </div>

                                  {valueList.filter((v: CustomFieldValue) => v.groupId === group.id).length === 0 ? (
                                    <div className="p-6 border border-dashed rounded-md text-center text-muted-foreground">
                                      <p className="mb-2">No values defined for this group.</p>
                                      {canManageCustomFields && (
                                        <Button size="sm" variant="outline" onClick={() => openAddValueDialog(group.id)}>
                                          <Plus className="h-3 w-3 mr-1" /> Add First Value
                                        </Button>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="border rounded-md">
                                      <ScrollArea className="h-[200px]">
                                        <div className="divide-y">
                                          {valueList
                                            .filter((v: CustomFieldValue) => v.groupId === group.id)
                                            .sort((a: CustomFieldValue, b: CustomFieldValue) => a.sortOrder - b.sortOrder)
                                            .map((value: CustomFieldValue) => (
                                              <div key={value.id} className="p-2 hover:bg-muted/30 flex justify-between items-center">
                                                <div className="flex-1">
                                                  <div className="font-medium">{value.label}</div>
                                                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                    <code className="bg-muted px-1 rounded">{value.value}</code>
                                                    {value.isDefault && (
                                                      <Badge variant="secondary" className="text-xs">
                                                        Default
                                                      </Badge>
                                                    )}
                                                    {!value.isActive && (
                                                      <Badge variant="secondary" className="text-xs">
                                                        Inactive
                                                      </Badge>
                                                    )}
                                                    {value.isSystem && (
                                                      <Badge variant="outline" className="text-xs">
                                                        System
                                                      </Badge>
                                                    )}
                                                  </div>
                                                </div>

                        <ValueActionsMenu
                          value={value}
                          group={group}
                          values={valueList}
                          canManageCustomFields={!!canManageCustomFields}
                          onMoveUp={(value) => moveValue(value, 'up')}
                          onMoveDown={(value) => moveValue(value, 'down')}
                          onEdit={openEditValueDialog}
                          onDelete={handleDeleteValue}
                        />
                                              </div>
                                            ))
                                          }
                                        </div>
                                      </ScrollArea>
                                    </div>
                                  )}
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                          </Accordion>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="usage">
            <Card>
              <CardHeader>
                <CardTitle>Custom Fields Usage Guide</CardTitle>
                <CardDescription>
                  Learn how to effectively use custom fields in your veterinary practice
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">What are Custom Fields?</h3>
                  <p className="text-muted-foreground">
                    Custom fields allow you to create standardized dropdown options throughout the SmartDVM application,
                    ensuring consistency in data entry and reporting.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Structure</h3>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li><strong>Categories</strong>: Top-level organizational units (e.g., "Patient Information")</li>
                    <li><strong>Groups</strong>: Sub-categories within each category (e.g., "Species", "Coat Colors")</li>
                    <li><strong>Values</strong>: The actual dropdown options users will select (e.g., "Canine", "Feline")</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Best Practices</h3>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>Use clear, descriptive names for categories and groups</li>
                    <li>Keep values concise and unambiguous</li>
                    <li>Use the sort order to place commonly used values at the top</li>
                    <li>Mark default values to streamline data entry</li>
                    <li>Deactivate values instead of deleting them when they're no longer needed</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
            <DialogDescription>
              Define a category of custom fields for your practice.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCategorySubmit}>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={categoryForm.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setCategoryForm({
                      ...categoryForm,
                      name,
                      key: !editingCategory || categoryForm.key === generateKey(categoryForm.name)
                        ? generateKey(name)
                        : categoryForm.key
                    });
                  }}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="key" className="text-right">
                  Key
                </Label>
                <Input
                  id="key"
                  value={categoryForm.key}
                  onChange={(e) => setCategoryForm({ ...categoryForm, key: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="col-span-3"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="secondary" onClick={() => setCategoryDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingCategory ? 'Update Category' : 'Create Category'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Group Dialog */}
      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGroup ? 'Edit Group' : 'Add New Group'}</DialogTitle>
            <DialogDescription>
              Define a group of dropdown values within this category.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleGroupSubmit}>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="group-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="group-name"
                  value={groupForm.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setGroupForm({
                      ...groupForm,
                      name,
                      key: !editingGroup || groupForm.key === generateKey(groupForm.name)
                        ? generateKey(name)
                        : groupForm.key
                    });
                  }}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="group-key" className="text-right">
                  Key
                </Label>
                <Input
                  id="group-key"
                  value={groupForm.key}
                  onChange={(e) => setGroupForm({ ...groupForm, key: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="group-description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="group-description"
                  value={groupForm.description}
                  onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                  className="col-span-3"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="secondary" onClick={() => setGroupDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingGroup ? 'Update Group' : 'Create Group'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Value Dialog */}
      <Dialog open={valueDialogOpen} onOpenChange={setValueDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingValue ? 'Edit Value' : 'Add New Value'}</DialogTitle>
            <DialogDescription>
              Define a dropdown option for this group.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleValueSubmit}>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="value-label" className="text-right">
                  Display Label
                </Label>
                <Input
                  id="value-label"
                  value={valueForm.label}
                  onChange={(e) => {
                    const label = e.target.value;
                    setValueForm({
                      ...valueForm,
                      label,
                      value: !editingValue || valueForm.value === generateKey(valueForm.label)
                        ? generateKey(label)
                        : valueForm.value
                    });
                  }}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="value-key" className="text-right">
                  Value Key
                </Label>
                <Input
                  id="value-key"
                  value={valueForm.value}
                  onChange={(e) => setValueForm({ ...valueForm, value: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="value-active" className="text-right">
                  Active
                </Label>
                <div className="flex items-center space-x-2 col-span-3">
                  <Switch
                    id="value-active"
                    checked={valueForm.isActive}
                    onCheckedChange={(checked) => setValueForm({ ...valueForm, isActive: checked })}
                  />
                  <Label htmlFor="value-active">{valueForm.isActive ? 'Yes' : 'No'}</Label>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="value-default" className="text-right">
                  Default
                </Label>
                <div className="flex items-center space-x-2 col-span-3">
                  <Switch
                    id="value-default"
                    checked={valueForm.isDefault}
                    onCheckedChange={(checked) => setValueForm({ ...valueForm, isDefault: checked })}
                  />
                  <Label htmlFor="value-default">{valueForm.isDefault ? 'Yes' : 'No'}</Label>
                </div>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="secondary" onClick={() => setValueDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingValue ? 'Update Value' : 'Create Value'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomFieldsPage;
