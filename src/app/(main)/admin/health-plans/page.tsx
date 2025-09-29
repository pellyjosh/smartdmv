"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
// Navigation components are now provided by AppLayout
import { HealthPlanForm } from "@/components/health-plans/health-plan-form";
import { EditHealthPlanForm } from "@/components/health-plans/edit-health-plan-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { HealthPlan, HealthPlanMilestone, Pet } from "@/db/schema";
import {
  isPracticeAdministrator,
  isVeterinarian,
  isAdmin,
} from "@/lib/rbac-helpers";
import { RequirePermission, PermissionButton } from "@/lib/rbac/components";
import {
  Loader2,
  Plus,
  CalendarIcon,
  CheckCircle2,
  XCircle,
  HeartPulse,
} from "lucide-react";

export default function HealthPlansPage() {
  const [isHealthPlanDialogOpen, setIsHealthPlanDialogOpen] = useState(false);
  const [isEditPlanDialogOpen, setIsEditPlanDialogOpen] = useState(false);
  const [isAddMilestoneOpen, setIsAddMilestoneOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDescription, setMilestoneDescription] = useState("");
  const [milestoneDueDate, setMilestoneDueDate] = useState<string>("");
  const [noteText, setNoteText] = useState<string>("");
  const { user, initialAuthChecked, fetchUser } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  // Helper: fetch with timeout to avoid queries hanging indefinitely
  const fetchWithTimeout = async (
    url: string,
    options: RequestInit = {},
    timeout = 8000
  ) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return res;
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  };

  // Fetch health plans
  const {
    data: healthPlans,
    isLoading: isHealthPlansLoading,
    isError: isHealthPlansError,
    refetch: refetchHealthPlans,
  } = useQuery<HealthPlan[]>({
    queryKey: ["/api/health-plans"],
    queryFn: async () => {
      const response = await fetchWithTimeout("/api/health-plans");
      if (response.status === 401) {
        await fetchUser();
        router.push("/auth/login");
        throw new Error("Unauthorized");
      }

      if (response.status === 403) {
        // If the server forbids this admin endpoint, try the client-specific endpoint
        // which will return health plans for clients (or empty array) if appropriate.
        const clientRes = await fetchWithTimeout("/api/health-plans/client");
        if (!clientRes.ok) {
          const body = await clientRes.json().catch(() => ({}));
          throw new Error(body?.error || "Failed to fetch client health plans");
        }
        return clientRes.json();
      }

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to fetch health plans");
      }

      return response.json();
    },
    enabled: !!user && initialAuthChecked,
    retry: 0,
  });

  // Fetch pets
  const {
    data: pets,
    isLoading: isPetsLoading,
    isError: isPetsError,
    refetch: refetchPets,
  } = useQuery<Pet[]>({
    queryKey: ["/api/pets"],
    queryFn: async () => {
      const response = await fetchWithTimeout("/api/pets");
      if (response.status === 401) {
        await fetchUser();
        router.push("/auth/login");
        throw new Error("Unauthorized");
      }
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to fetch pets");
      }
      return response.json();
    },
    enabled: !!user && initialAuthChecked,
    retry: 0,
  });

  // Fetch health plan milestones for the selected plan
  const {
    data: milestones,
    isLoading: isMilestonesLoading,
    isError: isMilestonesError,
    refetch: refetchMilestones,
  } = useQuery<HealthPlanMilestone[]>({
    queryKey:
      selectedPlanId !== null
        ? ["/api/health-plans", selectedPlanId, "milestones"]
        : ["/api/health-plans", "no-plan", "milestones"],
    queryFn: async () => {
      if (selectedPlanId === null) return [] as HealthPlanMilestone[];
      const response = await fetchWithTimeout(
        `/api/health-plans/${selectedPlanId}/milestones`
      );
      if (!response.ok)
        throw new Error("Failed to fetch health plan milestones");
      return response.json();
    },
    enabled: selectedPlanId !== null && initialAuthChecked && user !== null,
    retry: 1, // Reduce retries
    staleTime: 30000, // Data is fresh for 30 seconds
    gcTime: 60000, // Keep in cache for 1 minute
  });

  // Fetch health plan notes for the selected plan
  const {
    data: planNotes,
    isLoading: isNotesLoading,
    isError: isNotesError,
    refetch: refetchNotes,
  } = useQuery({
    queryKey:
      selectedPlanId !== null
        ? ["/api/health-plans", selectedPlanId, "notes"]
        : ["/api/health-plans", "no-plan", "notes"],
    queryFn: async () => {
      if (selectedPlanId === null) return [];
      const response = await fetchWithTimeout(
        `/api/health-plans/${selectedPlanId}/notes`
      );
      if (!response.ok) throw new Error("Failed to fetch health plan notes");
      return response.json();
    },
    enabled: selectedPlanId !== null && initialAuthChecked && user !== null,
    retry: 1, // Reduce retries
    staleTime: 30000, // Data is fresh for 30 seconds
    gcTime: 60000, // Keep in cache for 1 minute
  });

  // Toggle milestone completion mutation
  const toggleMilestoneMutation = useMutation({
    mutationFn: async (milestoneId: number) => {
      return await apiRequest(
        "PATCH",
        `/api/health-plan-milestones/${milestoneId}/toggle`,
        {}
      );
    },
    onSuccess: () => {
      if (selectedPlanId !== null)
        queryClient.invalidateQueries({
          queryKey: ["/api/health-plans", selectedPlanId, "milestones"],
        });
      refetchMilestones();

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

  // Create milestone mutation
  const createMilestoneMutation = useMutation({
    mutationFn: async (data: {
      planId: number;
      title: string;
      description?: string | null;
      dueDate?: string | null;
    }) => {
      return await apiRequest(
        "POST",
        `/api/health-plans/${data.planId}/milestones`,
        data
      );
    },
    onSuccess: () => {
      if (selectedPlanId !== null)
        queryClient.invalidateQueries({
          queryKey: ["/api/health-plans", selectedPlanId, "milestones"],
        });
      refetchMilestones();
      toast({
        title: "Milestone added",
        description: "The milestone was added successfully.",
      });
      setIsAddMilestoneOpen(false);
      setMilestoneTitle("");
      setMilestoneDescription("");
      setMilestoneDueDate("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add milestone",
        description: error?.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Save note mutation (creates a new note for the health plan)
  const saveNoteMutation = useMutation({
    mutationFn: async (data: { planId: number; note: string }) => {
      return await apiRequest(
        "POST",
        `/api/health-plans/${data.planId}/notes`,
        { note: data.note }
      );
    },
    onSuccess: async () => {
      if (selectedPlanId !== null) {
        await queryClient.refetchQueries({
          queryKey: ["/api/health-plans", selectedPlanId, "notes"],
          exact: true,
        });
        await refetchNotes();
      }
      setNoteText(""); // Clear the input after saving
      toast({
        title: "Note saved",
        description: "The note was saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save note",
        description: error?.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Handle selecting a health plan
  const handleSelectPlan = (planId: number) => {
    setSelectedPlanId(planId);
  };

  // Get selected health plan
  const selectedPlan = healthPlans?.find(
    (plan) => Number((plan as any).id) === selectedPlanId
  );

  // Get pet for selected plan
  const selectedPlanPet =
    selectedPlan && pets
      ? pets.find((pet) => pet.id === Number((selectedPlan as any).petId))
      : null;

  // Keep note text in sync when selected plan changes
  useEffect(() => {
    setNoteText(""); // Clear note text when switching plans
  }, [selectedPlanId]);

  // Calculate milestone completion percentage
  const calculateCompletionPercentage = (
    milestones: HealthPlanMilestone[] | undefined
  ): number => {
    if (!milestones || milestones.length === 0) return 0;

    const completedCount = milestones.filter(
      (milestone) => milestone.completed
    ).length;
    return Math.round((completedCount / milestones.length) * 100);
  };

  // Handle milestone toggle
  const handleToggleMilestone = (milestoneId: number) => {
    // Only staff and admins can toggle milestones
    if (
      user &&
      (isPracticeAdministrator(user as any) ||
        isVeterinarian(user as any) ||
        isAdmin(user as any))
    ) {
      toggleMilestoneMutation.mutate(milestoneId);
    }
  };

  const isLoading =
    !initialAuthChecked || isHealthPlansLoading || isPetsLoading;
  const canCreateHealthPlan =
    user &&
    (isPracticeAdministrator(user as any) || isVeterinarian(user as any));

  return (
    <RequirePermission resource={"health_plans" as any} action={"READ" as any}>
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
                      <Dialog
                        open={isHealthPlanDialogOpen}
                        onOpenChange={setIsHealthPlanDialogOpen}
                      >
                        <DialogTrigger asChild>
                          <PermissionButton
                            resource={"health_plans" as any}
                            action={"CREATE" as any}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add New Plan
                          </PermissionButton>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px]">
                          <DialogHeader>
                            <DialogTitle>Create Health Plan</DialogTitle>
                          </DialogHeader>
                          <HealthPlanForm
                            onSuccess={() => {
                              setIsHealthPlanDialogOpen(false);
                              refetchHealthPlans();
                            }}
                          />
                        </DialogContent>
                      </Dialog>
                    )}
                  </CardHeader>

                  {/* Edit Health Plan Dialog */}
                  {selectedPlan && (
                    <Dialog
                      open={isEditPlanDialogOpen}
                      onOpenChange={setIsEditPlanDialogOpen}
                    >
                      <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                          <DialogTitle>Edit Health Plan</DialogTitle>
                        </DialogHeader>
                        <EditHealthPlanForm
                          healthPlan={selectedPlan}
                          onSuccess={() => {
                            setIsEditPlanDialogOpen(false);
                            refetchHealthPlans();
                          }}
                        />
                      </DialogContent>
                    </Dialog>
                  )}

                  <CardContent className="h-[calc(100vh-220px)] overflow-y-auto pb-0">
                    {isLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className="animate-pulse border border-slate-100 rounded-lg p-4 bg-slate-50"
                          >
                            <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                            <div className="h-3 bg-slate-200 rounded w-1/2 mb-3" />
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded-full bg-slate-200 mr-3" />
                              <div className="flex-1">
                                <div className="h-3 bg-slate-200 rounded w-1/3 mb-1" />
                                <div className="h-2 bg-slate-200 rounded w-1/4" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : healthPlans && healthPlans.length > 0 ? (
                      <div className="space-y-3">
                        {healthPlans.map((plan) => {
                          const planPet = pets?.find(
                            (pet) => pet.id === Number((plan as any).petId)
                          );

                          return (
                            <div
                              key={plan.id}
                              className={`border border-slate-200 rounded-lg p-4 cursor-pointer hover:border-primary-200 hover:bg-primary-50 transition-colors ${
                                selectedPlanId === Number((plan as any).id)
                                  ? "border-primary-200 bg-primary-50"
                                  : ""
                              }`}
                              onClick={() =>
                                handleSelectPlan(Number((plan as any).id))
                              }
                            >
                              <div className="flex justify-between items-start mb-2">
                                <h3 className="font-medium text-slate-900">
                                  {plan.name}
                                </h3>
                                <Badge
                                  variant="outline"
                                  className="bg-primary-50 text-primary-700 hover:bg-primary-100"
                                >
                                  Active
                                </Badge>
                              </div>

                              <div className="flex items-center text-sm text-slate-500 mb-3">
                                <CalendarIcon className="h-3.5 w-3.5 mr-1 text-slate-400" />
                                <span>
                                  {plan.startDate
                                    ? new Date(
                                        (plan as any).startDate
                                      ).toLocaleDateString()
                                    : ""}
                                  {plan.endDate
                                    ? ` - ${new Date(
                                        (plan as any).endDate
                                      ).toLocaleDateString()}`
                                    : ""}
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
                                    {planPet
                                      ? `${planPet.species} ${
                                          planPet.breed
                                            ? `• ${planPet.breed}`
                                            : ""
                                        }`
                                      : "Loading..."}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-2">
                                <div className="flex justify-between text-xs text-slate-500 mb-1">
                                  <span>Progress</span>
                                  <span>
                                    {selectedPlanId === Number((plan as any).id)
                                      ? `${calculateCompletionPercentage(
                                          milestones
                                        )}%`
                                      : typeof (plan as any).milestoneCount !==
                                        "undefined"
                                      ? `${Math.round(
                                          (((plan as any)
                                            .milestoneCompletedCount || 0) /
                                            ((plan as any).milestoneCount ||
                                              1)) *
                                            100
                                        )}%`
                                      : "0%"}
                                  </span>
                                </div>
                                <Progress
                                  value={
                                    selectedPlanId === Number((plan as any).id)
                                      ? calculateCompletionPercentage(
                                          milestones
                                        )
                                      : typeof (plan as any).milestoneCount !==
                                        "undefined"
                                      ? Math.round(
                                          (((plan as any)
                                            .milestoneCompletedCount || 0) /
                                            ((plan as any).milestoneCount ||
                                              1)) *
                                            100
                                        )
                                      : 0
                                  }
                                  className="h-1.5"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : isHealthPlansError ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-destructive-600 mb-3">
                          Failed to load health plans.
                        </p>
                        <div className="flex items-center justify-center">
                          <Button onClick={() => refetchHealthPlans()}>
                            Retry
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="rounded-full bg-slate-100 p-3 mb-3">
                          <HeartPulse className="h-6 w-6 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">
                          No health plans found
                        </h3>
                        <p className="text-sm text-slate-500 mt-1 mb-4 max-w-md">
                          {canCreateHealthPlan
                            ? "Create your first health plan by clicking the button above."
                            : "You don't have any health plans assigned yet."}
                        </p>
                        {canCreateHealthPlan && (
                          <Button
                            onClick={() => setIsHealthPlanDialogOpen(true)}
                          >
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
                            Created:{" "}
                            {new Date(
                              selectedPlan.createdAt
                            ).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <PermissionButton
                            resource={"health_plans" as any}
                            action={"UPDATE" as any}
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditPlanDialogOpen(true)}
                          >
                            Edit Plan
                          </PermissionButton>
                          <Dialog
                            open={isAddMilestoneOpen}
                            onOpenChange={setIsAddMilestoneOpen}
                          >
                            <DialogTrigger asChild>
                              <PermissionButton
                                resource={"health_plans" as any}
                                action={"UPDATE" as any}
                              >
                                <Plus className="h-4 w-4" />
                                Add Milestone
                              </PermissionButton>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Add Milestone</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <label
                                    htmlFor="milestone-title"
                                    className="text-sm font-medium"
                                  >
                                    Title
                                  </label>
                                  <input
                                    id="milestone-title"
                                    value={milestoneTitle}
                                    onChange={(e) =>
                                      setMilestoneTitle(e.target.value)
                                    }
                                    className="w-full p-2 border border-slate-300 rounded-md"
                                    placeholder="Milestone title"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label
                                    htmlFor="milestone-description"
                                    className="text-sm font-medium"
                                  >
                                    Description
                                  </label>
                                  <textarea
                                    id="milestone-description"
                                    value={milestoneDescription}
                                    onChange={(e) =>
                                      setMilestoneDescription(e.target.value)
                                    }
                                    className="w-full p-2 border border-slate-300 rounded-md"
                                    placeholder="Description"
                                    rows={3}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label
                                    htmlFor="milestone-date"
                                    className="text-sm font-medium"
                                  >
                                    Due Date
                                  </label>
                                  <input
                                    id="milestone-date"
                                    value={milestoneDueDate}
                                    onChange={(e) =>
                                      setMilestoneDueDate(e.target.value)
                                    }
                                    type="date"
                                    className="w-full p-2 border border-slate-300 rounded-md"
                                  />
                                </div>
                                <div className="flex justify-end pt-4">
                                  <Button
                                    onClick={() => {
                                      if (selectedPlanId === null)
                                        return toast({
                                          title: "Select a plan first",
                                          description: "",
                                        });
                                      if (!milestoneTitle)
                                        return toast({
                                          title: "Title required",
                                          description: "Please enter a title",
                                          variant: "destructive",
                                        });
                                      createMilestoneMutation.mutate({
                                        planId: selectedPlanId as number,
                                        title: milestoneTitle,
                                        description:
                                          milestoneDescription || undefined,
                                        dueDate: milestoneDueDate || undefined,
                                      });
                                    }}
                                    disabled={Boolean(
                                      (createMilestoneMutation as any).isLoading
                                    )}
                                  >
                                    Add Milestone
                                  </Button>
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
                          <TabsTrigger value="milestones">
                            Milestones
                          </TabsTrigger>
                          <TabsTrigger value="details">Details</TabsTrigger>
                          <TabsTrigger value="notes">Notes</TabsTrigger>
                        </TabsList>

                        <TabsContent value="milestones">
                          {isMilestonesLoading ? (
                            <div className="space-y-4">
                              {[1, 2, 3].map((i) => (
                                <div
                                  key={i}
                                  className="animate-pulse p-4 bg-slate-50 rounded-lg"
                                >
                                  <div className="h-4 bg-slate-200 rounded w-1/3 mb-2" />
                                  <div className="h-3 bg-slate-200 rounded w-1/2 mb-2" />
                                  <div className="h-2 bg-slate-200 rounded w-full" />
                                </div>
                              ))}
                            </div>
                          ) : isMilestonesError ? (
                            <div className="text-center py-8">
                              <p className="text-sm text-destructive-600 mb-3">
                                Failed to load milestones.
                              </p>
                              <div className="flex justify-center">
                                <Button onClick={() => refetchMilestones()}>
                                  Retry
                                </Button>
                              </div>
                            </div>
                          ) : milestones && milestones.length > 0 ? (
                            <div className="space-y-4">
                              <div className="bg-slate-50 p-4 rounded-lg">
                                <div className="flex justify-between items-center mb-2">
                                  <h3 className="font-medium">
                                    Overall Progress
                                  </h3>
                                  <span className="text-sm font-medium">
                                    {calculateCompletionPercentage(milestones)}%
                                  </span>
                                </div>
                                <Progress
                                  value={calculateCompletionPercentage(
                                    milestones
                                  )}
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
                                        canCreateHealthPlan
                                          ? "cursor-pointer"
                                          : "cursor-default"
                                      }`}
                                      onClick={() =>
                                        canCreateHealthPlan &&
                                        handleToggleMilestone(
                                          Number((milestone as any).id)
                                        )
                                      }
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
                                            milestone.completed
                                              ? "text-slate-500 line-through"
                                              : "text-slate-900"
                                          }`}
                                        >
                                          {milestone.title}
                                        </h4>
                                        {milestone.dueDate && (
                                          <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-full">
                                            Due:{" "}
                                            {new Date(
                                              milestone.dueDate
                                            ).toLocaleDateString()}
                                          </span>
                                        )}
                                      </div>
                                      {milestone.description && (
                                        <p
                                          className={`text-sm mt-1 ${
                                            milestone.completed
                                              ? "text-slate-400"
                                              : "text-slate-600"
                                          }`}
                                        >
                                          {milestone.description}
                                        </p>
                                      )}
                                      {milestone.completed &&
                                        milestone.completedOn && (
                                          <p className="text-xs text-slate-400 mt-2">
                                            Completed on{" "}
                                            {new Date(
                                              milestone.completedOn
                                            ).toLocaleDateString()}
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
                              <h3 className="text-lg font-medium text-slate-900">
                                No milestones found
                              </h3>
                              <p className="text-sm text-slate-500 mt-1 mb-4 max-w-md mx-auto">
                                This health plan doesn't have any milestones
                                yet.
                              </p>
                              {canCreateHealthPlan && (
                                <Button>
                                  <Plus className="h-4 w-4 mr-2" />
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
                                    {selectedPlanPet?.name ||
                                      `Pet ID: ${selectedPlan.petId}`}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-slate-500">
                                    Period
                                  </p>
                                  <p className="font-medium">
                                    {selectedPlan.startDate
                                      ? new Date(
                                          selectedPlan.startDate
                                        ).toLocaleDateString()
                                      : ""}
                                    {selectedPlan.endDate
                                      ? ` - ${new Date(
                                          selectedPlan.endDate
                                        ).toLocaleDateString()}`
                                      : ""}
                                  </p>
                                </div>
                              </div>

                              <div>
                                <p className="text-sm text-slate-500">
                                  Progress
                                </p>
                                <div className="mt-1">
                                  <div className="flex justify-between text-xs mb-1">
                                    <span className="font-medium">
                                      {milestones
                                        ? `${
                                            milestones.filter(
                                              (m) => m.completed
                                            ).length
                                          }/${milestones.length} completed`
                                        : "Loading..."}
                                    </span>
                                    <span>
                                      {calculateCompletionPercentage(
                                        milestones
                                      )}
                                      %
                                    </span>
                                  </div>
                                  <Progress
                                    value={calculateCompletionPercentage(
                                      milestones
                                    )}
                                    className="h-2"
                                  />
                                </div>
                              </div>

                              <div>
                                <p className="text-sm text-slate-500">
                                  Created By
                                </p>
                                <p className="font-medium">
                                  Staff ID:{" "}
                                  {typeof (selectedPlan as any)?.createdById !==
                                  "undefined"
                                    ? (selectedPlan as any).createdById
                                    : "Unknown"}
                                </p>
                              </div>
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="notes">
                          <div className="rounded-lg border border-slate-200 p-4 space-y-4">
                            {isNotesLoading ? (
                              <div className="space-y-3">
                                {[1, 2].map((i) => (
                                  <div
                                    key={i}
                                    className="animate-pulse p-3 bg-slate-50 rounded-lg"
                                  >
                                    <div className="h-3 bg-slate-200 rounded w-1/4 mb-2" />
                                    <div className="h-4 bg-slate-200 rounded w-full mb-1" />
                                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                                  </div>
                                ))}
                              </div>
                            ) : isNotesError ? (
                              <div className="text-center py-6">
                                <p className="text-sm text-destructive-600 mb-3">
                                  Failed to load notes.
                                </p>
                                <Button onClick={() => refetchNotes()}>
                                  Retry
                                </Button>
                              </div>
                            ) : planNotes && planNotes.length > 0 ? (
                              <div className="space-y-3 max-h-64 overflow-y-auto">
                                {planNotes.map((note: any) => (
                                  <div
                                    key={note.id}
                                    className="bg-slate-50 rounded-lg p-3"
                                  >
                                    <div className="flex justify-between items-start mb-2">
                                      <span className="text-xs text-slate-500">
                                        {new Date(
                                          note.createdAt
                                        ).toLocaleDateString()}{" "}
                                        at{" "}
                                        {new Date(
                                          note.createdAt
                                        ).toLocaleTimeString()}
                                      </span>
                                      {note.createdById && (
                                        <span className="text-xs text-slate-500">
                                          Staff ID: {note.createdById}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm text-slate-700 whitespace-pre-line">
                                      {note.note}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-6">
                                <p className="text-slate-500">
                                  No notes available for this health plan.
                                </p>
                              </div>
                            )}

                            {canCreateHealthPlan && (
                              <div className="pt-4 border-t border-slate-200">
                                <h3 className="font-medium mb-2">Add Note</h3>
                                <textarea
                                  className="w-full p-3 border border-slate-300 rounded-md text-sm"
                                  rows={4}
                                  placeholder="Enter a note for this health plan..."
                                  value={noteText}
                                  onChange={(e) => setNoteText(e.target.value)}
                                />
                                <div className="flex justify-end mt-2">
                                  <Button
                                    onClick={() => {
                                      if (selectedPlanId === null)
                                        return toast({
                                          title: "No plan selected",
                                          description: "",
                                        });
                                      if (!noteText.trim())
                                        return toast({
                                          title: "Note cannot be empty",
                                          description: "Please enter a note",
                                          variant: "destructive",
                                        });
                                      saveNoteMutation.mutate({
                                        planId: selectedPlanId,
                                        note: noteText.trim(),
                                      });
                                    }}
                                    disabled={
                                      saveNoteMutation.isPending ||
                                      !noteText.trim()
                                    }
                                  >
                                    {saveNoteMutation.isPending
                                      ? "Saving..."
                                      : "Save Note"}
                                  </Button>
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
                      <h3 className="text-lg font-medium text-slate-900">
                        Select a health plan
                      </h3>
                      <p className="text-sm text-slate-500 mt-2 text-center max-w-md">
                        Choose a health plan from the list to view details,
                        track milestones, and manage the plan.
                      </p>
                      {healthPlans &&
                        healthPlans.length === 0 &&
                        canCreateHealthPlan && (
                          <Button
                            className="mt-4"
                            onClick={() => setIsHealthPlanDialogOpen(true)}
                          >
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
    </RequirePermission>
  );
}
