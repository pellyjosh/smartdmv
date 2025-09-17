'use client';

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import { ClientHeader } from "@/components/client/ClientHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Calendar as CalendarIcon,
  Activity,
  Heart,
  Clipboard,
  Clock,
  Check,
  AlertCircle,
  User,
  PawPrint,
  Target,
  TrendingUp,
  FileText,
  MessageSquare,
  Download,
  Edit,
  Plus,
  CheckCircle,
  XCircle
} from "lucide-react";
// using native Date.toLocaleDateString instead of custom format
import Link from "next/link";

// Milestone component
const MilestoneCard = ({ milestone, onToggleComplete }: { milestone: any, onToggleComplete: (id: string, completed: boolean) => void }) => {
  const isOverdue = milestone.dueDate && new Date(milestone.dueDate) < new Date() && !milestone.completed;
  const isDueSoon = milestone.dueDate && new Date(milestone.dueDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && !milestone.completed;

  return (
    <Card className={`mb-3 ${isOverdue ? 'border-red-200 bg-red-50' : isDueSoon ? 'border-amber-200 bg-amber-50' : milestone.completed ? 'border-green-200 bg-green-50' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="pt-1">
            {milestone.completed ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : isOverdue ? (
              <XCircle className="h-5 w-5 text-red-500" />
            ) : (
              <Clock className="h-5 w-5 text-amber-500" />
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex justify-between items-start mb-2">
              <h4 className={`font-medium ${milestone.completed ? 'line-through text-muted-foreground' : ''}`}>
                {milestone.title}
              </h4>
              <Badge variant={milestone.completed ? "default" : isOverdue ? "destructive" : isDueSoon ? "secondary" : "outline"}>
                {milestone.completed ? "Completed" : isOverdue ? "Overdue" : isDueSoon ? "Due Soon" : "Upcoming"}
              </Badge>
            </div>
            
            {milestone.description && (
              <p className="text-sm text-muted-foreground mb-2">{milestone.description}</p>
            )}
            
            <div className="flex justify-between items-center">
            <div className="text-xs text-muted-foreground">
                {milestone.dueDate && (
                  <span>Due: {new Date(milestone.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                )}
                {milestone.completedDate && (
                  <span>Completed: {new Date(milestone.completedDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                )}
              </div>
              
              {!milestone.completed && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onToggleComplete(milestone.id, true)}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Mark Complete
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function HealthPlanDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const { toast } = useToast();
  const healthPlanId = params.id as string;
  
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch health plan details
  const { 
    data: healthPlan, 
    isLoading: isHealthPlanLoading, 
    error: healthPlanError,
    refetch: refetchHealthPlan
  } = useQuery({
    queryKey: [`/api/health-plans/${healthPlanId}`, healthPlanId],
    queryFn: async () => {
      const res = await fetch(`/api/health-plans/${healthPlanId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch health plan details");
      }
      return await res.json();
    },
    enabled: !!healthPlanId && user?.role === 'CLIENT',
  });

  // Fetch milestones separately — the health plan API doesn't always include them
  const {
    data: fetchedMilestones = [],
    isLoading: isMilestonesLoading,
    error: milestonesError,
    refetch: refetchMilestones
  } = useQuery<any[]>({
    queryKey: [`/api/health-plans/${healthPlanId}/milestones`, healthPlanId, 'milestones'],
    queryFn: async () => {
      const res = await fetch(`/api/health-plans/${healthPlanId}/milestones`);
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to fetch milestones');
      }
      return await res.json();
    },
    enabled: !!healthPlanId && user?.role === 'CLIENT',
  });

  // Debug logs to inspect incoming data and date fields
//   useEffect(() => {
//     if (healthPlan) {
//       // eslint-disable-next-line no-console
//       console.debug('[Debug] healthPlan fetched:', healthPlan);
//       // eslint-disable-next-line no-console
//       console.debug('[Debug] healthPlan.startDate (raw):', healthPlan.startDate);
//       // eslint-disable-next-line no-console
//       console.debug('[Debug] parsed startDate:', healthPlan.startDate ? new Date(healthPlan.startDate) : null);
//     }

