'use client';
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/context/UserContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LabResultsTrendViewer } from "@/components/lab/lab-results-trend-viewer";
import { LabResultsVisualization } from "@/components/lab/lab-results-visualization";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Loader2, Plus, Trash2, Edit, Search, FileText, Download, AlertCircle, CheckCircle2, X, BarChart3, LineChart, ListFilter, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

// Define simple provider schema without complex refinements
const providerSchema = z.object({
  provider: z.enum([
    "idexx",
    "antech",
    "zoetis",
    "heska",
    "in_house",
    "other",
  ]),
  isActive: z.boolean().default(true),
  apiKey: z.string().optional().nullable(),
  apiSecret: z.string().optional().nullable(),
  accountId: z.string().optional().nullable(),
  // In-house specific fields
  inHouseEquipment: z.string().optional().nullable(),
  inHouseContact: z.string().optional().nullable(),
  inHouseLocation: z.string().optional().nullable(),
  settings: z.any().optional(),
});

type LabProviderSettings = z.infer<typeof providerSchema> & { id?: number };

const testCatalogSchema = z.object({
  testCode: z.string().optional(),
  testName: z.string().min(2, "Test name must be at least 2 characters"), // Changed back to testName
  category: z.enum([
    "blood_chemistry",
    "hematology",
    "urinalysis",
    "pathology",
    "microbiology",
    "parasitology",
    "endocrinology",
    "serology",
    "cytology",
    "imaging",
    "other",
  ]),
  provider: z.enum([
    "idexx",
    "antech",
    "zoetis",
    "heska",
    "in_house",
    "other",
  ]),
  price: z.string().optional(),
  description: z.string().optional().nullable(),
  sampleType: z.string().optional().nullable(),
  sampleVolume: z.string().optional().nullable(),
  turnAroundTime: z.string().optional().nullable(),
});

type TestCatalog = z.infer<typeof testCatalogSchema>;

const labOrderSchema = z.object({
  provider: z.enum([
    "idexx",
    "antech",
    "zoetis",
    "heska",
    "in_house",
    "other",
  ]),
  petId: z.string({
    required_error: "Please select a patient",
  }).min(1, "Please select a patient"),
  status: z.enum([
    "draft",
    "ordered",
    "submitted",
    "in_progress",
    "completed",
    "cancelled",
  ]).default("draft"),
  sampleType: z.string().optional(),
  sampleCollection: z.string().optional(), // Maps to sampleCollectionDate in API
  providerAccessionNumber: z.string().optional(), // Maps to externalReference in API
  priority: z.enum(["routine", "urgent", "stat"]).default("routine"),
  notes: z.string().optional(),
  tests: z.array(z.number()).optional(), // Made optional since we handle this through state
});

type LabOrder = z.infer<typeof labOrderSchema>;

const labResultSchema = z.object({
  status: z.enum([
    "normal",
    "abnormal",
    "critical",
    "pending",
    "inconclusive",
  ]),
  resultValue: z.string().optional().nullable(),
  resultUnit: z.string().optional().nullable(),
  referenceRange: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  testCatalogId: z.number().optional().nullable(),
  performedById: z.number().optional().nullable(),
  filePath: z.string().optional().nullable(),
});

type LabResult = z.infer<typeof labResultSchema>;

