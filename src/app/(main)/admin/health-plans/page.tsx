'use client'
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
// Navigation components are now provided by AppLayout
import { HealthPlanForm } from "@/components/health-plans/health-plan-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { HealthPlan, HealthPlanMilestone, Pet, UserRoleEnum } from "@/db/schema";
import { Loader2, PlusCircle, CalendarIcon, CheckCircle2, XCircle, HeartPulse } from "lucide-react";

export default function HealthPlansPage() {
  const [isHealthPlanDialogOpen, setIsHealthPlanDialogOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const { user } = useUser();
  const { toast } = useToast();

  // Fetch health plans
  const { data: healthPlans, isLoading: isHealthPlansLoading } = useQuery<HealthPlan[]>({
    queryKey: ["/api/health-plans"],
    queryFn: async () => {
      const response = await fetch('/api/health-plans');
      if (!response.ok) throw new Error('Failed to fetch health plans');
      return response.json();
    },
    enabled: !!user,
  });

  // Fetch pets
  const { data: pets, isLoading: isPetsLoading } = useQuery<Pet[]>({
    queryKey: ["/api/pets"],
    queryFn: async () => {
      const response = await fetch('/api/pets');
      if (!response.ok) throw new Error('Failed to fetch pets');
      return response.json();
    },
    enabled: !!user,
  });

  // Fetch health plan milestones for the selected plan
  const { data: milestones, isLoading: isMilestonesLoading } = useQuery<HealthPlanMilestone[]>({
    queryKey: ["/api/health-plans", selectedPlanId, "milestones"],
    queryFn: async () => {
      const response = await fetch(`/api/health-plans/${selectedPlanId}/milestones`);
      if (!response.ok) throw new Error('Failed to fetch health plan milestones');
      return response.json();
    },
    enabled: !!selectedPlanId,
  });

  // Toggle milestone completion mutation
  const toggleMilestoneMutation = useMutation({
    mutationFn: async (milestoneId: number) => {
      return await apiRequest("PATCH", `/api/health-plan-milestones/${milestoneId}/toggle`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health-plans", selectedPlanId, "milestones"] });
      toast({
        title: "Milestone updated",
        description: "The milestone status has been successfully updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle selecting a health plan
  const handleSelectPlan = (planId: number) => {
    setSelectedPlanId(planId);
  };

  // Get selected health plan
  const selectedPlan = healthPlans?.find(plan => plan.id === selectedPlanId);
  
  // Get pet for selected plan
  const selectedPlanPet = selectedPlan && pets 
    ? pets.find(pet => pet.id === selectedPlan.petId) 
    : null;
  
  // Calculate milestone completion percentage
  const calculateCompletionPercentage = (milestones: HealthPlanMilestone[] | undefined): number => {
    if (!milestones || milestones.length === 0) return 0;
    
    const completedCount = milestones.filter(milestone => milestone.completed).length;
    return Math.round((completedCount / milestones.length) * 100);
  };
  
  // Handle milestone toggle
  const handleToggleMilestone = (milestoneId: number) => {
    // Only staff and admins can toggle milestones
    if (user && (user.role === UserRoleEnum.PRACTICE_STAFF || user.role === UserRoleEnum.PRACTICE_ADMIN)) {
      toggleMilestoneMutation.mutate(milestoneId);
    }
  };
  
  const isLoading = isHealthPlansLoading || isPetsLoading;
  const canCreateHealthPlan = user && (user.role === UserRoleEnum.PRACTICE_STAFF || user.role === UserRoleEnum.PRACTICE_ADMIN);

  return (
    <div className="h-full">
      <div className="flex-1 flex flex-col">
        
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0 p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Health Plans List */}
            <div className="md:col-span-1">
              <Card className="h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle>Health Plans</CardTitle>
                  {canCreateHealthPlan && (
                    <Dialog open={isHealthPlanDialogOpen} onOpenChange={setIsHealthPlanDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <PlusCircle className="h-4 w-4 mr-2" />
                          Create Plan
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                          <DialogTitle>Create Health Plan</DialogTitle>
                        </DialogHeader>
                        <HealthPlanForm 
                          onSuccess={() => {
                            setIsHealthPlanDialogOpen(false);
                            queryClient.invalidateQueries({ queryKey: ["/api/health-plans"] });
                          }}
                        />
                      </DialogContent>
                    </Dialog>
                  )}
                </CardHeader>
                <CardContent className="h-[calc(100vh-220px)] overflow-y-auto pb-0">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-40">
                      <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
                    </div>
                  ) : healthPlans && healthPlans.length > 0 ? (
                    <div className="space-y-3">
                      {healthPlans.map((plan) => {
                        const planPet = pets?.find(pet => pet.id === plan.petId);
                        
                        return (
                          <div
                            key={plan.id}
                            className={`border border-slate-200 rounded-lg p-4 cursor-pointer hover:border-primary-200 hover:bg-primary-50 transition-colors ${
                              selectedPlanId === plan.id ? "border-primary-200 bg-primary-50" : ""
                            }`}
                            onClick={() => handleSelectPlan(plan.id)}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-medium text-slate-900">{plan.name}</h3>
                              <Badge variant="outline" className="bg-primary-50 text-primary-700 hover:bg-primary-100">
                                Active
                              </Badge>
                            </div>
                            
                            <div className="flex items-center text-sm text-slate-500 mb-3">
                              <CalendarIcon className="h-3.5 w-3.5 mr-1 text-slate-400" />
                              <span>
                                {new Date(plan.startDate).toLocaleDateString()} 
                                {plan.endDate ? ` - ${new Date(plan.endDate).toLocaleDateString()}` : ""}
                              </span>
                            </div>
                            
                            <div className="flex items-center mb-3">
                              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center mr-2">
                                <span className="text-primary-700 font-semibold text-xs">
                                  {planPet?.name.charAt(0) || "P"}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-700">
                                  {planPet?.name || `Pet ID: ${plan.petId}`}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {planPet ? `${planPet.species} ${planPet.breed ? `• ${planPet.breed}` : ''}` : 'Loading...'}
                                </p>
                              </div>
                            </div>
                            
                            <div className="mt-2">
                              <div className="flex justify-between text-xs text-slate-500 mb-1">
                                <span>Progress</span>
                                <span>
                                  {/* This would be replaced with actual milestone completion data */}
                                  0%
                                </span>
                              </div>
                              <Progress value={0} className="h-1.5" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <div className="rounded-full bg-slate-100 p-3 mb-3">
                        <HeartPulse className="h-6 w-6 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-medium text-slate-900">No health plans found</h3>
                      <p className="text-sm text-slate-500 mt-1 mb-4 max-w-md">
                        {canCreateHealthPlan
                          ? "Create your first health plan by clicking the button above."
                          : "You don't have any health plans assigned yet."}
                      </p>
                      {canCreateHealthPlan && (
                        <Button onClick={() => setIsHealthPlanDialogOpen(true)}>
                          Create Health Plan
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Health Plan Details */}
            <div className="md:col-span-2">
              {selectedPlan ? (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{selectedPlan.name}</CardTitle>
                        <p className="text-sm text-slate-500 mt-1">
                          Created: {new Date(selectedPlan.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          Edit Plan
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm">
                              <PlusCircle className="h-4 w-4 mr-2" />
                              Add Milestone
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add Milestone</DialogTitle>
                            </DialogHeader>
                            {/* Milestone form would go here */}
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <label htmlFor="milestone-title" className="text-sm font-medium">Title</label>
                                <input id="milestone-title" className="w-full p-2 border border-slate-300 rounded-md" placeholder="Milestone title" />
                              </div>
                              <div className="space-y-2">
                                <label htmlFor="milestone-description" className="text-sm font-medium">Description</label>
                                <textarea id="milestone-description" className="w-full p-2 border border-slate-300 rounded-md" placeholder="Description" rows={3} />
                              </div>
                              <div className="space-y-2">
                                <label htmlFor="milestone-date" className="text-sm font-medium">Due Date</label>
                                <input id="milestone-date" type="date" className="w-full p-2 border border-slate-300 rounded-md" />
                              </div>
                              <div className="flex justify-end pt-4">
                                <Button>Add Milestone</Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="milestones">
                      <TabsList className="mb-4">
                        <TabsTrigger value="milestones">Milestones</TabsTrigger>
                        <TabsTrigger value="details">Details</TabsTrigger>
                        <TabsTrigger value="notes">Notes</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="milestones">
                        {isMilestonesLoading ? (
                          <div className="flex items-center justify-center h-40">
                            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
                          </div>
                        ) : milestones && milestones.length > 0 ? (
                          <div className="space-y-4">
                            <div className="bg-slate-50 p-4 rounded-lg">
                              <div className="flex justify-between items-center mb-2">
                                <h3 className="font-medium">Overall Progress</h3>
                                <span className="text-sm font-medium">
                                  {calculateCompletionPercentage(milestones)}%
                                </span>
                              </div>
                              <Progress 
                                value={calculateCompletionPercentage(milestones)} 
                                className="h-2" 
                              />
                            </div>
                            
                            <div className="border border-slate-200 rounded-lg divide-y divide-slate-200">
                              {milestones.map((milestone) => (
                                <div 
                                  key={milestone.id} 
                                  className="p-4 flex items-start"
                                >
                                  <div 
                                    className={`flex-shrink-0 w-5 h-5 rounded-full mr-3 cursor-pointer ${
                                      canCreateHealthPlan ? "cursor-pointer" : "cursor-default"
                                    }`}
                                    onClick={() => canCreateHealthPlan && handleToggleMilestone(milestone.id)}
                                  >
                                    {milestone.completed ? (
                                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                                    ) : (
                                      <XCircle className="h-5 w-5 text-slate-300" />
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                      <h4 
                                        className={`font-medium ${
                                          milestone.completed ? "text-slate-500 line-through" : "text-slate-900"
                                        }`}
                                      >
                                        {milestone.title}
                                      </h4>
                                      {milestone.dueDate && (
                                        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-full">
                                          Due: {new Date(milestone.dueDate).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                    {milestone.description && (
                                      <p 
                                        className={`text-sm mt-1 ${
                                          milestone.completed ? "text-slate-400" : "text-slate-600"
                                        }`}
                                      >
                                        {milestone.description}
                                      </p>
                                    )}
                                    {milestone.completed && milestone.completedOn && (
                                      <p className="text-xs text-slate-400 mt-2">
                                        Completed on {new Date(milestone.completedOn).toLocaleDateString()}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-10">
                            <div className="rounded-full bg-slate-100 p-3 mx-auto mb-3 w-fit">
                              <CalendarIcon className="h-6 w-6 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900">No milestones found</h3>
                            <p className="text-sm text-slate-500 mt-1 mb-4 max-w-md mx-auto">
                              This health plan doesn't have any milestones yet.
                            </p>
                            {canCreateHealthPlan && (
                              <Button>
                                <PlusCircle className="h-4 w-4 mr-2" />
                                Add Milestone
                              </Button>
                            )}
                          </div>
                        )}
                      </TabsContent>
                      
                      <TabsContent value="details">
                        <div className="bg-slate-50 rounded-lg p-4">
                          <h3 className="font-medium mb-3">Plan Details</h3>
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-slate-500">Pet</p>
                                <p className="font-medium">
                                  {selectedPlanPet?.name || `Pet ID: ${selectedPlan.petId}`}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-slate-500">Period</p>
                                <p className="font-medium">
                                  {new Date(selectedPlan.startDate).toLocaleDateString()} 
                                  {selectedPlan.endDate ? ` - ${new Date(selectedPlan.endDate).toLocaleDateString()}` : ""}
                                </p>
                              </div>
                            </div>
                            
                            <div>
                              <p className="text-sm text-slate-500">Progress</p>
                              <div className="mt-1">
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="font-medium">
                                    {milestones ? `${milestones.filter(m => m.completed).length}/${milestones.length} completed` : "Loading..."}
                                  </span>
                                  <span>
                                    {calculateCompletionPercentage(milestones)}%
                                  </span>
                                </div>
                                <Progress 
                                  value={calculateCompletionPercentage(milestones)} 
                                  className="h-2" 
                                />
                              </div>
                            </div>
                            
                            <div>
                              <p className="text-sm text-slate-500">Created By</p>
                              <p className="font-medium">
                                Staff ID: {selectedPlan.createdById}
                              </p>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="notes">
                        <div className="rounded-lg border border-slate-200 p-4 space-y-4">
                          {selectedPlan.notes ? (
                            <div>
                              <p className="text-sm text-slate-700 whitespace-pre-line">
                                {selectedPlan.notes}
                              </p>
                            </div>
                          ) : (
                            <div className="text-center py-6">
                              <p className="text-slate-500">No notes available for this health plan.</p>
                            </div>
                          )}
                          
                          {canCreateHealthPlan && (
                            <div className="pt-4 border-t border-slate-200">
                              <h3 className="font-medium mb-2">Add Note</h3>
                              <textarea 
                                className="w-full p-3 border border-slate-300 rounded-md text-sm"
                                rows={4}
                                placeholder="Enter additional notes for this health plan..."
                              />
                              <div className="flex justify-end mt-2">
                                <Button>Save Note</Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <div className="rounded-full bg-slate-100 p-4 mb-4">
                      <HeartPulse className="h-10 w-10 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">Select a health plan</h3>
                    <p className="text-sm text-slate-500 mt-2 text-center max-w-md">
                      Choose a health plan from the list to view details,
                      track milestones, and manage the plan.
                    </p>
                    {healthPlans && healthPlans.length === 0 && canCreateHealthPlan && (
                      <Button className="mt-4" onClick={() => setIsHealthPlanDialogOpen(true)}>
                        Create Health Plan
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