//     if (fetchedMilestones) {
//       // eslint-disable-next-line no-console
//       console.debug('[Debug] fetchedMilestones:', fetchedMilestones);
//     }
//   }, [healthPlan, fetchedMilestones]);

  // Toggle milestone completion
  const toggleMilestoneMutation = useMutation({
    mutationFn: async ({ milestoneId, completed }: { milestoneId: string, completed: boolean }) => {
      const response = await fetch(`/api/health-plans/${healthPlanId}/milestones/${milestoneId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed, completedDate: completed ? new Date().toISOString() : null }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update milestone');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Milestone Updated",
        description: "Milestone status has been updated successfully.",
      });
      refetchHealthPlan();
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleToggleComplete = (milestoneId: string, completed: boolean) => {
    toggleMilestoneMutation.mutate({ milestoneId, completed });
  };

  if (isHealthPlanLoading) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-5xl">
        <ClientHeader 
          title="Health Plan Details" 
          showBackButton={true}
          backHref="/client?tab=health-plans"
          backLabel="Back to Health Plans"
        />
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (healthPlanError || !healthPlan) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-5xl">
        <ClientHeader 
          title="Health Plan Details" 
          showBackButton={true}
          backHref="/client?tab=health-plans"
          backLabel="Back to Health Plans"
        />
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <h3 className="font-medium text-base mb-2">Health Plan Not Found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              The health plan you're looking for doesn't exist or you don't have access to view it.
            </p>
            <Button asChild>
              <Link href="/client?tab=health-plans">Back to Health Plans</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Use milestones from healthPlan if present, otherwise fall back to fetched milestones
  const milestones = (healthPlan?.milestones && healthPlan.milestones.length > 0) ? healthPlan.milestones : (fetchedMilestones || []);

  // Calculate progress
  const totalMilestones = milestones?.length || 0;
  const completedMilestones = milestones?.filter((m: any) => m.completed).length || 0;
  const progressPercentage = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

  // Calculate days remaining
  const daysRemaining = healthPlan.endDate ? 
    Math.max(0, Math.ceil((new Date(healthPlan.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-50 text-green-700 border-green-200">Active</Badge>;
      case 'pending':
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>;
      case 'completed':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-50 text-red-700 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-5xl">
      <ClientHeader 
        title={healthPlan.name}
        subtitle={`Health plan for ${healthPlan.petName || 'your pet'}`}
        showBackButton={true}
        backHref="/client?tab=health-plans"
        backLabel="Back to Health Plans"
      />

      {/* Health Plan Overview */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Heart className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  {healthPlan.name}
                  {getStatusBadge(healthPlan.status)}
                </h2>
                <p className="text-muted-foreground">
                  Started: {new Date(healthPlan.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  {healthPlan.endDate && ` • Ends: ${new Date(healthPlan.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`}
                </p>
                {daysRemaining !== null && daysRemaining > 0 && (
                  <p className="text-sm text-blue-600 font-medium">
                    {daysRemaining} days remaining
                  </p>
                )}
              </div>
            </div>
            
            {/* <div className="flex gap-2">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download Plan
              </Button>
            </div> */}
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-6">
            {/* Progress Overview */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Plan Progress</span>
                <span className="font-medium">{completedMilestones}/{totalMilestones} milestones completed</span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
              <p className="text-xs text-muted-foreground mt-1">
                {progressPercentage.toFixed(0)}% complete
              </p>
            </div>
            
            {/* Key Details */}
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              {healthPlan.petName && (
                <div>
                  <span className="text-muted-foreground block">Pet</span>
                  <span className="font-medium flex items-center gap-1">
                    <PawPrint className="h-4 w-4" />
                    {healthPlan.petName}
                  </span>
                </div>
              )}
              
              {healthPlan.veterinarian && (
                <div>
                  <span className="text-muted-foreground block">Veterinarian</span>
                  <span className="font-medium flex items-center gap-1">
                    <User className="h-4 w-4" />
                    Dr. {healthPlan.veterinarian}
                  </span>
                </div>
              )}
              
              {healthPlan.planType && (
                <div>
                  <span className="text-muted-foreground block">Plan Type</span>
                  <span className="font-medium flex items-center gap-1">
                    <Target className="h-4 w-4" />
                    {healthPlan.planType}
                  </span>
                </div>
              )}
            </div>
            
            {healthPlan.description && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Plan Description</h4>
                  <p className="text-sm">{healthPlan.description}</p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
  <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="overview">
            <Activity className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="milestones">
            <Clipboard className="h-4 w-4 mr-2" />
            Milestones
          </TabsTrigger>
          <TabsTrigger value="progress">
            <TrendingUp className="h-4 w-4 mr-2" />
            Progress
          </TabsTrigger>
          {/* Documents tab removed per request */}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Health Status Overview */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Health Metrics */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-red-500" />
                  Health Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Plan Progress</span>
                      <span className="text-sm font-medium">{progressPercentage.toFixed(0)}%</span>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Milestones Completed</span>
                      <span className="text-sm font-medium">{completedMilestones}/{totalMilestones}</span>
                    </div>
                    
                    {daysRemaining !== null && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Days Remaining</span>
                        <Badge variant={daysRemaining < 30 ? "destructive" : daysRemaining < 60 ? "default" : "secondary"}>
                          {daysRemaining} days
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">Health Status</span>
                      </div>
                      <p className="text-xs text-green-700">
                        {healthPlan.status === 'active' ? 'Plan is on track' : 
                         healthPlan.status === 'completed' ? 'Plan completed successfully' :
                         'Plan requires attention'}
                      </p>
                    </div>
                    
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-1">
                        <CalendarIcon className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">Next Milestone</span>
                      </div>
                      <p className="text-xs text-blue-700">
                        {milestones.find((m: any) => !m.completed)?.title || 'All milestones completed!'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pet Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PawPrint className="h-5 w-5 text-amber-500" />
                  Pet Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <Avatar className="h-16 w-16 mx-auto mb-3">
                    <AvatarImage src={`/api/placeholder/pet/${healthPlan.petId}`} />
                    <AvatarFallback className="text-lg">
                      {healthPlan.petName?.charAt(0) || 'P'}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold">{healthPlan.petName}</h3>
                  <p className="text-sm text-muted-foreground">{healthPlan.planType}</p>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Species</span>
                    <span className="capitalize">{healthPlan.pet?.species || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Breed</span>
                    <span className="capitalize">{healthPlan.pet?.breed || 'Mixed'}</span>
                  </div>
                  <div className="flex justify-between">
                      <span className="text-muted-foreground">Plan Started</span>
                      <span>{new Date(healthPlan.startDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                    </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity & Quick Actions */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-purple-500" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {milestones && milestones.length > 0 ? (
                  <div className="space-y-3">
                    {milestones
                      .filter((m: any) => m.completed && m.completedOn)
                      .sort((a: any, b: any) => new Date(b.completedOn).getTime() - new Date(a.completedOn).getTime())
                      .slice(0, 4)
                      .map((milestone: any) => (
                        <div key={milestone.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="p-1 bg-green-100 rounded-full">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">{milestone.title}</h4>
                            <p className="text-xs text-muted-foreground">
                              Completed {new Date(milestone.completedOn).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">No completed milestones yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Activity will appear here as milestones are completed</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-500" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="h-auto p-4 flex flex-col gap-2 hover:bg-blue-50 hover:border-blue-200" asChild>
                    <Link href="/client/book-appointment">
                      <CalendarIcon className="h-5 w-5 text-blue-600" />
                      <span className="text-sm font-medium">Book Appointment</span>
                    </Link>
                  </Button>

                  <Button variant="outline" className="h-auto p-4 flex flex-col gap-2 hover:bg-green-50 hover:border-green-200">
                    <MessageSquare className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium">Contact Vet</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="milestones">
          <div className="space-y-6">
            {/* Milestones Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Plan Milestones</h3>
                <p className="text-sm text-muted-foreground">
                  Track your pet's health journey with these key milestones
                </p>
              </div>
              
            </div>

            {/* Milestones Overview Cards */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-xl font-bold text-green-700">{completedMilestones}</div>
                      <div className="text-sm text-green-600">Completed</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-full">
                      <Clock className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <div className="text-xl font-bold text-amber-700">
                        {milestones.filter((m: any) => !m.completed).length || 0}
                      </div>
                      <div className="text-sm text-amber-600">Pending</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <Target className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-xl font-bold text-blue-700">{totalMilestones}</div>
                      <div className="text-sm text-blue-600">Total</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {milestones && milestones.length > 0 ? (
              <div className="space-y-4">
                {/* Progress Indicator */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Overall Progress</span>
                      <span className="text-sm text-muted-foreground">{progressPercentage.toFixed(0)}%</span>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                  </CardContent>
                </Card>

                {/* Milestones List */}
                <div className="space-y-3">
                  {milestones
                    .sort((a: any, b: any) => {
                      // Sort by completion status first, then by due date
                      if (a.completed !== b.completed) {
                        return a.completed ? 1 : -1;
                      }
                      if (a.dueDate && b.dueDate) {
                        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                      }
                      return 0;
                    })
                    .map((milestone: any, index: number) => (
                      <Card key={milestone.id} className={`transition-all hover:shadow-md ${
                        milestone.completed ? 'bg-green-50 border-green-200' : 
                        milestone.dueDate && new Date(milestone.dueDate) < new Date() ? 'bg-red-50 border-red-200' :
                        'hover:bg-gray-50'
                      }`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            {/* Milestone Number/Status */}
                            <div className="flex-shrink-0">
                              {milestone.completed ? (
                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                  <CheckCircle className="h-5 w-5 text-green-600" />
                                </div>
                              ) : (
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center border-2 border-gray-300">
                                  <span className="text-sm font-medium text-gray-600">{index + 1}</span>
                                </div>
                              )}
                            </div>

                            {/* Milestone Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h4 className={`font-medium ${milestone.completed ? 'text-green-800' : 'text-gray-900'}`}>
                                    {milestone.title}
                                  </h4>
                                  {milestone.description && (
                                    <p className={`text-sm mt-1 ${
                                      milestone.completed ? 'text-green-700' : 'text-muted-foreground'
                                    }`}>
                                      {milestone.description}
                                    </p>
                                  )}
                                </div>

                                {/* Milestone Actions */}
                                <div className="flex items-center gap-2">
                                  {milestone.dueDate && (
                                    <Badge variant={
                                      milestone.completed ? "secondary" :
                                      new Date(milestone.dueDate) < new Date() ? "destructive" :
                                      new Date(milestone.dueDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) ? "default" :
                                      "outline"
                                    }>
                                      {milestone.completed ? 'Completed' : 
                                       new Date(milestone.dueDate) < new Date() ? 'Overdue' :
                                       `Due ${new Date(milestone.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {/* Milestone Details */}
                              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                                {milestone.dueDate && (
                                  <div className="flex items-center gap-1">
                                    <CalendarIcon className="h-3 w-3" />
                                    <span>Due: {new Date(milestone.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                  </div>
                                )}
                                {milestone.completed && milestone.completedOn && (
                                  <div className="flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3" />
                                    <span>Completed: {new Date(milestone.completedOn).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="max-w-sm mx-auto">
                    <Clipboard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium text-lg mb-2">No Milestones Yet</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Your veterinarian will add milestones to track your pet's health progress. 
                      Check back soon or contact your vet for more information.
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button variant="outline" size="sm">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Contact Veterinarian
                      </Button>
                      <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Suggest Milestone
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="progress">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Progress Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Progress Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">{progressPercentage.toFixed(0)}%</div>
                    <p className="text-sm text-muted-foreground">Overall Progress</p>
                  </div>
                  <Progress value={progressPercentage} className="h-4" />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-green-600">{completedMilestones}</div>
                      <p className="text-muted-foreground">Completed</p>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-amber-600">{totalMilestones - completedMilestones}</div>
                      <p className="text-muted-foreground">Remaining</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Start Date</span>
                    <span className="font-medium">{new Date(healthPlan.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  {healthPlan.endDate && (
                      <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">End Date</span>
                      <span className="font-medium">{new Date(healthPlan.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  )}
                  {daysRemaining !== null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Time Remaining</span>
                      <span className="font-medium">{daysRemaining} days</span>
                    </div>
                  )}
                  
                  {/* Progress milestones */}
                  {healthPlan.milestones && (
                    <div className="pt-4 border-t">
                        <h4 className="font-medium text-sm mb-3">Upcoming Milestones</h4>
                        {milestones
                          .filter((m: any) => !m.completed && m.dueDate)
                          .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                          .slice(0, 3)
                          .map((milestone: any) => (
                            <div key={milestone.id} className="flex justify-between items-center py-2 text-sm">
                              <span className="truncate">{milestone.title}</span>
                              <span className="text-muted-foreground whitespace-nowrap ml-2">
                                {new Date(milestone.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                          ))}
                      </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

  {/* Documents tab removed */}
      </Tabs>
    </div>
  );
}
