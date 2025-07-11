'use client';
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Search, FileText, Send, Calendar, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { Referral, ReferralStatus, ReferralPriority, VetSpecialty, InsertReferral } from "@/db/schema";
import { usePractice } from "@/hooks/use-practice";

// Create the referral form schema
const referralFormSchema = z.object({
  petId: z.string(),
  referringPracticeId: z.string(),
  referringVetId: z.string(),
  referralReason: z.string().min(3, "Please provide a reason for the referral"),
  referralNotes: z.string().optional(),
  specialty: z.enum(Object.values(VetSpecialty) as [string, ...string[]]),
  priority: z.enum(Object.values(ReferralPriority) as [string, ...string[]]),
  scheduledDate: z.string().optional(),
});
type ReferralFormValues = z.infer<typeof referralFormSchema>;

export default function ReferralsPage() {
  const { practice } = usePractice();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("outbound");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Fetch referrals
  const { data: outboundReferrals, isLoading: isLoadingOutbound } = useQuery({
    queryKey: ['/api/referrals/outbound'],
    enabled: !!practice?.id,
  });

  const { data: inboundReferrals, isLoading: isLoadingInbound } = useQuery({
    queryKey: ['/api/referrals/inbound'],
    enabled: !!practice?.id,
  });

  // Fetch specialists/veterinarians for the form
  const { data: specialists, isLoading: isLoadingSpecialists } = useQuery({
    queryKey: ['/api/veterinarians/specialists'],
    enabled: !!practice?.id,
  });

  // Fetch practices for the form
  const { data: practices, isLoading: isLoadingPractices } = useQuery({
    queryKey: ['/api/practices'],
    enabled: !!practice?.id,
  });
  
  // Fetch pets for the form
  const { data: pets, isLoading: isLoadingPets } = useQuery({
    queryKey: ['/api/pets'],
    enabled: !!practice?.id,
  });
  
  // Create referral mutation
  const createReferralMutation = useMutation({
    mutationFn: async (values: ReferralFormValues) => {
      const response = await apiRequest("POST", "/api/referrals", values);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/referrals/outbound'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Referral created",
        description: "The referral has been successfully created.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create referral",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update referral status mutation
  const updateReferralStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      const response = await apiRequest("PATCH", `/api/referrals/${id}/status`, { status });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/referrals/outbound'] });
      queryClient.invalidateQueries({ queryKey: ['/api/referrals/inbound'] });
      toast({
        title: "Referral updated",
        description: "The referral status has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update referral",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Setup form
  const form = useForm<ReferralFormValues>({
    resolver: zodResolver(referralFormSchema),
    defaultValues: {
      petId: "",
      referringPracticeId: practice?.id?.toString() || "",
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
      status: ReferralStatus.DRAFT,
      scheduledDate: "",
      attachments: false,
      createAppointment: false,
    }
  });
type ReferralFormValues = z.infer<typeof referralFormSchema>;

  useEffect(() => {
    if (practice?.id && !form.getValues("referringPracticeId")) {
      form.setValue("referringPracticeId", practice.id);
    }
  }, [practice, form]);

  function onSubmit(values: ReferralFormValues) {
    createReferralMutation.mutate(values);
  }

  // Filter referrals based on search query
  const filteredOutboundReferrals = outboundReferrals?.filter((referral: Referral) => 
    searchQuery === "" ||
    referral.referralReason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    referral.specialty?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    referral.status?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredInboundReferrals = inboundReferrals?.filter((referral: Referral) => 
    searchQuery === "" ||
    referral.referralReason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    referral.specialty?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    referral.status?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];
  
  // Helper to format dates
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} (${formatDistanceToNow(date, { addSuffix: true })})`;
  };

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
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white">{status}</Badge>;
      case ReferralStatus.CANCELLED:
        return <Badge variant="outline" className="border-red-500 text-red-500">{status}</Badge>;
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
        return <Badge variant="secondary" className="bg-amber-500 hover:bg-amber-600 text-white">{priority}</Badge>;
      case ReferralPriority.EMERGENCY:
        return <Badge variant="destructive">{priority}</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  return (
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
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Referral
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[900px] max-h-screen overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Referral</DialogTitle>
                <DialogDescription>
                  Fill out the form below to create a new patient referral.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* Main form layout with 2 columns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Left column - Patient & Specialist Information */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Patient & Specialist Information
                      </h3>
                      
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
                                    <SelectItem key={pet.id} value={pet.id.toString()}>
                                      {pet.name} ({pet.species})
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
                                {Object.values(VetSpecialty).map((specialty) => (
                                  <SelectItem key={specialty} value={specialty}>
                                    {specialty.charAt(0).toUpperCase() + specialty.slice(1).replace("_", " ")}
                                  </SelectItem>
                                ))}
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
                                ) : (
                                  practices?.filter((p: any) => p.id !== practice?.id).map((p: any) => (
                                    <SelectItem key={p.id} value={p.id.toString()}>
                                      {p.name}
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
                                ) : (
                                  specialists?.map((specialist: any) => (
                                    <SelectItem key={specialist.id} value={specialist.id.toString()}>
                                      {specialist.name}
                                    </SelectItem>
                                  ))
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
                                  {Object.values(ReferralPriority).map((priority) => (
                                    <SelectItem key={priority} value={priority}>
                                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                                    </SelectItem>
                                  ))}
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
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0 pt-2">
                              <FormControl>
                                <input
                                  type="checkbox"
                                  checked={field.value}
                                  onChange={field.onChange}
                                  className="checkbox"
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Create appointment automatically
                              </FormLabel>
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
                      <Button type="button" variant="outline">Cancel</Button>
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
      
      <Tabs defaultValue="outbound" value={activeTab} onValueChange={setActiveTab}>
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
                      {filteredOutboundReferrals.map((referral: Referral) => (
                        <TableRow key={referral.id}>
                          <TableCell>{referral.pet?.name || 'Unknown'}</TableCell>
                          <TableCell>{referral.specialist?.name || 'Not assigned'}</TableCell>
                          <TableCell>{referral.specialty}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{referral.referralReason}</TableCell>
                          <TableCell>{getPriorityBadge(referral.priority)}</TableCell>
                          <TableCell>{getStatusBadge(referral.status)}</TableCell>
                          <TableCell>{formatDate(referral.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm">
                                <FileText className="h-4 w-4" />
                                <span className="sr-only">View Details</span>
                              </Button>
                              
                              {referral.status === ReferralStatus.DRAFT && (
                                <Button 
                                  size="sm"
                                  onClick={() => updateReferralStatusMutation.mutate({ id: referral.id, status: ReferralStatus.PENDING })}
                                  disabled={updateReferralStatusMutation.isPending}
                                >
                                  <Send className="h-4 w-4 mr-1" />
                                  Send
                                </Button>
                              )}
                              
                              {referral.status === ReferralStatus.PENDING && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => updateReferralStatusMutation.mutate({ id: referral.id, status: ReferralStatus.CANCELLED })}
                                  disabled={updateReferralStatusMutation.isPending}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Cancel
                                </Button>
                              )}
                              
                              {referral.scheduledDate && referral.status === ReferralStatus.ACCEPTED && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                >
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
                  <p className="text-muted-foreground">No outbound referrals found</p>
                  {searchQuery && (
                    <p className="text-sm text-muted-foreground mt-1">Try adjusting your search query</p>
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
                      {filteredInboundReferrals.map((referral: Referral) => (
                        <TableRow key={referral.id}>
                          <TableCell>{referral.pet?.name || 'Unknown'}</TableCell>
                          <TableCell>{referral.referringVet?.name || 'Unknown'}</TableCell>
                          <TableCell>{referral.specialty}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{referral.referralReason}</TableCell>
                          <TableCell>{getPriorityBadge(referral.priority)}</TableCell>
                          <TableCell>{getStatusBadge(referral.status)}</TableCell>
                          <TableCell>{formatDate(referral.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm">
                                <FileText className="h-4 w-4" />
                                <span className="sr-only">View Details</span>
                              </Button>
                              
                              {referral.status === ReferralStatus.PENDING && (
                                <>
                                  <Button 
                                    size="sm"
                                    onClick={() => updateReferralStatusMutation.mutate({ id: referral.id, status: ReferralStatus.ACCEPTED })}
                                    disabled={updateReferralStatusMutation.isPending}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Accept
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => updateReferralStatusMutation.mutate({ id: referral.id, status: ReferralStatus.DECLINED })}
                                    disabled={updateReferralStatusMutation.isPending}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Decline
                                  </Button>
                                </>
                              )}
                              
                              {referral.status === ReferralStatus.ACCEPTED && (
                                <Button 
                                  size="sm"
                                  onClick={() => updateReferralStatusMutation.mutate({ id: referral.id, status: ReferralStatus.COMPLETED })}
                                  disabled={updateReferralStatusMutation.isPending}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Complete
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
                  <p className="text-muted-foreground">No inbound referrals found</p>
                  {searchQuery && (
                    <p className="text-sm text-muted-foreground mt-1">Try adjusting your search query</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