const LabIntegrationPage = () => {
  const { toast } = useToast();
  const { user, isLoading: isUserLoading } = useUser();
  const [activeTab, setActiveTab] = useState("providers");
  const [selectedProvider, setSelectedProvider] = useState<LabProviderSettings | null>(null);
  const [isAddingProvider, setIsAddingProvider] = useState(false);
  const [isAddingTest, setIsAddingTest] = useState(false);
  const [selectedTest, setSelectedTest] = useState<any | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [selectedPet, setSelectedPet] = useState<any | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [selectedOrderTests, setSelectedOrderTests] = useState<Array<any>>([]);
  const [selectedTestIds, setSelectedTestIds] = useState<Array<number>>([]);
  const [isSubmittingResults, setIsSubmittingResults] = useState(false);
  const [selectedResult, setSelectedResult] = useState<any | null>(null);
  const [isViewingOrderDetails, setIsViewingOrderDetails] = useState(false);
  const [orderDetailsData, setOrderDetailsData] = useState<any | null>(null);
  const [resultParams, setResultParams] = useState<Array<{name: string, value: string, units: string, status: string}>>([
    { name: "", value: "", units: "", status: "normal" }
  ]);
  const [resultFile, setResultFile] = useState<File | null>(null);
  const [selectedResultFilter, setSelectedResultFilter] = useState<string>("all");
  const [selectedPatientFilter, setSelectedPatientFilter] = useState<number | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [isInHouseProvider, setIsInHouseProvider] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string | null>(null);
  const [filterPetId, setFilterPetId] = useState<number | null>(null);
  const [filterProvider, setFilterProvider] = useState<string>("all");
  
  // Get practice ID from user context
  const getPracticeId = () => {
    if (!user) return null;
    if (user.role === 'ADMINISTRATOR') {
      return user.currentPracticeId;
    }
    if ('practiceId' in user) {
      return user.practiceId;
    }
    return null;
  };
  
  // Fetch lab providers
  const {
    data: providers = [], // Default to empty array
    isLoading: isLoadingProviders,
    error: providersError,
    refetch: refetchProviders,
  } = useQuery({
    queryKey: ["/api/lab/providers"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/lab/providers");
        return await response.json();
      } catch (error: any) {
        if (error.status === 401) {
          window.location.href = '/auth/login?error=session_expired';
        }
        throw error;
      }
    },
    retry: false, // Don't retry on auth errors
    enabled: true, // Enable to fetch real data
  });

  // Fetch lab test catalog
  const {
    data: testCatalog = [], // Default to empty array
    isLoading: isLoadingTestCatalog,
    error: testCatalogError,
    refetch: refetchTestCatalog,
  } = useQuery({
    queryKey: ["/api/lab/test-catalog"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/lab/test-catalog");
        return await response.json();
      } catch (error: any) {
        if (error.status === 401) {
          window.location.href = '/auth/login?error=session_expired';
        }
        throw error;
      }
    },
    retry: false, // Don't retry on auth errors
    enabled: true, // Enable to fetch real data
  });

  // Fetch lab orders
  const {
    data: labOrders = [], // Default to empty array
    isLoading: isLoadingLabOrders,
    error: labOrdersError,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ["/api/lab/orders"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/lab/orders");
        return await response.json();
      } catch (error: any) {
        if (error.status === 401) {
          window.location.href = '/auth/login?error=session_expired';
        }
        throw error;
      }
    },
    retry: false,
    enabled: true,
  });
  
  // Fetch lab results
  const {
    data: labResults = [],
    isLoading: isLoadingLabResults,
    error: labResultsError,
  } = useQuery({
    queryKey: ["/api/lab/results"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/lab/results");
        return await response.json();
      } catch (error: any) {
        if (error.status === 401) {
          window.location.href = '/auth/login?error=session_expired';
        }
        throw error;
      }
    },
    retry: false,
    enabled: true,
  });

  // Fetch pets
  const {
    data: pets = [],
    isLoading: isLoadingPets,
    error: petsError,
  } = useQuery({
    queryKey: ["/api/pets", getPracticeId()],
    queryFn: async () => {
      const practiceId = getPracticeId();
      if (!practiceId) {
        throw new Error('No practice ID available');
      }
      
      try {
        const response = await apiRequest("GET", `/api/pets?practiceId=${practiceId}`);
        return await response.json();
      } catch (error: any) {
        if (error.status === 401) {
          window.location.href = '/auth/login?error=session_expired';
        }
        throw error;
      }
    },
    retry: false,
    enabled: !!user && !!getPracticeId(),
  });
  
  // Transform pets data to petOptions for select input
  const petOptions = useMemo(() => {
    if (!pets || pets.length === 0) {
      return [];
    }
    return pets.map((pet: any) => ({
      id: pet.id,
      name: pet.name,
      species: pet.species
    }));
  }, [pets]);

  // Define extended provider schema with conditional validation
  const extendedProviderSchema = z.object({
    provider: z.enum(["idexx", "antech", "zoetis", "heska", "in_house", "other"]),
    isActive: z.boolean().default(true),
    apiKey: z.string().optional().nullable(),
    apiSecret: z.string().optional().nullable(),
    accountId: z.string().optional().nullable(),
    inHouseEquipment: z.string().optional(),
    inHouseContact: z.string().optional(),
    inHouseLocation: z.string().optional(),
    settings: z.any().optional(),
  }).refine((data) => {
    // For external providers, require API fields
    if (data.provider !== 'in_house') {
      return data.apiKey && data.apiSecret && data.accountId;
    }
    // For in-house, require the in-house fields
    return data.inHouseEquipment && data.inHouseContact && data.inHouseLocation;
  }, {
    message: "Required fields are missing for the selected provider type",
  });

  // Provider form with enhanced validation
  const providerForm = useForm<z.infer<typeof extendedProviderSchema>>({
    resolver: zodResolver(extendedProviderSchema),
    defaultValues: {
      provider: "idexx",
      isActive: true,
      apiKey: "",
      apiSecret: "",
      accountId: "",
      inHouseEquipment: "",
      inHouseContact: "",
      inHouseLocation: "",
      settings: {},
    },
  });
  
  // Watch for changes in the provider field to conditionally display API credential fields
  const selectedProviderType = providerForm.watch("provider");
  
  // Update form values when provider type changes
  useEffect(() => {
    // Set default values based on provider type
    if (selectedProviderType === "in_house") {
      // Default values for in-house provider
      providerForm.setValue("apiKey", "");
      providerForm.setValue("apiSecret", "");
      providerForm.setValue("accountId", "");
      
      // Only set default values if fields are empty
      if (!providerForm.getValues("inHouseEquipment")) {
        providerForm.setValue("inHouseEquipment", "");
      }
      if (!providerForm.getValues("inHouseContact")) {
        providerForm.setValue("inHouseContact", "");
      }
      if (!providerForm.getValues("inHouseLocation")) {
        providerForm.setValue("inHouseLocation", "");
      }
    } else {
      // Default values for external provider
      providerForm.setValue("inHouseEquipment", "");
      providerForm.setValue("inHouseContact", "");
      providerForm.setValue("inHouseLocation", "");
      
      // Only set default values if fields are empty
      if (!providerForm.getValues("apiKey")) {
        providerForm.setValue("apiKey", "");
      }
      if (!providerForm.getValues("apiSecret")) {
        providerForm.setValue("apiSecret", "");
      }
      if (!providerForm.getValues("accountId")) {
        providerForm.setValue("accountId", "");
      }
    }
  }, [selectedProviderType, providerForm]);

  // Create/update provider mutation
  const providerMutation = useMutation({
    mutationFn: async (data: LabProviderSettings) => {
      console.log('Provider mutation data:', data);
      
      // For the in-house provider, we need to make sure the API credentials are null
      if (data.provider === 'in_house') {
        data.apiKey = null;
        data.apiSecret = null;
        data.accountId = null;
      }
      
      try {
        if (selectedProvider) {
          // Update existing provider
          console.log('Updating provider:', selectedProvider.id);
          const response = await apiRequest(
            "PUT",
            `/api/lab/providers/${selectedProvider.id}`,
            data
          );
          return await response.json();
        } else {
          // Create new provider - Use real API endpoint
          console.log('Creating new provider');
          const response = await apiRequest("POST", "/api/lab/providers", data);
          return await response.json();
        }
      } catch (error: any) {
        if (error.status === 401) {
          window.location.href = '/auth/login?error=session_expired';
        }
        throw error;
      }
    },
    onSuccess: (result) => {
      console.log('Provider mutation success:', result);
      toast({
        title: selectedProvider ? "Provider updated" : "Provider added",
        description: selectedProvider
          ? "The lab provider settings have been updated."
          : "A new lab provider has been added.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lab/providers"] });
      refetchProviders();
      setSelectedProvider(null);
      setIsAddingProvider(false);
      providerForm.reset();
    },
    onError: (error) => {
      console.error('Provider mutation error:', error);
      toast({
        title: "Error",
        description: `Failed to ${selectedProvider ? "update" : "add"} lab provider: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Test catalog form
  const testCatalogForm = useForm<TestCatalog>({
    resolver: zodResolver(testCatalogSchema),
    defaultValues: {
      testName: "",
      category: "blood_chemistry",
      provider: "idexx",
      price: "",
      description: "",
      sampleType: "",
      sampleVolume: "",
      turnAroundTime: "",
    },
  });

  // Create/update test catalog item mutation
  const testCatalogMutation = useMutation({
    mutationFn: async (data: TestCatalog) => {
      try {
        if (selectedTest) {
          // Update existing test
          const response = await apiRequest(
            "PUT",
            `/api/lab/test-catalog/${selectedTest.id}`,
            data
          );
          return await response.json();
        } else {
          // Create new test
          const response = await apiRequest("POST", "/api/lab/test-catalog", data);
          return await response.json();
        }
      } catch (error: any) {
        if (error.status === 401) {
          window.location.href = '/auth/login?error=session_expired';
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: selectedTest ? "Test updated" : "Test added",
        description: selectedTest
          ? "The lab test has been updated."
          : "A new lab test has been added to the catalog.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lab/test-catalog"] });
      refetchTestCatalog();
      setSelectedTest(null);
      setIsAddingTest(false);
      testCatalogForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${selectedTest ? "update" : "add"} lab test: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete provider mutation
  const deleteProviderMutation = useMutation({
    mutationFn: async (id: number) => {
      try {
        const response = await apiRequest("DELETE", `/api/lab/providers/${id}`);
        return await response.json();
      } catch (error: any) {
        if (error.status === 401) {
          window.location.href = '/auth/login?error=session_expired';
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Provider deleted",
        description: "The lab provider has been deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lab/providers"] });
      refetchProviders();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete lab provider: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete test catalog item mutation
  const deleteTestMutation = useMutation({
    mutationFn: async (id: number) => {
      try {
        const response = await apiRequest("DELETE", `/api/lab/test-catalog/${id}`);
        return await response.json();
      } catch (error: any) {
        if (error.status === 401) {
          window.location.href = '/auth/login?error=session_expired';
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Test deleted",
        description: "The lab test has been deleted from the catalog.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lab/test-catalog"] });
      refetchTestCatalog();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete lab test: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Lab order form
  const labOrderForm = useForm<LabOrder>({
    resolver: zodResolver(labOrderSchema),
    defaultValues: {
      provider: "idexx",
      petId: "",
      status: "draft",
      priority: "routine",
      sampleType: "",
      sampleCollection: "",
      providerAccessionNumber: "",
      notes: "",
      tests: [],
    },
  });

  // Create/update lab order mutation
  const labOrderMutation = useMutation({
    mutationFn: async (data: LabOrder) => {
      try {
        if (selectedOrder) {
          // Update existing order - add the id to the data
          const updateData = { id: selectedOrder.id, ...data };
          const response = await apiRequest(
            "PATCH",
            `/api/lab/orders`,
            updateData
          );
          return await response.json();
        } else {
          // Create new order
          const response = await apiRequest("POST", "/api/lab/orders", data);
          return await response.json();
        }
      } catch (error: any) {
        if (error.status === 401) {
          window.location.href = '/auth/login?error=session_expired';
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: selectedOrder ? "Order updated" : "Order created",
        description: selectedOrder
          ? "The lab order has been updated."
          : "A new lab order has been created.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lab/orders"] });
      refetchOrders();
      setSelectedOrder(null);
      setIsCreatingOrder(false);
      setSelectedOrderTests([]);
      setSelectedTestIds([]);
      labOrderForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${selectedOrder ? "update" : "create"} lab order: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete lab order mutation
  const deleteOrderMutation = useMutation({
    mutationFn: async (id: number) => {
      try {
        const response = await apiRequest("DELETE", `/api/lab/orders/${id}`);
        return await response.json();
      } catch (error: any) {
        if (error.status === 401) {
          window.location.href = '/auth/login?error=session_expired';
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Order deleted",
        description: "The lab order has been deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lab/orders"] });
      refetchOrders();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete lab order: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Lab result submission mutation
  const labResultMutation = useMutation({
    mutationFn: async ({ orderId, resultData }: { orderId: number, resultData: any }) => {
      try {
        const response = await apiRequest("POST", `/api/lab/orders/${orderId}/results`, resultData);
        return await response.json();
      } catch (error: any) {
        if (error.status === 401) {
          window.location.href = '/auth/login?error=session_expired';
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Results submitted",
        description: "Lab results have been successfully submitted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lab/orders"] });
      setIsSubmittingResults(false);
      setSelectedResult(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to submit lab results: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle provider form submission
  const onProviderSubmit = (data: LabProviderSettings) => {
    console.log('Submitting provider data:', data);
    
    // Check if provider is in-house, set API fields to null
    if (data.provider === 'in_house') {
      data.apiKey = null;
      data.apiSecret = null;
      data.accountId = null;
    }
    
    // Execute the mutation
    providerMutation.mutate(data);
  };

  // Handle test catalog form submission
  const onTestCatalogSubmit = (data: TestCatalog) => {
    testCatalogMutation.mutate(data);
  };
  
  // Handle lab order form submission
  const onLabOrderSubmit = (data: LabOrder) => {
    console.log('Lab order form submitted with data:', data);
    console.log('Selected test IDs:', selectedTestIds);
    
    // Validate that we have tests selected
    if (selectedTestIds.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one test for the lab order.",
        variant: "destructive",
      });
      return;
    }
    
    // Transform frontend data to API format
    const apiData = {
      petId: data.petId,
      provider: data.provider,
      status: data.status,
      priority: data.priority,
      sampleType: data.sampleType,
      sampleCollectionDate: data.sampleCollection, // Map sampleCollection to sampleCollectionDate
      externalReference: data.providerAccessionNumber, // Map providerAccessionNumber to externalReference
      notes: data.notes,
      tests: selectedTestIds, // Use the selected test IDs directly
    };
    
    console.log('API data being sent:', apiData);
    labOrderMutation.mutate(apiData as any);
  };
  
  // Lab result form
  const labResultForm = useForm<{
    status: string;
    notes: string;
    results: string;
    filePath: string;
    testCatalogId: number | null;
  }>({
    defaultValues: {
      status: "normal",
      notes: "",
      results: "",
      filePath: "",
      testCatalogId: null,
    },
  });
  
  // Handle lab result form submission
  const onLabResultSubmit = (data: any) => {
    // Prepare result data with parameters
    const resultData = {
      ...data,
      parameters: resultParams,
      orderId: selectedOrder?.id,
      testId: selectedResult?.id,
    };
    
    // Submit lab result
    labResultMutation.mutate({ 
      orderId: selectedOrder?.id, 
      resultData 
    });
  };
  
  // Add a new parameter field
  const addResultParameter = () => {
    setResultParams([
      ...resultParams,
      { name: "", value: "", units: "", status: "normal" }
    ]);
  };
  
  // Remove a parameter field
  const removeResultParameter = (index: number) => {
    const updatedParams = [...resultParams];
    updatedParams.splice(index, 1);
    setResultParams(updatedParams);
  };
  
  // Update parameter value
  const updateResultParameter = (index: number, field: string, value: string) => {
    const updatedParams = [...resultParams];
    updatedParams[index] = {
      ...updatedParams[index],
      [field]: value
    };
    setResultParams(updatedParams);
  };

  // Set form values when editing a provider
  useEffect(() => {
    if (selectedProvider) {
      if (selectedProvider.provider === "in_house") {
        providerForm.reset({
          provider: "in_house",
          isActive: selectedProvider.isActive,
          apiKey: selectedProvider.apiKey ?? "",
          apiSecret: selectedProvider.apiSecret ?? "",
          accountId: selectedProvider.accountId ?? "",
          inHouseEquipment: selectedProvider.inHouseEquipment || "",
          inHouseContact: selectedProvider.inHouseContact || "",
          inHouseLocation: selectedProvider.inHouseLocation || "",
          settings: selectedProvider.settings || {},
        });
      } else {
        providerForm.reset({
          provider: selectedProvider.provider,
          isActive: selectedProvider.isActive,
          apiKey: selectedProvider.apiKey ?? "",
          apiSecret: selectedProvider.apiSecret ?? "",
          accountId: selectedProvider.accountId ?? "",
          inHouseEquipment: selectedProvider.inHouseEquipment || "",
          inHouseContact: selectedProvider.inHouseContact || "",
          inHouseLocation: selectedProvider.inHouseLocation || "",
          settings: selectedProvider.settings || {},
        });
      }
      setIsAddingProvider(true);
    }
  }, [selectedProvider, providerForm]);

  // Set form values when editing a test
  useEffect(() => {
    if (selectedTest) {
      testCatalogForm.reset({
        testCode: selectedTest.testCode || "",
        testName: selectedTest.testName || "",
        category: selectedTest.category,
        provider: selectedTest.provider,
        price: selectedTest.price,
        description: selectedTest.description,
        sampleType: selectedTest.sampleType,
        sampleVolume: selectedTest.sampleVolume,
        turnAroundTime: selectedTest.turnAroundTime,
      });
      setIsAddingTest(true);
    }
  }, [selectedTest, testCatalogForm]);
  
  // Set form values when editing an order
  useEffect(() => {
    if (selectedOrder) {
      labOrderForm.reset({
        provider: selectedOrder.provider,
        petId: selectedOrder.petId,
        status: selectedOrder.status,
        sampleType: selectedOrder.sampleType || "",
        sampleCollection: selectedOrder.sampleCollection || "",
        providerAccessionNumber: selectedOrder.providerAccessionNumber || "",
        notes: selectedOrder.notes || "",
        tests: [],
      });
      
      // Set the selected tests for the order
      if (selectedOrder.tests && selectedOrder.tests.length > 0) {
        setSelectedTestIds(selectedOrder.tests.map((test: any) => test.testCatalogId));
        setSelectedOrderTests(selectedOrder.tests);
      }
      
      setIsCreatingOrder(true);
    }
  }, [selectedOrder, labOrderForm]);

  const getProviderLabel = (provider: string) => {
    switch (provider) {
      case "idexx":
        return "IDEXX";
      case "antech":
        return "ANTECH";
      case "zoetis":
        return "Zoetis";
      case "heska":
        return "Heska";
      case "in_house":
        return "In-House";
      case "other":
        return "Other";
      default:
        return provider;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "blood_chemistry":
        return "Blood Chemistry";
      case "hematology":
        return "Hematology";
      case "urinalysis":
        return "Urinalysis";
      case "pathology":
        return "Pathology";
      case "microbiology":
        return "Microbiology";
      case "parasitology":
        return "Parasitology";
      case "endocrinology":
        return "Endocrinology";
      case "serology":
        return "Serology";
      case "cytology":
        return "Cytology";
      case "imaging":
        return "Imaging";
      case "other":
        return "Other";
      default:
        return category;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };
  
  // Compute filtered results based on search and filters
  const computeFilteredResults = useMemo(() => {
    if (!labResults) return [];
    
    let filtered = [...labResults];
    
    // Apply search term filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((result: any) => 
        (result.orderId && result.orderId.toString().includes(searchLower)) ||
        (result.name && result.name.toLowerCase().includes(searchLower)) ||
        (result.notes && result.notes.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply status filter
    if (filterStatus && filterStatus !== 'all') {
      filtered = filtered.filter((result: any) => result.status === filterStatus);
    }
    
    // Apply date filter
    if (filterDate) {
      const dateToCompare = new Date(filterDate);
      dateToCompare.setHours(0, 0, 0, 0);
      
      filtered = filtered.filter((result: any) => {
        const resultDate = new Date(result.createdAt);
        resultDate.setHours(0, 0, 0, 0);
        return resultDate.getTime() === dateToCompare.getTime();
      });
    }
    
    // Apply pet filter
    if (filterPetId) {
      filtered = filtered.filter((result: any) => {
        const order = labOrders?.find((order: any) => order.id === result.orderId);
        return order && order.petId === filterPetId;
      });
    }
    
    // Apply provider filter
    if (filterProvider && filterProvider !== 'all') {
      filtered = filtered.filter((result: any) => {
        const order = labOrders?.find((order: any) => order.id === result.orderId);
        return order && order.provider === filterProvider;
      });
    }
    
    return filtered;
  }, [labResults, labOrders, searchTerm, filterStatus, filterDate, filterPetId, filterProvider]);

  // Show loading state while user is being loaded
  if (isUserLoading) {
    return (
      <div className="container py-8">
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </div>
    );
  }

  // Redirect to login if no user (this should be handled by middleware, but as backup)
  if (!user) {
    window.location.href = '/auth/login?error=session_expired';
    return null;
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Laboratory Integration</h1>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="tests">Test Catalog</TabsTrigger>
          <TabsTrigger value="orders">Lab Orders</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        {/* Lab Providers Tab */}
        <TabsContent value="providers">
          <div className="flex justify-between mb-6">
            <h2 className="text-xl font-semibold">Lab Providers</h2>
            <Button
              onClick={() => {
                setSelectedProvider(null);
                providerForm.reset({
                  provider: "idexx",
                  isActive: true,
                  apiKey: "",
                  apiSecret: "",
                  accountId: "",
                  inHouseEquipment: "",
                  inHouseContact: "",
                  inHouseLocation: "",
                  settings: {},
                });
                setIsAddingProvider(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" /> Add Provider
            </Button>
          </div>

          {isLoadingProviders ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-border" />
            </div>
          ) : providersError ? (
            <div className="bg-red-50 p-4 rounded-md text-red-800">
              Error loading lab providers: {providersError.message}
            </div>
          ) : providers?.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No lab providers configured. Add a provider to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {providers?.map((provider: any) => (
                <Card key={provider.id}>
                  <CardHeader>
                    <CardTitle>{getProviderLabel(provider.provider)}</CardTitle>
                    <CardDescription>
                      Status: {provider.isActive ? "Active" : "Inactive"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {provider.accountId && (
                      <p className="text-sm mb-2">
                        Account ID: <span className="font-mono">{provider.accountId}</span>
                      </p>
                    )}
                    {provider.apiKey && (
                      <p className="text-sm mb-2">
                        API Key:{" "}
                        <span className="font-mono">
                          {provider.apiKey.substring(0, 4)}
                          {"..."}
                          {provider.apiKey.substring(provider.apiKey.length - 4)}
                        </span>
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Added: {formatDate(provider.createdAt)}
                    </p>
                  </CardContent>
                  <CardFooter className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedProvider(provider)}
                    >
                      <Edit className="w-4 h-4 mr-2" /> Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteProviderMutation.mutate(provider.id)}
                      disabled={deleteProviderMutation.isPending}
                    >
                      {deleteProviderMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Trash2 className="w-4 h-4 mr-2" />
                      )}
                      Delete
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}

          {/* Provider Form Dialog */}
          <Dialog open={isAddingProvider} onOpenChange={setIsAddingProvider}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {selectedProvider ? "Edit Lab Provider" : "Add Lab Provider"}
                </DialogTitle>
                <DialogDescription>
                  Configure integration with a laboratory provider for test ordering and
                  results.
                </DialogDescription>
              </DialogHeader>

              <Form {...providerForm}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    console.log('Form submit triggered');
                    providerForm.handleSubmit(onProviderSubmit)(e);
                  }}
                  className="space-y-4"
                >
                  <FormField
                    control={providerForm.control}
                    name="provider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provider</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={!!selectedProvider}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a provider" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="idexx">IDEXX</SelectItem>
                            <SelectItem value="antech">ANTECH</SelectItem>
                            <SelectItem value="zoetis">Zoetis</SelectItem>
                            <SelectItem value="heska">Heska</SelectItem>
                            <SelectItem value="in_house">In-House</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Provider-specific help text based on selected provider type */}
                  {selectedProviderType !== "in_house" ? (
                    <>
                      <div className="bg-blue-50 p-3 rounded-lg mb-4">
                        <div className="flex items-start">
                          <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 mr-2" />
                          <div className="text-sm text-blue-700">
                            <p className="font-semibold mb-1">External Provider Configuration</p>
                            {selectedProviderType === "idexx" && (
                              <p>IDEXX Reference Laboratories require VetConnect Plus API credentials. 
                              Enter your Account ID, API Key, and API Secret to enable lab integration.</p>
                            )}
                            {selectedProviderType === "antech" && (
                              <p>ANTECH Diagnostics requires Sound Connect API credentials.
                              Please contact your ANTECH representative for your Account ID and API credentials.</p>
                            )}
                            {selectedProviderType === "zoetis" && (
                              <p>Zoetis Reference Labs API access requires specific authentication credentials.
                              Your Zoetis representative can provide the necessary Account ID and API access tokens.</p>
                            )}
                            {selectedProviderType === "heska" && (
                              <p>Heska Lab Systems integration uses Element DC credentials.
                              Please obtain your Account ID, API Key, and Secret from your Heska representative.</p>
                            )}
                            {selectedProviderType === "other" && (
                              <p>To connect with an external lab service, you need API authentication credentials. 
                              Please obtain these from your lab provider representative.</p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <FormField
                        control={providerForm.control}
                        name="accountId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account ID</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter account ID" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormDescription>
                              Your account identifier with the lab provider
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={providerForm.control}
                        name="apiKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>API Key</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter API key" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormDescription>
                              API key for authenticating with the provider's services
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={providerForm.control}
                        name="apiSecret"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>API Secret</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Enter API secret" 
                                {...field} 
                                value={field.value || ""} 
                              />
                            </FormControl>
                            <FormDescription>
                              Secret key required for API authentication
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  ) : (
                    <>
                      <div className="bg-green-50 p-3 rounded-lg mb-4">
                        <div className="flex items-start">
                          <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-2" />
                          <div className="text-sm text-green-700">
                            <p className="font-semibold mb-1">In-House Lab Configuration</p>
                            <p>Set up your practice's internal lab equipment and procedures. 
                            No external API credentials are needed for in-house testing.</p>
                          </div>
                        </div>
                      </div>
                      
                      <FormField
                        control={providerForm.control}
                        name="inHouseEquipment"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Equipment Model</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., IDEXX Catalyst One, Abaxis VetScan" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormDescription>
                              The lab equipment used for in-house testing
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={providerForm.control}
                        name="inHouseLocation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Lab Location</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Main Treatment Room, Lab Room" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormDescription>
                              Where the in-house lab equipment is located
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={providerForm.control}
                        name="inHouseContact"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Lab Contact</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Dr. Smith, Lab Technician" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormDescription>
                              Staff member responsible for in-house lab operations
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  <FormField
                    control={providerForm.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Active</FormLabel>
                          <FormDescription>
                            Enable this provider for lab test ordering and results
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddingProvider(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={providerMutation.isPending}>
                      {providerMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {selectedProvider ? "Update Provider" : "Add Provider"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Test Catalog Tab */}
        <TabsContent value="tests">
          <div className="flex justify-between mb-6">
            <h2 className="text-xl font-semibold">Lab Test Catalog</h2>
            <div className="flex gap-4">
              <Button
                onClick={() => {
                  setSelectedTest(null);
                  testCatalogForm.reset({
                    testCode: "",
                    testName: "",
                    category: "blood_chemistry",
                    provider: "idexx",
                    price: "",
                    description: "",
                    sampleType: "",
                    sampleVolume: "",
                    turnAroundTime: "",
                  });
                  setIsAddingTest(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" /> Add Test
              </Button>
            </div>
          </div>

          {isLoadingTestCatalog ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-border" />
            </div>
          ) : testCatalogError ? (
            <div className="bg-red-50 p-4 rounded-md text-red-800">
              Error loading test catalog: {testCatalogError.message}
            </div>
          ) : !testCatalog || testCatalog.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No tests in catalog. Add tests to get started.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableCaption>List of available laboratory tests</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Turn-Around Time</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {testCatalog.map((test: any) => (
                      <TableRow key={test.id}>
                        <TableCell className="font-medium">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>{test.testName}</TooltipTrigger>
                              <TooltipContent hidden={!test.description}>
                                <p className="max-w-xs">{test.description}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>{getCategoryLabel(test.category)}</TableCell>
                        <TableCell>{getProviderLabel(test.provider)}</TableCell>
                        <TableCell>{test.price ? `$${test.price}` : "-"}</TableCell>
                        <TableCell>{test.turnAroundTime || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedTest(test)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteTestMutation.mutate(test.id)}
                              disabled={deleteTestMutation.isPending}
                            >
                              {deleteTestMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4 text-destructive" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Test Catalog Form Dialog */}
          <Dialog open={isAddingTest} onOpenChange={setIsAddingTest}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {selectedTest ? "Edit Lab Test" : "Add Lab Test"}
                </DialogTitle>
                <DialogDescription>
                  Add or update a laboratory test in your catalog.
                </DialogDescription>
              </DialogHeader>

              <Form {...testCatalogForm}>
                <form
                  onSubmit={testCatalogForm.handleSubmit(onTestCatalogSubmit)}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={testCatalogForm.control}
                      name="testCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Test Code (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Auto-generated if left blank" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormDescription>
                            Unique identifier for the test. Will be auto-generated if not provided.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={testCatalogForm.control}
                      name="testName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Test Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter test name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={testCatalogForm.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="blood_chemistry">Blood Chemistry</SelectItem>
                              <SelectItem value="hematology">Hematology</SelectItem>
                              <SelectItem value="urinalysis">Urinalysis</SelectItem>
                              <SelectItem value="pathology">Pathology</SelectItem>
                              <SelectItem value="microbiology">Microbiology</SelectItem>
                              <SelectItem value="parasitology">Parasitology</SelectItem>
                              <SelectItem value="endocrinology">Endocrinology</SelectItem>
                              <SelectItem value="serology">Serology</SelectItem>
                              <SelectItem value="cytology">Cytology</SelectItem>
                              <SelectItem value="imaging">Imaging</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={testCatalogForm.control}
                      name="provider"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Provider</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select provider" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="idexx">IDEXX</SelectItem>
                              <SelectItem value="antech">ANTECH</SelectItem>
                              <SelectItem value="zoetis">Zoetis</SelectItem>
                              <SelectItem value="heska">Heska</SelectItem>
                              <SelectItem value="in_house">In-House</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={testCatalogForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter test description" 
                            {...field} 
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={testCatalogForm.control}
                      name="sampleType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sample Type</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., Blood, Urine" 
                              {...field} 
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={testCatalogForm.control}
                      name="sampleVolume"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sample Volume</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., 2ml" 
                              {...field} 
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={testCatalogForm.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter price" 
                              {...field} 
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={testCatalogForm.control}
                      name="turnAroundTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Turn-Around Time</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., 24 hours" 
                              {...field} 
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddingTest(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={testCatalogMutation.isPending}>
                      {testCatalogMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {selectedTest ? "Update Test" : "Add Test"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Lab Orders Tab */}
        <TabsContent value="orders">
          <div className="flex justify-between mb-6">
            <h2 className="text-xl font-semibold">Lab Orders</h2>
            <Button
              onClick={() => {
                setSelectedOrder(null);
                labOrderForm.reset({
                  provider: "idexx",
                  petId: "",
                  status: "draft",
                  priority: "routine",
                  sampleType: "",
                  sampleCollection: "",
                  providerAccessionNumber: "",
                  notes: "",
                  tests: [],
                });
                setSelectedTestIds([]);
                setSelectedOrderTests([]);
                setIsCreatingOrder(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" /> New Lab Order
            </Button>
          </div>
          
          {/* Order Form Dialog */}
          <Dialog open={isCreatingOrder} onOpenChange={setIsCreatingOrder}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>
                  {selectedOrder ? "Edit Lab Order" : "Create Lab Order"}
                </DialogTitle>
                <DialogDescription>
                  {selectedOrder
                    ? "Update the lab order details and selected tests."
                    : "Create a new lab order by selecting a patient and tests to order."}
                </DialogDescription>
              </DialogHeader>

              <Form {...labOrderForm}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    console.log('Form submit event triggered');
                    console.log('Form values:', labOrderForm.getValues());
                    console.log('Form errors:', labOrderForm.formState.errors);
                    console.log('Form is valid:', labOrderForm.formState.isValid);
                    console.log('Selected test IDs:', selectedTestIds);
                    
                    labOrderForm.handleSubmit(onLabOrderSubmit, (errors) => {
                      console.log('Form validation failed:', errors);
                      toast({
                        title: "Form Validation Failed",
                        description: "Please check all required fields and try again.",
                        variant: "destructive",
                      });
                    })(e);
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={labOrderForm.control}
                      name="provider"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lab Provider</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a provider" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {providers?.filter((p: any) => p.isActive).map((provider: any) => (
                                <SelectItem key={provider.id} value={provider.provider}>
                                  {getProviderLabel(provider.provider)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={labOrderForm.control}
                      name="petId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Patient</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value)}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a patient" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {petOptions?.map((pet: any) => (
                                <SelectItem key={pet.id} value={pet.id.toString()}>
                                  {pet.name} ({pet.species})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={labOrderForm.control}
                      name="sampleType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sample Type</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Blood, Urine, Tissue" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={labOrderForm.control}
                      name="sampleCollection"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sample Collection Method</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Venipuncture, Cystocentesis" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={labOrderForm.control}
                      name="providerAccessionNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lab Reference Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Lab reference/accession number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={labOrderForm.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="ordered">Ordered</SelectItem>
                              <SelectItem value="submitted">Submitted</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={labOrderForm.control}
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
                              <SelectItem value="routine">Routine</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                              <SelectItem value="stat">STAT</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={labOrderForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Any special instructions or notes for the lab" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="border rounded-md p-4">
                    <h3 className="text-lg font-medium mb-4">Select Tests</h3>
                    {isLoadingTestCatalog ? (
                      <div className="flex justify-center items-center h-20">
                        <Loader2 className="h-6 w-6 animate-spin text-border" />
                      </div>
                    ) : testCatalog?.length === 0 ? (
                      <p className="text-muted-foreground text-center">
                        No tests available. Please add tests to the catalog first.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {testCatalog
                          ?.filter(
                            (test: any) => 
                              !labOrderForm.getValues("provider") || 
                              test.provider === labOrderForm.getValues("provider")
                          )
                          .map((test: any) => (
                            <div
                              key={test.id}
                              className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50"
                            >
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`test-${test.id}`}
                                  checked={selectedTestIds.includes(test.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedTestIds([...selectedTestIds, test.id]);
                                    } else {
                                      setSelectedTestIds(selectedTestIds.filter((id) => id !== test.id));
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`test-${test.id}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                  {test.testName}
                                </label>
                              </div>
                              <div className="flex text-sm text-muted-foreground">
                                <Badge variant="outline" className="mr-2">
                                  {getCategoryLabel(test.category)}
                                </Badge>
                                {test.price && <span>${test.price}</span>}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        console.log('Cancel button clicked');
                        setIsCreatingOrder(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={labOrderMutation.isPending}
                      onClick={() => {
                        console.log('Submit button clicked');
                        console.log('Button type:', 'submit');
                        console.log('Is disabled:', labOrderMutation.isPending);
                        console.log('Selected test IDs:', selectedTestIds);
                        console.log('Form values before submit:', labOrderForm.getValues());
                      }}
                    >
                      {labOrderMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {selectedOrder ? "Update Order" : "Create Order"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Order Details Dialog */}
          <Dialog open={isViewingOrderDetails} onOpenChange={setIsViewingOrderDetails}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Lab Order Details - #{orderDetailsData?.id}</DialogTitle>
                <DialogDescription>
                  Complete information about this lab order and its associated tests.
                </DialogDescription>
              </DialogHeader>

              {orderDetailsData && (
                <div className="space-y-6">
                  {/* Order Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Order Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="font-medium">Order ID:</span>
                          <span>#{orderDetailsData.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Provider:</span>
                          <span>{getProviderLabel(orderDetailsData.provider)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Status:</span>
                          <Badge 
                            variant={
                              orderDetailsData.status === 'completed' ? 'default' : 
                              orderDetailsData.status === 'cancelled' ? 'destructive' :
                              'secondary'
                            }
                          >
                            {orderDetailsData.status.replace('_', ' ').charAt(0).toUpperCase() + orderDetailsData.status.replace('_', ' ').slice(1)}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Priority:</span>
                          <span>{orderDetailsData.priority?.charAt(0).toUpperCase() + orderDetailsData.priority?.slice(1)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Order Date:</span>
                          <span>{formatDate(orderDetailsData.orderDate)}</span>
                        </div>
                        {orderDetailsData.sampleCollectionDate && (
                          <div className="flex justify-between">
                            <span className="font-medium">Sample Collection:</span>
                            <span>{formatDate(orderDetailsData.sampleCollectionDate)}</span>
                          </div>
                        )}
                        {orderDetailsData.externalReference && (
                          <div className="flex justify-between">
                            <span className="font-medium">Lab Reference:</span>
                            <span className="font-mono text-sm">{orderDetailsData.externalReference}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Patient Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="font-medium">Patient ID:</span>
                          <span>{orderDetailsData.petId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Patient Name:</span>
                          <span>{orderDetailsData.petName || "Loading..."}</span>
                        </div>
                        {orderDetailsData.sampleType && (
                          <div className="flex justify-between">
                            <span className="font-medium">Sample Type:</span>
                            <span>{orderDetailsData.sampleType}</span>
                          </div>
                        )}
                        {orderDetailsData.notes && (
                          <div>
                            <span className="font-medium">Notes:</span>
                            <p className="mt-1 text-sm text-muted-foreground">{orderDetailsData.notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Ordered Tests */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Ordered Tests</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {orderDetailsData.tests && orderDetailsData.tests.length > 0 ? (
                        <div className="space-y-3">
                          {orderDetailsData.tests.map((test: any, index: number) => (
                            <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                              <div className="space-y-1">
                                <p className="font-medium">{test.testName || test.name || `Test #${test.testCatalogId}`}</p>
                                {test.category && (
                                  <Badge variant="outline">{getCategoryLabel(test.category)}</Badge>
                                )}
                              </div>
                              <div className="text-right">
                                {test.price && <p className="font-medium">${test.price}</p>}
                                {test.status && (
                                  <Badge variant="secondary">{test.status}</Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">No tests found for this order.</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Results (if available) */}
                  {orderDetailsData.results && orderDetailsData.results.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Test Results</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {orderDetailsData.results.map((result: any, index: number) => (
                            <div key={index} className="p-3 border rounded-lg">
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-medium">{result.testName}</h4>
                                <Badge 
                                  variant={result.status === 'normal' ? 'default' : result.status === 'abnormal' ? 'destructive' : 'secondary'}
                                >
                                  {result.status}
                                </Badge>
                              </div>
                              {result.results && (
                                <p className="text-sm text-muted-foreground">{result.results}</p>
                              )}
                              {result.parameters && result.parameters.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {result.parameters.map((param: any, paramIndex: number) => (
                                    <div key={paramIndex} className="text-sm flex justify-between">
                                      <span>{param.name}</span>
                                      <span>{param.value} {param.units}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsViewingOrderDetails(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setSelectedOrder(orderDetailsData);
                    setIsViewingOrderDetails(false);
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Order
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {isLoadingLabOrders ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-border" />
            </div>
          ) : labOrdersError ? (
            <div className="bg-red-50 p-4 rounded-md text-red-800">
              Error loading lab orders: {labOrdersError.message}
            </div>
          ) : !labOrders || labOrders.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No lab orders found. Create a new order to get started.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableCaption>List of laboratory orders</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Order Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {labOrders.map((order: any) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">#{order.id}</TableCell>
                        <TableCell>{order.petName || "Unknown"}</TableCell>
                        <TableCell>{getProviderLabel(order.provider)}</TableCell>
                        <TableCell>
                          <div className={`
                            inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${order.status === 'completed' ? 'bg-green-100 text-green-800' : 
                              order.status === 'ordered' || order.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                              order.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                              order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'}
                          `}>
                            {order.status.replace('_', ' ').charAt(0).toUpperCase() + order.status.replace('_', ' ').slice(1)}
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(order.orderDate)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setOrderDetailsData(order);
                                setIsViewingOrderDetails(true);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedOrder(order)}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteOrderMutation.mutate(order.id)}
                              disabled={deleteOrderMutation.isPending}
                            >
                              {deleteOrderMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Trash2 className="w-4 h-4 mr-2" />
                              )}
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results">
          <div className="flex justify-between mb-6">
            <h2 className="text-xl font-semibold">Lab Results</h2>
            <div className="flex gap-4">
              <div>
                <Input
                  placeholder="Search results..."
                  className="w-[240px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Select
                value={filterStatus || "all"}
                onValueChange={setFilterStatus}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Results</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="abnormal">Abnormal</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              
              <Select
                value={filterPetId?.toString() || ""}
                onValueChange={(value) => setFilterPetId(value ? parseInt(value) : null)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by patient" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-patients">All Patients</SelectItem>
                  {petOptions?.map((pet: any) => (
                    <SelectItem key={pet.id} value={pet.id.toString()}>
                      {pet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select
                value={filterProvider || "all"}
                onValueChange={setFilterProvider}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Providers</SelectItem>
                  <SelectItem value="idexx">IDEXX</SelectItem>
                  <SelectItem value="antech">ANTECH</SelectItem>
                  <SelectItem value="zoetis">Zoetis</SelectItem>
                  <SelectItem value="heska">Heska</SelectItem>
                  <SelectItem value="in_house">In-House</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedPatientFilter && (
            <div className="mb-6">
              <Tabs defaultValue="results">
                <TabsList>
                  <TabsTrigger value="results">Results Table</TabsTrigger>
                  <TabsTrigger value="trends">Trend Analysis</TabsTrigger>
                </TabsList>
                <TabsContent value="results">
                  {/* Results table remains in this tab */}
                </TabsContent>
                <TabsContent value="trends">
                  <div className="py-4">
                    <LabResultsVisualization 
                      petId={selectedPatientFilter} 
                      testCatalogId={selectedResult?.testCatalogId}
                      labResults={computeFilteredResults.filter((result: any) => 
                        (!selectedResult?.testCatalogId || result.testCatalogId === selectedResult?.testCatalogId)
                      )}
                      isLoading={isLoadingLabResults}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {isLoadingLabResults ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-border" />
            </div>
          ) : labResultsError ? (
            <div className="bg-red-50 p-4 rounded-md text-red-800">
              Error loading lab results: {labResultsError.message}
            </div>
          ) : !computeFilteredResults || computeFilteredResults.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No lab results found matching the current filters.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {computeFilteredResults.map((result: any) => (
                <Card key={result.id} className="overflow-hidden">
                  <CardHeader className={`
                    ${result.status === 'normal' ? 'bg-green-50' : 
                      result.status === 'abnormal' ? 'bg-amber-50' :
                      result.status === 'critical' ? 'bg-red-50' :
                      'bg-slate-50'}
                  `}>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>
                          {result.petName} - {result.name || 'Lab Test'}
                        </CardTitle>
                        <CardDescription>
                          <span className="block">
                            Order #{result.labOrderId || 'N/A'} - {result.provider && getProviderLabel(result.provider)}
                          </span>
                          <span>
                            {formatDate(result.createdAt)}
                          </span>
                        </CardDescription>
                      </div>
                      <Badge className={`
                        ${result.status === 'normal' ? 'bg-green-100 text-green-800 hover:bg-green-100' : 
                          result.status === 'abnormal' ? 'bg-amber-100 text-amber-800 hover:bg-amber-100' :
                          result.status === 'critical' ? 'bg-red-100 text-red-800 hover:bg-red-100' :
                          result.status === 'pending' ? 'bg-slate-100 text-slate-800 hover:bg-slate-100' :
                          'bg-slate-100 text-slate-800 hover:bg-slate-100'}
                      `}>
                        {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-4">
                      {result.results && typeof result.results === 'object' ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Parameter</TableHead>
                              <TableHead>Result</TableHead>
                              <TableHead>Reference Range</TableHead>
                              <TableHead>Units</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Object.entries(result.results).map(([key, value]: [string, any]) => (
                              <TableRow key={key}>
                                <TableCell className="font-medium">{key}</TableCell>
                                <TableCell>{value.value}</TableCell>
                                <TableCell>{value.referenceRange || 'N/A'}</TableCell>
                                <TableCell>{value.units || ''}</TableCell>
                                <TableCell>
                                  {value.status && (
                                    <Badge className={`
                                      ${value.status === 'normal' ? 'bg-green-100 text-green-800 hover:bg-green-100' : 
                                        value.status === 'abnormal' ? 'bg-amber-100 text-amber-800 hover:bg-amber-100' :
                                        value.status === 'critical' ? 'bg-red-100 text-red-800 hover:bg-red-100' :
                                        'bg-slate-100 text-slate-800 hover:bg-slate-100'}
                                    `}>
                                      {value.status.charAt(0).toUpperCase() + value.status.slice(1)}
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="p-4 bg-slate-50 rounded-md">
                          <p className="font-medium">Result Notes:</p>
                          <p className="mt-2">{result.notes || 'No detailed result information available.'}</p>
                        </div>
                      )}
                    </div>
                    
                    {result.filePath && (
                      <div className="mt-4 p-4 border rounded-md">
                        <p className="font-medium flex items-center">
                          <FileText className="w-4 h-4 mr-2" /> 
                          Attached Report
                        </p>
                        <Button 
                          variant="link" 
                          className="mt-2 p-0 h-auto"
                          onClick={() => window.open(`/uploads/${result.filePath}`, '_blank')}
                        >
                          View Report
                        </Button>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-between bg-slate-50">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        // View order details action
                        const order = labOrders?.find((o: any) => o.id === result.labOrderId);
                        if (order) {
                          setSelectedOrder(order);
                          // Additional actions as needed
                        }
                      }}
                    >
                      View Order
                    </Button>
                    
                    <div>
                      {result.status === 'pending' && (
                        <Button 
                          size="sm"
                          onClick={() => setSelectedResult(result)}
                        >
                          Enter Results
                        </Button>
                      )}
                      
                      {(result.status === 'normal' || result.status === 'abnormal' || result.status === 'critical') && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setSelectedResult(result)}
                        >
                          Update Results
                        </Button>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
          
          {/* Result Entry Dialog */}
          <Dialog open={!!selectedResult} onOpenChange={() => setSelectedResult(null)}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>
                  {selectedResult?.id ? "Update Lab Result" : "Enter Lab Result"}
                </DialogTitle>
                <DialogDescription>
                  Enter or update the results for this laboratory test.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...labResultForm}>
                <form
                  onSubmit={labResultForm.handleSubmit(onLabResultSubmit)}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={labResultForm.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Result Status</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select result status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="abnormal">Abnormal</SelectItem>
                              <SelectItem value="critical">Critical</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="inconclusive">Inconclusive</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={labResultForm.control}
                      name="testCatalogId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Test Type</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            value={field.value?.toString() || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a test" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="select-test">Select Test</SelectItem>
                              {testCatalog?.map((test: any) => (
                                <SelectItem key={test.id} value={test.id.toString()}>
                                  {test.testName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="border rounded-md p-4">
                    <h3 className="text-lg font-medium mb-4">Test Results</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-4 gap-4 mb-2">
                        <p className="font-medium">Parameter</p>
                        <p className="font-medium">Value</p>
                        <p className="font-medium">Units</p>
                        <p className="font-medium">Status</p>
                      </div>
                      
                      {resultParams.map((param, index) => (
                        <div key={index} className="grid grid-cols-4 gap-4 items-center">
                          <Input 
                            placeholder="Parameter name" 
                            value={param.name} 
                            onChange={(e) => updateResultParameter(index, 'name', e.target.value)}
                          />
                          <Input 
                            placeholder="Result value" 
                            value={param.value} 
                            onChange={(e) => updateResultParameter(index, 'value', e.target.value)}
                          />
                          <Input 
                            placeholder="Units" 
                            value={param.units} 
                            onChange={(e) => updateResultParameter(index, 'units', e.target.value)}
                          />
                          <Select 
                            value={param.status} 
                            onValueChange={(value) => updateResultParameter(index, 'status', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="abnormal">Abnormal</SelectItem>
                              <SelectItem value="critical">Critical</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="absolute -right-10"
                            onClick={() => removeResultParameter(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-2"
                        onClick={addResultParameter}
                      >
                        <Plus className="h-4 w-4 mr-2" /> Add Parameter
                      </Button>
                    </div>
                  </div>
                  
                  <FormField
                    control={labResultForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Additional notes or observations" 
                            {...field} 
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={labResultForm.control}
                    name="filePath"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Attach Report</FormLabel>
                        <FormControl>
                          <Input 
                            type="file" 
                            className="cursor-pointer" 
                            accept=".pdf,.jpg,.jpeg,.png" 
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setResultFile(e.target.files[0]);
                              }
                            }} 
                          />
                        </FormControl>
                        <FormDescription>
                          Upload PDF or image files of lab reports
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSelectedResult(null)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={labResultMutation.isPending}
                    >
                      {labResultMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {selectedResult?.id ? "Update Result" : "Save Result"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LabIntegrationPage;