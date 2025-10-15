"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { RequirePermission, PermissionButton } from "@/lib/rbac/components";
import {
  Loader2,
  Plus,
  Search,
  FileText,
  Send,
  Calendar,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import {
  Referral,
  ReferralStatus,
  ReferralPriority,
  VetSpecialty,
  InsertReferral,
} from "@/db/schema";
import { usePractice } from "@/hooks/use-practice";

// Create the referral form schema
const referralFormSchema = z.object({
  petId: z.string().min(1, "Please select a patient"),
  referringVetId: z.string().min(1, "Please select a referring veterinarian"),
  specialistId: z.string().optional(),
  specialistPracticeId: z.string().optional(),
  referralReason: z.string().min(3, "Please provide a reason for the referral"),
  specialty: z.enum(Object.values(VetSpecialty) as [string, ...string[]], {
    required_error: "Please select a specialty",
  }),
  clinicalHistory: z.string().optional(),
  currentMedications: z.string().optional(),
  diagnosticTests: z.string().optional(),
  referralNotes: z.string().optional(),
  priority: z.enum(Object.values(ReferralPriority) as [string, ...string[]]),
  scheduledDate: z.string().optional(),
  createAppointment: z.boolean().default(false),
});
type ReferralFormValues = z.infer<typeof referralFormSchema>;

export default function ReferralsPage() {
  const {
    practice,
    availablePractices: practices,
    practicesLoading: isLoadingPractices,
  } = usePractice();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("outbound");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Fetch referrals
  const {
    data: outboundReferrals,
    isLoading: isLoadingOutbound,
    refetch: refetchOutbound,
  } = useQuery({
    queryKey: ["/api/referrals/outbound"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/referrals/outbound");
      return await response.json();
    },
    enabled: !!practice?.id,
    staleTime: 0, // Always consider data stale for immediate updates
    refetchOnWindowFocus: true,
  });

  const {
    data: inboundReferrals,
    isLoading: isLoadingInbound,
    refetch: refetchInbound,
  } = useQuery({
    queryKey: ["/api/referrals/inbound"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/referrals/inbound");
      return await response.json();
    },
    enabled: !!practice?.id,
    staleTime: 0, // Always consider data stale for immediate updates
    refetchOnWindowFocus: true,
  });

  // Fetch specialists for the form
  const { data: specialists, isLoading: isLoadingSpecialists } = useQuery({
    // include practice id in the key so the list refreshes per-practice
    queryKey: ["/api/veterinarians/specialists", practice?.id],
    queryFn: async () => {
      try {
        const response = await apiRequest(
          "GET",
          `/api/veterinarians/specialists?practiceId=${practice?.id}`
        );
        return await response.json();
      } catch (err) {
        console.error("Failed to load specialists:", err);
        // Return an empty list so the UI can show a clear 'no results' state instead of failing
        return [];
      }
    },
    enabled: !!practice?.id,
  });

  // Fetch veterinarians for the current practice
  const { data: veterinarians, isLoading: isLoadingVets } = useQuery({
    queryKey: ["/api/veterinarians"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/veterinarians");
      return await response.json();
    },
    enabled: !!practice?.id,
  });

  // availablePractices is provided by usePractice() (user's accessible practices)

  // Fetch pets for the form
  const { data: pets, isLoading: isLoadingPets } = useQuery({
    queryKey: ["/api/pets"],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/pets?practiceId=${practice?.id}`
      );
      return await response.json();
    },
    enabled: !!practice?.id,
  });

  // Create referral mutation
  const createReferralMutation = useMutation({
    mutationFn: async (values: ReferralFormValues) => {
      const response = await apiRequest("POST", "/api/referrals", values);
      return await response.json();
    },
    onSuccess: async (newReferral) => {
      // Immediately refetch the outbound referrals
      await refetchOutbound();

      form.reset(); // Reset the form
      setIsCreateDialogOpen(false);
      toast({
        title: "Referral created",
        description: "The referral has been successfully created.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create referral",
        description:
          error.message || "An error occurred while creating the referral",
        variant: "destructive",
      });
    },
  });

  // Update referral status mutation
  const updateReferralStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/referrals/${id}/status`,
        { status }
      );
      return await response.json();
    },
    onMutate: async ({ id, status }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({
        queryKey: ["/api/referrals/outbound"],
      });
      await queryClient.cancelQueries({ queryKey: ["/api/referrals/inbound"] });

      // Snapshot the previous values
      const previousOutbound = queryClient.getQueryData([
        "/api/referrals/outbound",
      ]);
      const previousInbound = queryClient.getQueryData([
        "/api/referrals/inbound",
      ]);

      // Optimistically update the referral status
      queryClient.setQueryData(["/api/referrals/outbound"], (old: any) => {
        if (!old) return old;
        return old.map((referral: any) =>
          referral.id === id ? { ...referral, status } : referral
        );
      });

      queryClient.setQueryData(["/api/referrals/inbound"], (old: any) => {
        if (!old) return old;
        return old.map((referral: any) =>
          referral.id === id ? { ...referral, status } : referral
        );
      });

      // Return a context object with the snapshotted values
      return { previousOutbound, previousInbound };
    },
    onSuccess: async () => {
      // Force immediate refetch of both queries
      await Promise.all([refetchOutbound(), refetchInbound()]);

      toast({
        title: "Referral updated",
        description: "The referral status has been successfully updated.",
      });
    },
    onError: async (error: any, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousOutbound) {
        queryClient.setQueryData(
          ["/api/referrals/outbound"],
          context.previousOutbound
        );
      }
      if (context?.previousInbound) {
        queryClient.setQueryData(
          ["/api/referrals/inbound"],
          context.previousInbound
        );
      }

      // Also refetch to ensure we have the correct data
      await Promise.all([refetchOutbound(), refetchInbound()]);

      toast({
        title: "Failed to update referral",
        description:
          error.message || "An error occurred while updating the referral",
        variant: "destructive",
      });
    },
  });

  // Setup form
  const form = useForm<ReferralFormValues>({
    resolver: zodResolver(referralFormSchema),
    defaultValues: {
      petId: "",
      referringVetId: "",
      specialistId: "",
      specialistPracticeId: "",
      specialty: VetSpecialty.OTHER,
      referralReason: "",
      clinicalHistory: "",
      currentMedications: "",
      diagnosticTests: "",
      referralNotes: "",
      priority: ReferralPriority.ROUTINE,
      scheduledDate: "",
      createAppointment: false,
    },
  });

  function onSubmit(values: ReferralFormValues) {
    createReferralMutation.mutate(values);
  }

  // Helper to format dates (accepts string or Date)
  const formatDate = (dateInput?: string | Date) => {
    if (!dateInput) return "N/A";
    const date =
      typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    return `${date.toLocaleDateString()} (${formatDistanceToNow(date, {
      addSuffix: true,
    })})`;
  };

  // Normalize fields that sometimes come back as string[] from the DB/schema
  const asString = (v?: string | string[] | null) => {
    if (!v) return "";
    return Array.isArray(v) ? v.join(" ") : String(v);
  };

  // Practices available to the user (include current). If you want to exclude the
  // current practice, change this to filter it out. We show the current practice
  // as an option and mark it "(current)" so the select is never empty when the
  // user at least has access to their own location.
  const practiceOptions = practices || [];

  // Filter referrals based on search query (robust against string|string[] types)
  const filteredOutboundReferrals =
    outboundReferrals?.filter((referral: any) => {
      if (searchQuery === "") return true;
      const q = searchQuery.toLowerCase();
      const reason = asString(referral.referralReason).toLowerCase();
      const specialty = asString(referral.specialty).toLowerCase();
      const status = asString(referral.status).toLowerCase();
      return reason.includes(q) || specialty.includes(q) || status.includes(q);
    }) || [];

  const filteredInboundReferrals =
    inboundReferrals?.filter((referral: any) => {
      if (searchQuery === "") return true;
      const q = searchQuery.toLowerCase();
      const reason = asString(referral.referralReason).toLowerCase();
      const specialty = asString(referral.specialty).toLowerCase();
      const status = asString(referral.status).toLowerCase();
      return reason.includes(q) || specialty.includes(q) || status.includes(q);
    }) || [];

  // Helper to get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case ReferralStatus.DRAFT:
        return <Badge variant="outline">{status}</Badge>;
      case ReferralStatus.PENDING:
        return <Badge variant="secondary">{status}</Badge>;
      case ReferralStatus.ACCEPTED:
        return <Badge variant="default">{status}</Badge>;
      case ReferralStatus.DECLINED:
        return <Badge variant="destructive">{status}</Badge>;
      case ReferralStatus.COMPLETED:
        return (
          <Badge
            variant="default"
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            {status}
          </Badge>
        );
      case ReferralStatus.CANCELLED:
        return (
          <Badge variant="outline" className="border-red-500 text-red-500">
            {status}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Helper to get priority badge
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case ReferralPriority.ROUTINE:
        return <Badge variant="outline">{priority}</Badge>;
      case ReferralPriority.URGENT:
        return (
          <Badge
            variant="secondary"
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            {priority}
          </Badge>
        );
      case ReferralPriority.EMERGENCY:
        return <Badge variant="destructive">{priority}</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  return (
    <RequirePermission resource={"referrals" as any} action={"READ" as any}>
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Referrals</h1>
            <p className="text-muted-foreground">
              Manage patient referrals to and from specialists
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search referrals..."
                className="w-full sm:w-[250px] pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            >
              <DialogTrigger asChild>
                <PermissionButton
                  resource={"referrals" as any}
                  action={"CREATE" as any}
                  className="inline-flex items-center"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Referral
                </PermissionButton>
              </DialogTrigger>
              <DialogContent className="max-w-[900px] max-h-screen overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Referral</DialogTitle>
                  <DialogDescription>
                    Fill out the form below to create a new patient referral.
                  </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                  >
                    {/* Main form layout with 2 columns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left column - Patient & Specialist Information */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Patient & Specialist Information
                        </h3>

                        <FormField
                          control={form.control}
                          name="referringVetId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Referring Veterinarian</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value?.toString()}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select referring vet" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {isLoadingVets ? (
                                    <div className="flex justify-center p-2">
                                      <Loader2 className="h-5 w-5 animate-spin" />
                                    </div>
                                  ) : (
                                    veterinarians?.map((vet: any) => (
                                      <SelectItem
                                        key={vet.id}
                                        value={vet.id.toString()}
                                      >
                                        {vet.name}
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="petId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Patient</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value?.toString()}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select patient" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {isLoadingPets ? (
                                    <div className="flex justify-center p-2">
                                      <Loader2 className="h-5 w-5 animate-spin" />
                                    </div>
                                  ) : (
                                    pets?.map((pet: any) => (
                                      <SelectItem
                                        key={pet.id}
                                        value={pet.id.toString()}
                                      >
                                        {pet.name} ({pet.species}) -{" "}
                                        {pet.owner?.name}
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="specialty"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Specialty</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select specialty" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Object.values(VetSpecialty).map(
                                    (specialty) => (
                                      <SelectItem
                                        key={specialty}
                                        value={specialty}
                                      >
                                        {specialty.charAt(0).toUpperCase() +
                                          specialty.slice(1).replace("_", " ")}
                                      </SelectItem>
                                    )
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="specialistPracticeId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Specialist Practice</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value?.toString()}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select practice" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {isLoadingPractices ? (
                                    <div className="flex justify-center p-2">
                                      <Loader2 className="h-5 w-5 animate-spin" />
                                    </div>
                                  ) : practiceOptions.length > 0 ? (
                                    practiceOptions.map((p: any) => (
                                      <SelectItem
                                        key={p.id}
                                        value={p.id.toString()}
                                      >
                                        {p.name}
                                        {p.id === practice?.id
                                          ? " (current)"
                                          : ""}
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <SelectItem disabled value="">
                                      No other practices available
                                    </SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="specialistId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Specialist</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value?.toString()}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select specialist" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {isLoadingSpecialists ? (
                                    <div className="flex justify-center p-2">
                                      <Loader2 className="h-5 w-5 animate-spin" />
                                    </div>
                                  ) : specialists && specialists.length > 0 ? (
                                    specialists.map((specialist: any) => (
                                      <SelectItem
                                        key={specialist.id}
                                        value={specialist.id.toString()}
                                      >
                                        {specialist.name}
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <SelectItem disabled value="">
                                      No specialists found
                                    </SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Scheduling and Priority */}
                        <div className="pt-4 space-y-4">
                          <h3 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Scheduling
                          </h3>

                          <FormField
                            control={form.control}
                            name="priority"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Priority</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select priority" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {Object.values(ReferralPriority).map(
                                      (priority) => (
                                        <SelectItem
                                          key={priority}
                                          value={priority}
                                        >
                                          {priority.charAt(0).toUpperCase() +
                                            priority.slice(1)}
                                        </SelectItem>
                                      )
                                    )}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="scheduledDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Preferred Date (if known)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="date"
                                    {...field}
                                    value={field.value || ""}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="createAppointment"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="font-normal">
                                    Create appointment automatically
                                  </FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Right column - Clinical Information */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Clinical Information
                        </h3>

                        <FormField
                          control={form.control}
                          name="referralReason"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Reason for Referral</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Provide the reason for this referral"
                                  className="resize-none min-h-[80px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="clinicalHistory"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Clinical History</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Provide relevant clinical history"
                                  className="resize-none min-h-[80px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="currentMedications"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Current Medications</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="List current medications"
                                  className="resize-none min-h-[80px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="diagnosticTests"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Diagnostic Tests</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="List relevant diagnostic tests and results"
                                  className="resize-none min-h-[80px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="referralNotes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Additional Notes</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Any additional information for the specialist"
                                  className="resize-none min-h-[80px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <DialogClose asChild>
                        <Button type="button" variant="outline">
                          Cancel
                        </Button>
                      </DialogClose>
                      <Button
                        type="submit"
                        disabled={createReferralMutation.isPending}
                      >
                        {createReferralMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Create Referral
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs
          defaultValue="outbound"
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <TabsList className="grid w-full sm:w-auto grid-cols-2">
            <TabsTrigger value="outbound">Outbound Referrals</TabsTrigger>
            <TabsTrigger value="inbound">Inbound Referrals</TabsTrigger>
          </TabsList>

          <TabsContent value="outbound" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Outbound Referrals</CardTitle>
                <CardDescription>
                  Referrals sent to other veterinary specialists
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingOutbound ? (
                  <div className="flex justify-center p-6">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : filteredOutboundReferrals.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Patient</TableHead>
                          <TableHead>Specialist</TableHead>
                          <TableHead>Specialty</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOutboundReferrals.map((r: any) => (
                          <TableRow key={r.id}>
                            <TableCell>
                              {(r as any).pet?.name || "Unknown"}
                            </TableCell>
                            <TableCell>
                              {(r as any).specialist?.name || "Not assigned"}
                            </TableCell>
                            <TableCell>
                              {asString((r as any).specialty)}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {asString((r as any).referralReason)}
                            </TableCell>
                            <TableCell>
                              {getPriorityBadge(asString((r as any).priority))}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(asString((r as any).status))}
                            </TableCell>
                            <TableCell>
                              {formatDate((r as any).createdAt)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm">
                                  <FileText className="h-4 w-4" />
                                  <span className="sr-only">View Details</span>
                                </Button>

                                {asString((r as any).status) ===
                                  ReferralStatus.DRAFT && (
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      updateReferralStatusMutation.mutate({
                                        id: (r as any).id,
                                        status: ReferralStatus.PENDING,
                                      })
                                    }
                                    disabled={
                                      updateReferralStatusMutation.isPending
                                    }
                                  >
                                    {updateReferralStatusMutation.isPending ? (
                                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                    ) : (
                                      <Send className="h-4 w-4 mr-1" />
                                    )}
                                    Send
                                  </Button>
                                )}

                                {asString((r as any).status) ===
                                  ReferralStatus.PENDING && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      updateReferralStatusMutation.mutate({
                                        id: (r as any).id,
                                        status: ReferralStatus.CANCELLED,
                                      })
                                    }
                                    disabled={
                                      updateReferralStatusMutation.isPending
                                    }
                                  >
                                    {updateReferralStatusMutation.isPending ? (
                                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                    ) : (
                                      <XCircle className="h-4 w-4 mr-1" />
                                    )}
                                    Cancel
                                  </Button>
                                )}

                                {asString((r as any).scheduledDate) &&
                                  asString((r as any).status) ===
                                    ReferralStatus.ACCEPTED && (
                                    <Button variant="outline" size="sm">
                                      <Calendar className="h-4 w-4 mr-1" />
                                      Scheduled
                                    </Button>
                                  )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center p-6">
                    <p className="text-muted-foreground">
                      No outbound referrals found
                    </p>
                    {searchQuery && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Try adjusting your search query
                      </p>
                    )}
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setIsCreateDialogOpen(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create your first referral
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inbound" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Inbound Referrals</CardTitle>
                <CardDescription>
                  Referrals received from other veterinary practices
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingInbound ? (
                  <div className="flex justify-center p-6">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : filteredInboundReferrals.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Patient</TableHead>
                          <TableHead>Referring Vet</TableHead>
                          <TableHead>Specialty</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Received</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredInboundReferrals.map((r: any) => (
                          <TableRow key={r.id}>
                            <TableCell>
                              {(r as any).pet?.name || "Unknown"}
                            </TableCell>
                            <TableCell>
                              {(r as any).referringVet?.name || "Unknown"}
                            </TableCell>
                            <TableCell>
                              {asString((r as any).specialty)}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {asString((r as any).referralReason)}
                            </TableCell>
                            <TableCell>
                              {getPriorityBadge(asString((r as any).priority))}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(asString((r as any).status))}
                            </TableCell>
                            <TableCell>
                              {formatDate((r as any).createdAt)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm">
                                  <FileText className="h-4 w-4" />
                                  <span className="sr-only">View Details</span>
                                </Button>

                                {asString((r as any).status) ===
                                  ReferralStatus.PENDING && (
                                  <>
                                    <PermissionButton
                                      resource={"referrals" as any}
                                      action={"UPDATE" as any}
                                    >
                                      <Button
                                        size="sm"
                                        onClick={() =>
                                          updateReferralStatusMutation.mutate({
                                            id: (r as any).id,
                                            status: ReferralStatus.ACCEPTED,
                                          })
                                        }
                                        disabled={
                                          updateReferralStatusMutation.isPending
                                        }
                                      >
                                        {updateReferralStatusMutation.isPending ? (
                                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                        ) : (
                                          <CheckCircle className="h-4 w-4 mr-1" />
                                        )}
                                        Accept
                                      </Button>
                                    </PermissionButton>
                                    <PermissionButton
                                      resource={"referrals" as any}
                                      action={"UPDATE" as any}
                                    >
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          updateReferralStatusMutation.mutate({
                                            id: (r as any).id,
                                            status: ReferralStatus.DECLINED,
                                          })
                                        }
                                        disabled={
                                          updateReferralStatusMutation.isPending
                                        }
                                      >
                                        {updateReferralStatusMutation.isPending ? (
                                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                        ) : (
                                          <XCircle className="h-4 w-4 mr-1" />
                                        )}
                                        Decline
                                      </Button>
                                    </PermissionButton>
                                  </>
                                )}

                                {asString((r as any).status) ===
                                  ReferralStatus.ACCEPTED && (
                                  <PermissionButton
                                    resource={"referrals" as any}
                                    action={"UPDATE" as any}
                                  >
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        updateReferralStatusMutation.mutate({
                                          id: (r as any).id,
                                          status: ReferralStatus.COMPLETED,
                                        })
                                      }
                                      disabled={
                                        updateReferralStatusMutation.isPending
                                      }
                                    >
                                      {updateReferralStatusMutation.isPending ? (
                                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                      ) : (
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                      )}
                                      Complete
                                    </Button>
                                  </PermissionButton>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center p-6">
                    <p className="text-muted-foreground">
                      No inbound referrals found
                    </p>
                    {searchQuery && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Try adjusting your search query
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RequirePermission>
  );
}
