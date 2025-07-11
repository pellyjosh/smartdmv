'use client';
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus, ClipboardList, Filter, CheckSquare, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import TemplatesList from '@/components/checklists/templates-list';
import AssignedChecklistsList from '@/components/checklists/assigned-checklists-list';
import CreateTemplateDialog from '@/components/checklists/create-template-dialog';
import CreateChecklistDialog from '@/components/checklists/create-checklist-dialog';
import { StaffTasksView } from '@/components/checklists/staff-tasks-view';
import { useUser } from '@/context/UserContext';
import { UserRoleEnum } from '@/db/schema';

export default function ChecklistsPage() {
  const { user } = useUser();
  const [openCreateTemplateDialog, setOpenCreateTemplateDialog] = useState(false);
  const [openCreateChecklistDialog, setOpenCreateChecklistDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('assigned');

  const { isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['/api/treatment-templates'],
    enabled: activeTab === 'templates'
  });

  const { isLoading: isLoadingChecklists } = useQuery({
    queryKey: ['/api/assigned-checklists'],
    enabled: activeTab === 'assigned'
  });

  const { isLoading: isLoadingTasks } = useQuery({
    queryKey: ['/api/checklist-items/my-items'],
    enabled: activeTab === 'my-tasks'
  });

  // Only certain roles can create templates
  const canCreateTemplates = user?.role === UserRoleEnum.PRACTICE_ADMINISTRATOR || 
                            user?.role === UserRoleEnum.PRACTICE_MANAGER || 
                            user?.role === UserRoleEnum.VETERINARIAN;

  // Check if the user is staff (any role that can receive assigned tasks)
  const isStaffMember = user?.role !== UserRoleEnum.CLIENT && user?.role !== UserRoleEnum.SUPER_ADMIN;

  // All authenticated users can view their assigned tasks
  const isLoading = (activeTab === 'templates' && isLoadingTemplates) || 
                   (activeTab === 'assigned' && isLoadingChecklists) ||
                   (activeTab === 'my-tasks' && isLoadingTasks);

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Treatment Checklists</h1>
          <p className="text-muted-foreground">Manage treatment templates and track assigned procedures</p>
        </div>
        <div className="flex space-x-2">
          {activeTab === 'templates' && canCreateTemplates && (
            <Button onClick={() => setOpenCreateTemplateDialog(true)}>
              <Plus className="mr-1 h-4 w-4" />
              New Template
            </Button>
          )}
          {activeTab === 'assigned' && (
            <Button onClick={() => setOpenCreateChecklistDialog(true)}>
              <Plus className="mr-1 h-4 w-4" />
              New Checklist
            </Button>
          )}
        </div>
      </div>

      <Separator />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="assigned" className="flex items-center">
            <CheckSquare className="mr-2 h-4 w-4" />
            Checklists
          </TabsTrigger>
          {isStaffMember && (
            <TabsTrigger value="my-tasks" className="flex items-center">
              <UserCheck className="mr-2 h-4 w-4" />
              My Tasks
            </TabsTrigger>
          )}
          <TabsTrigger value="templates" className="flex items-center">
            <ClipboardList className="mr-2 h-4 w-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          <TabsContent value="assigned" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex justify-between items-center">
                    <span>Assigned Treatment Checklists</span>
                    <Button variant="outline" size="sm">
                      <Filter className="mr-2 h-4 w-4" />
                      Filter
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>
                  View and manage all treatment checklists assigned to patients.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AssignedChecklistsList />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="my-tasks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex justify-between items-center">
                    <span>My Assigned Tasks</span>
                  </div>
                </CardTitle>
                <CardDescription>
                  View and manage tasks that have been assigned to you across all checklists.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StaffTasksView />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex justify-between items-center">
                    <span>Treatment Templates</span>
                    <Button variant="outline" size="sm">
                      <Filter className="mr-2 h-4 w-4" />
                      Filter
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>
                  Manage treatment templates for common procedures and protocols.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TemplatesList />
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      {canCreateTemplates && (
        <CreateTemplateDialog 
          open={openCreateTemplateDialog} 
          onOpenChange={setOpenCreateTemplateDialog}
        />
      )}

      <CreateChecklistDialog 
        open={openCreateChecklistDialog} 
        onOpenChange={setOpenCreateChecklistDialog}
      />
    </div>
  );
}