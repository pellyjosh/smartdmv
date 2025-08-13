'use client';
import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useUser } from "@/context/UserContext";
import { usePathname, useRouter } from "next/navigation";
import { UserRole, type SOAPNote, type SOAPTemplate, insertSOAPNoteSchema } from "@/db/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  AlertCircle, Check, Edit, Lock, PlusCircle, Trash2, Calendar, User, 
  Clipboard, Clock, Pill, Filter, FileText, Copy, ClipboardCopy, 
  Paperclip, Loader2, ChevronLeft, Save, Plus, X, Search, CalendarPlus,
  CircleIcon, HeartPulseIcon, Wind, Utensils, Activity, Brain, Fingerprint,
  Share2, BookTemplate, CheckCircle, NotebookPen
} from "lucide-react";
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select";
import { PrescriptionForm } from "@/components/prescriptions/prescription-form";
import { SoapPrescriptionDisplay } from "@/components/prescriptions/soap-prescription-display";
import { QuickReferralForm } from "@/components/referrals/quick-referral-form";
import { FileUpload, type UploadedFile } from "@/components/shared/file-upload";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { FileAttachmentList } from "@/components/shared/file-attachment-list";
import { SoapLabResultsSection } from "@/components/lab/soap-lab-results-section";
import { HealthPlanSelector } from "@/components/health-plans/health-plan-selector";

// Helper function to safely format dates
const safeFormatDate = (dateString: string | null | undefined, appointmentData?: any): string => {
  // Debug log to see what we're getting
  if (appointmentData) {
    console.log('Date formatting debug:', { dateString, appointmentData });
  }
  
  if (!dateString) {
    // Check for alternative date field names
    const alternativeDates = appointmentData ? [
      appointmentData.appointmentDate,
      appointmentData.appointment_date,
      appointmentData.scheduledDate,
      appointmentData.scheduled_date,
      appointmentData.dateTime,
      appointmentData.date_time,
      appointmentData.createdAt,
      appointmentData.created_at
    ] : [];
    
    for (const altDate of alternativeDates) {
      if (altDate) {
        dateString = altDate;
        break;
      }
    }
    
    if (!dateString) {
      return 'No Date';
    }
  }
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    return format(date, 'MMM d, yyyy');
  } catch (error) {
    console.error('Date formatting error:', error, 'for date:', dateString);
    return 'Invalid Date';
  }
};

// Extended schema with validation for form
const soapNoteFormSchema = z.object({
  appointmentId: z.number().min(1, 'Please select an appointment'),
  petId: z.number().min(1, { message: "Please select a pet" }),
  practitionerId: z.string().min(1, { message: "Practitioner ID is required" }),
  subjective: z.string().min(1, { message: "Subjective notes are required" }),
  objective: z.string().min(1, { message: "Objective findings are required" }),
  assessment: z.string().min(1, { message: "Assessment is required" }),
  plan: z.string().min(1, { message: "Treatment plan is required" }),
  // Subjective tab fields
  chiefComplaint: z.array(z.string()).optional().default([]),
  patientHistory: z.string().optional(),
  symptoms: z.string().optional(),
  duration: z.string().optional(),
  // Objective tab fields - vital signs
  temperature: z.string().optional(),
  heartRate: z.string().optional(),
  respiratoryRate: z.string().optional(),
  weight: z.string().optional(),
  bloodPressure: z.string().optional(),
  oxygenSaturation: z.string().optional(),
  // Objective tab fields - physical exam
  generalAppearance: z.string().optional(),
  hydration: z.string().optional(),
  // Objective tab fields - cardiovascular
  heartSounds: z.string().optional(),
  cardiovascularNotes: z.string().optional(),
  // Objective tab fields - respiratory
  lungSounds: z.string().optional(),
  respiratoryEffort: z.string().optional(),
  respiratoryNotes: z.string().optional(),
  // Additional fields that might exist
  mucousMembranes: z.string().optional(),
  capillaryRefillTime: z.string().optional(),
  pulse: z.string().optional(),
  pulseQuality: z.string().optional(),
  abdomenPalpation: z.string().optional(),
  bowelSounds: z.string().optional(),
  gastrointestinalNotes: z.string().optional(),
  gait: z.string().optional(),
  jointStatus: z.string().optional(),
  musculoskeletalNotes: z.string().optional(),
  mentalStatus: z.string().optional(),
  reflexes: z.string().optional(),
  neurologicalNotes: z.string().optional(),
  skinCondition: z.string().optional(),
  coatCondition: z.string().optional(),
  skinNotes: z.string().optional(),
  // Assessment tab fields
  primaryDiagnosis: z.array(z.string()).optional().default([]),
  differentialDiagnoses: z.array(z.string()).optional().default([]),
  progressStatus: z.string().optional(),
  confirmationStatus: z.string().optional(),
  progressNotes: z.string().optional(),
  // Plan tab fields
  treatment: z.string().optional(),
  medications: z.array(z.any()).optional(),
  procedures: z.array(z.string()).optional().default([]),
  procedureNotes: z.string().optional(),
  diagnostics: z.array(z.string()).optional().default([]),
  clientEducation: z.string().optional(),
  followUpTimeframe: z.string().optional(),
  followUpReason: z.string().optional()
});

type SoapNoteFormValues = z.infer<typeof soapNoteFormSchema>;

const SOAPNoteCreatePage: React.FC = () => {
  const { toast } = useToast();
  const { user, userPracticeId } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("details");
  const [selectedTemplate, setSelectedTemplate] = useState<SOAPTemplate | null>(null);
  const [isPrescriptionFormOpen, setIsPrescriptionFormOpen] = useState(false);
  const [showReferralDialog, setShowReferralDialog] = useState(false);
  const [showSaveAsTemplateDialog, setShowSaveAsTemplateDialog] = useState(false);
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateCategory, setTemplateCategory] = useState("general");
  const [speciesApplicability, setSpeciesApplicability] = useState<string[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [savedNoteId, setSavedNoteId] = useState<number | null>(null);
  const [soapNoteSaved, setSoapNoteSaved] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [currentSoapTab, setCurrentSoapTab] = useState("subjective");
  const [petSelectorOpen, setPetSelectorOpen] = useState(false);
  const [appointmentSelectorOpen, setAppointmentSelectorOpen] = useState(false);

  // Initialize the form with default values
  const form = useForm<SoapNoteFormValues>({
    resolver: zodResolver(soapNoteFormSchema),
    defaultValues: {
      subjective: "",
      objective: "",
      assessment: "",
      plan: "",
      appointmentId: 0,
      petId: 0,
      practitionerId: user?.id || "",
      // Subjective tab fields
      chiefComplaint: [],
      patientHistory: "",
      symptoms: "",
      duration: "",
      // Objective tab fields - vital signs
      temperature: "",
      heartRate: "",
      respiratoryRate: "",
      weight: "",
      bloodPressure: "",
      oxygenSaturation: "",
      // Objective tab fields - physical exam
      generalAppearance: "",
      hydration: "",
      // Objective tab fields - cardiovascular
      heartSounds: "",
      cardiovascularNotes: "",
      // Objective tab fields - respiratory
      lungSounds: "",
      respiratoryEffort: "",
      respiratoryNotes: "",
      // Additional fields that might exist
      mucousMembranes: "",
      capillaryRefillTime: "",
      pulse: "",
      pulseQuality: "",
      abdomenPalpation: "",
      bowelSounds: "",
      gastrointestinalNotes: "",
      gait: "",
      jointStatus: "",
      musculoskeletalNotes: "",
      mentalStatus: "",
      reflexes: "",
      neurologicalNotes: "",
      skinCondition: "",
      coatCondition: "",
      skinNotes: "",
      // Assessment tab fields
      primaryDiagnosis: [],
      differentialDiagnoses: [],
      progressStatus: "",
      confirmationStatus: "",
      progressNotes: "",
      // Plan tab fields
      treatment: "",
      medications: [],
      procedures: [],
      procedureNotes: "",
      diagnostics: [],
      clientEducation: "",
      followUpTimeframe: "",
      followUpReason: ""
    }
  });
  
  // Function to get validation errors for each tab
  const getTabValidationStatus = () => {
    const errors = form.formState.errors;
    
    const subjectiveErrors = [
      errors.subjective,
      errors.chiefComplaint,
      errors.patientHistory,
      errors.symptoms,
      errors.duration
    ].filter(Boolean);

    const objectiveErrors = [
      errors.objective,
      errors.temperature,
      errors.heartRate,
      errors.respiratoryRate,
      errors.weight,
      errors.bloodPressure,
      errors.oxygenSaturation,
      errors.generalAppearance,
      errors.hydration,
      errors.heartSounds,
      errors.cardiovascularNotes,
      errors.lungSounds,
      errors.respiratoryEffort,
      errors.respiratoryNotes
    ].filter(Boolean);

    const assessmentErrors = [
      errors.assessment,
      errors.primaryDiagnosis,
      errors.differentialDiagnoses,
      errors.progressStatus,
      errors.confirmationStatus,
      errors.progressNotes
    ].filter(Boolean);

    const planErrors = [
      errors.plan,
      errors.treatment,
      errors.medications,
      errors.procedures,
      errors.procedureNotes,
      errors.diagnostics,
      errors.clientEducation,
      errors.followUpTimeframe,
      errors.followUpReason
    ].filter(Boolean);

    return {
      subjective: subjectiveErrors.length > 0,
      objective: objectiveErrors.length > 0,
      assessment: assessmentErrors.length > 0,
      plan: planErrors.length > 0
    };
  };

  const tabValidationStatus = getTabValidationStatus();
  
  // Fetch appointments for dropdown (using special SOAP endpoint to bypass client-only restrictions)
  const { data: appointments, isLoading: isLoadingAppointments } = useQuery({
    queryKey: ['/api/soap/appointments'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/soap/appointments?status=active');
      return response.json();
    }
  });
  
  // Fetch all pets for dropdown
  const { data: pets, isLoading: isLoadingPets } = useQuery({
    queryKey: ['/api/pets', userPracticeId],
    queryFn: async () => {
      if (!userPracticeId) {
        throw new Error('Practice ID not available');
      }
      
      const response = await apiRequest('GET', `/api/pets?practiceId=${userPracticeId}`);
      return response.json();
    },
    enabled: !!userPracticeId
  });

  // Watch for selected pet to fetch its appointments
  const selectedPetId = form.watch('petId');
  
  // Fetch appointments for the selected pet
  const { data: petAppointments, isLoading: isLoadingPetAppointments } = useQuery({
    queryKey: ['/api/soap/appointments', selectedPetId],
    queryFn: async () => {
      if (!selectedPetId) {
        return [];
      }
      
      console.log('Fetching appointments for petId:', selectedPetId);
      const response = await apiRequest('GET', `/api/soap/appointments?status=active&petId=${selectedPetId}`);
      const appointments = await response.json();
      console.log('Filtered appointments from server:', appointments);
      return appointments;
    },
    enabled: !!selectedPetId
  });
  
  // Fetch SOAP templates for template selection
  const { data: templates, isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['/api/soap-templates', userPracticeId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userPracticeId) {
        params.append('practiceId', userPracticeId);
      }
      const url = `/api/soap-templates${params.toString() ? '?' + params.toString() : ''}`;
      const response = await apiRequest('GET', url);
      return response.json();
    }
  });
  
  // Apply a template to the form
  const applyTemplate = (template: SOAPTemplate) => {
    console.log('Applying template:', template); // Debug log
    
    // Use snake_case field names as they appear in the database
    form.setValue('subjective', Array.isArray(template.subjective_template) ? template.subjective_template.join('\n') : template.subjective_template || "");
    form.setValue('objective', Array.isArray(template.objective_template) ? template.objective_template.join('\n') : template.objective_template || "");
    form.setValue('assessment', Array.isArray(template.assessment_template) ? template.assessment_template.join('\n') : template.assessment_template || "");
    form.setValue('plan', Array.isArray(template.plan_template) ? template.plan_template.join('\n') : template.plan_template || "");
    
    setSelectedTemplate(template);
    
    console.log('Form values after template application:', form.getValues()); // Debug log
    
    toast({
      title: "Template Applied",
      description: `The "${template.name}" template has been applied.`,
    });
  };
  
  // Create SOAP note mutation
  const mutation = useMutation({
    mutationFn: async (data: SoapNoteFormValues) => {
      // Extract only the fields needed for the API
      const soapNoteData = {
        appointmentId: data.appointmentId,
        petId: data.petId,
        practitionerId: data.practitionerId,
        subjective: data.subjective,
        objective: data.objective,
        assessment: data.assessment,
        plan: data.plan
      };
      
      const res = await apiRequest('POST', '/api/soap-notes', soapNoteData);
      return await res.json();
    },
    onSuccess: (data) => {
      // Save the SOAP note ID for template conversion
      setSavedNoteId(data.id);
      setSoapNoteSaved(true);
      
      queryClient.invalidateQueries({ queryKey: ['/api/soap-notes'] });
      toast({
        title: "SOAP note created",
        description: "The SOAP note has been successfully created",
        action: (
          <ToastAction 
            altText="Save as Template" 
            onClick={() => {
              // Use the fresh data.id and add a small delay to ensure state is updated
              setTimeout(() => {
                setSavedNoteId(data.id);
                setShowSaveAsTemplateDialog(true);
              }, 100);
            }}
          >
            Save as Template
          </ToastAction>
        )
      });
      
      // Handle file uploads if any
      if (uploadedFiles.length > 0) {
        uploadAttachments(data.id);
      } else {
        // Don't navigate automatically so user can save as template if desired
        // Instead show a success message with options
        setSoapNoteSaved(true);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Template creation mutation
  const templateMutation = useMutation({
    mutationFn: async (templateData: {
      soapNoteId: number,
      name: string,
      description: string | null,
      category: string | null,
      speciesApplicability: string[] | null
    }) => {
      // Get current form values to include in template
      const formValues = form.getValues();
      
      const requestData = {
        name: templateData.name,
        description: templateData.description,
        category: templateData.category,
        speciesApplicability: templateData.speciesApplicability,
        practiceId: userPracticeId || "",
        createdById: user?.id || "",
        // Include template content from current form
        subjective_template: formValues.subjective || "",
        objective_template: formValues.objective || "",
        assessment_template: formValues.assessment || "",
        plan_template: formValues.plan || ""
      };
      
      const res = await apiRequest('POST', '/api/soap-templates', requestData);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "SOAP note successfully converted to template"
      });
      
      // Refresh the templates list
      queryClient.invalidateQueries({ queryKey: ['/api/soap-templates'] });
      
      // Close the dialog
      setShowSaveAsTemplateDialog(false);
      
      // Reset form fields
      setTemplateName("");
      setTemplateDescription("");
      setTemplateCategory("general");
      setSpeciesApplicability([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to convert SOAP note to template",
        variant: "destructive"
      });
    }
  });
  
  // Handle template submission
  const handleTemplateSubmit = () => {
    if (!savedNoteId) {
      toast({
        title: "Error",
        description: "You must save the SOAP note before converting it to a template",
        variant: "destructive"
      });
      setShowSaveAsTemplateDialog(false);
      return;
    }

    if (!templateName) {
      toast({
        title: "Error",
        description: "Template name is required",
        variant: "destructive"
      });
      return;
    }

    templateMutation.mutate({
      soapNoteId: savedNoteId,
      name: templateName,
      description: templateDescription || null,
      category: templateCategory || null,
      speciesApplicability: speciesApplicability.length > 0 ? speciesApplicability : null
    });
  };
  
  // Handle file attachments upload - files are already uploaded by FileUpload component
  const attachmentsMutation = useMutation({
    mutationFn: async ({ noteId, files }: { noteId: number, files: UploadedFile[] }) => {
      // Files are already uploaded, just need to associate them with the SOAP note
      const associationPromises = files.map(file => {
        return apiRequest('PATCH', `/api/soap-notes/${noteId}/attachments/${file.id}`, {
          soapNoteId: noteId
        });
      });
      
      // Wait for all associations to complete
      return Promise.all(associationPromises);
    },
    onSuccess: () => {
      toast({
        title: "Attachments uploaded",
        description: "All files have been successfully attached to the SOAP note",
      });
      router.push("/soap-notes");
    },
    onError: (error: Error) => {
      toast({
        title: "Error uploading attachments",
        description: error.message,
        variant: "destructive",
      });
      // Still navigate back since the SOAP note was created
      router.push("/soap-notes");
    }
  });
  
  const uploadAttachments = (noteId: number) => {
    if (uploadedFiles.length > 0) {
      attachmentsMutation.mutate({ noteId, files: uploadedFiles });
    }
  };
  
  const onSubmit = (data: SoapNoteFormValues) => {
    mutation.mutate(data);
  };
  
  // Handle saving the SOAP note as a template
  const handleSaveAsTemplate = () => {
    console.log("handleSaveAsTemplate called, savedNoteId:", savedNoteId);
    if (!savedNoteId) {
      toast({
        title: "Save Required",
        description: "Please save the SOAP note first before converting to a template",
        variant: "destructive"
      });
      return;
    }
    setShowSaveAsTemplateDialog(true);
  };

  // This section was previously implemented above with different API endpoint
  // so we're keeping the implementation above and removing the duplicate
  
  const handleFileUpload = (files: UploadedFile[]) => {
    setUploadedFiles(prev => [...prev, ...files]);
  };
  
  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  const isLoading = isLoadingAppointments || isLoadingPets || isLoadingPetAppointments || isLoadingTemplates || mutation.isPending || attachmentsMutation.isPending;
  
  // Add a referral to the list
  const handleAddReferral = (referral: any) => {
    setReferrals([...referrals, referral]);
    // No need for a toast here since we already show one in the referral form callback
  };
  
  // Remove a referral from the list
  const handleRemoveReferral = (index: number) => {
    setReferrals(prevReferrals => 
      prevReferrals.filter((_, i) => i !== index)
    );
    toast({
      title: "Referral Removed",
      description: "The referral has been removed from the SOAP note"
    });
  };
  
  return (
    <div className="container py-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => router.push("/admin/soap-notes")}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Back to SOAP Notes
          </Button>
          <h1 className="text-2xl font-bold">Create New SOAP Note</h1>
        </div>
        
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" /> 
                Apply Template
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <Command>
                <CommandInput placeholder="Search templates..." />
                <CommandList>
                  <CommandEmpty>No templates found.</CommandEmpty>
                  <CommandGroup heading="Templates">
                    {templates?.map((template: SOAPTemplate) => (
                      <CommandItem 
                        key={template.id}
                        onSelect={() => applyTemplate(template)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        {template.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          
          <Button 
            variant="outline"
            onClick={() => setShowSaveAsTemplateDialog(true)}
            disabled={!savedNoteId}
          >
            <Save className="h-4 w-4 mr-2" />
            Save as Template
          </Button>
        </div>
      </div>
      
      {/* Success Alert */}
      {soapNoteSaved && (
        <Alert className="mb-6 border-green-200 bg-green-50 dark:bg-green-950">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800 dark:text-green-200">SOAP Note Saved Successfully!</AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-300">
            Your SOAP note has been created and saved. You can now save it as a template or continue editing.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>SOAP Note Details</CardTitle>
              <CardDescription>
                Document the patient's subjective, objective, assessment, and plan details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormProvider {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Pet and Appointment Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="petId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pet</FormLabel>
                          <Popover open={petSelectorOpen} onOpenChange={setPetSelectorOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className={`w-full justify-between ${!field.value && "text-muted-foreground"}`}
                                  disabled={isLoading}
                                >
                                  {field.value
                                    ? pets?.find((pet: { id: number; name: string; species: string }) => pet.id === field.value)?.name + 
                                      ` (${pets?.find((pet: { id: number; name: string; species: string }) => pet.id === field.value)?.species})`
                                    : "Select a pet"}
                                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0">
                              <Command>
                                <CommandInput placeholder="Search pets..." />
                                <CommandList>
                                  <CommandEmpty>No pets found.</CommandEmpty>
                                  <CommandGroup>
                                    {pets?.map((pet: { id: number; name: string; species: string }) => (
                                      <CommandItem
                                        key={pet.id}
                                        value={`${pet.name} ${pet.species}`}
                                        onSelect={() => {
                                          console.log('Selected pet:', pet.id, pet.name); // Debug log
                                          field.onChange(pet.id);
                                          // Clear appointment selection when pet changes
                                          form.setValue('appointmentId', 0);
                                          setPetSelectorOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${
                                            field.value === pet.id ? "opacity-100" : "opacity-0"
                                          }`}
                                        />
                                        {pet.name} ({pet.species})
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="appointmentId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Appointment</FormLabel>
                          <Popover open={appointmentSelectorOpen} onOpenChange={setAppointmentSelectorOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className={`w-full justify-between ${(!field.value || field.value === 0) && "text-muted-foreground"}`}
                                  disabled={isLoading || !selectedPetId}
                                >
                                  {!selectedPetId ? (
                                    "Select a pet first"
                                  ) : isLoadingPetAppointments ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Loading appointments...
                                    </>
                                  ) : field.value && field.value > 0 && petAppointments ? (
                                    (() => {
                                      // Handle both number and string field values
                                      const fieldValueNum = typeof field.value === 'string' ? parseInt(field.value) : field.value;
                                      const appointment = petAppointments.find((appointment: any) => appointment.id === fieldValueNum);
                                      if (!appointment) return "Select an appointment";
                                      
                                      const title = appointment.title || appointment.name || appointment.type || `Appointment ${appointment.id}`;
                                      const dateStr = safeFormatDate(appointment.date, appointment);
                                      return `${title} (${dateStr})`;
                                    })()
                                  ) : (
                                    "Select an appointment"
                                  )}
                                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0">
                              <Command>
                                <CommandInput placeholder="Search appointments..." />
                                <CommandList>
                                  <CommandEmpty>
                                    {isLoadingPetAppointments && selectedPetId ? (
                                      <div className="flex items-center justify-center py-4">
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Loading appointments...
                                      </div>
                                    ) : (
                                      "No appointments found for this pet."
                                    )}
                                  </CommandEmpty>
                                  <CommandGroup>
                                    {petAppointments?.map((appointment: any) => {
                                      const title = appointment.title || appointment.name || appointment.type || `Appointment ${appointment.id}`;
                                      const dateStr = safeFormatDate(appointment.date, appointment);
                                      
                                      return (
                                        <CommandItem
                                          key={appointment.id}
                                          value={`${title} ${dateStr}`}
                                          onSelect={() => {
                                            field.onChange(appointment.id);
                                            setAppointmentSelectorOpen(false);
                                          }}
                                        >
                                          <Check
                                            className={`mr-2 h-4 w-4 ${
                                              field.value === appointment.id || field.value === appointment.id.toString() ? "opacity-100" : "opacity-0"
                                            }`}
                                          />
                                          {title} ({dateStr})
                                        </CommandItem>
                                      );
                                    })}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Tabs defaultValue="subjective" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger 
                        value="subjective" 
                        className="relative data-[state=active]:bg-blue-100 data-[state=active]:text-blue-600 dark:data-[state=active]:bg-blue-900 dark:data-[state=active]:text-blue-200"
                      >
                        Subjective
                        {tabValidationStatus.subjective && (
                          <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full" />
                        )}
                      </TabsTrigger>
                      <TabsTrigger 
                        value="objective" 
                        className="relative data-[state=active]:bg-green-100 data-[state=active]:text-green-600 dark:data-[state=active]:bg-green-900 dark:data-[state=active]:text-green-200"
                        onClick={() => {
                          // Debug log to check all form values before switching tabs
                          console.log("Current form values:", form.getValues());
                        }}
                      >
                        Objective
                        {tabValidationStatus.objective && (
                          <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full" />
                        )}
                      </TabsTrigger>
                      <TabsTrigger 
                        value="assessment" 
                        className="relative data-[state=active]:bg-amber-100 data-[state=active]:text-amber-600 dark:data-[state=active]:bg-amber-900 dark:data-[state=active]:text-amber-200"
                      >
                        Assessment
                        {tabValidationStatus.assessment && (
                          <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full" />
                        )}
                      </TabsTrigger>
                      <TabsTrigger 
                        value="plan" 
                        className="relative data-[state=active]:bg-purple-100 data-[state=active]:text-purple-600 dark:data-[state=active]:bg-purple-900 dark:data-[state=active]:text-purple-200"
                      >
                        Plan
                        {tabValidationStatus.plan && (
                          <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full" />
                        )}
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="subjective" className="py-6 mt-2">
                      <div className="p-4 rounded-md bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-900">
                        <div className="space-y-4">
                          {/* Chief Complaints - MultiSelect */}
                          <div className="mb-4">
                            <FormField
                              control={form.control}
                              name="chiefComplaint"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-blue-600 dark:text-blue-300 font-medium">
                                    Chief Complaint/Symptoms
                                  </FormLabel>
                                  <FormControl>
                                    <MultiSelect
                                      options={[
                                        { value: "Vomiting", label: "Vomiting" },
                                        { value: "Diarrhea", label: "Diarrhea" },
                                        { value: "Lethargy", label: "Lethargy" },
                                        { value: "Loss of appetite", label: "Loss of appetite" },
                                        { value: "Coughing", label: "Coughing" },
                                        { value: "Limping", label: "Limping" },
                                        { value: "Itching", label: "Itching" },
                                        { value: "Increased thirst", label: "Increased thirst" },
                                        { value: "Weight loss", label: "Weight loss" },
                                        { value: "Pain", label: "Pain" },
                                        { value: "Lump or mass", label: "Lump or mass" },
                                        { value: "Sneezing", label: "Sneezing" },
                                        { value: "Nasal discharge", label: "Nasal discharge" }
                                      ]}
                                      selected={field.value}
                                      onChange={field.onChange}
                                      placeholder="Select chief complaints..."
                                      searchPlaceholder="Search complaints..."
                                      groupHeading="Common Complaints"
                                      emptyMessage="No complaints found."
                                      className="bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* Patient History */}
                          <FormField
                            control={form.control}
                            name="patientHistory"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-blue-600 dark:text-blue-300 font-medium">
                                  Patient History
                                </FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Enter relevant patient history..."
                                    className="min-h-[100px] bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800 focus-visible:ring-blue-400"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />



                          {/* Duration of Symptoms */}
                          <FormField
                            control={form.control}
                            name="duration"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-blue-600 dark:text-blue-300 font-medium">
                                  Duration of Symptoms
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="e.g., 3 days, 1 week"
                                    className="bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800 focus-visible:ring-blue-400"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Traditional subjective textbox for additional notes */}
                          <FormField
                            control={form.control}
                            name="subjective"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-blue-600 dark:text-blue-300 font-medium">Additional Notes</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Any additional subjective information..." 
                                    className="min-h-[100px] bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800 focus-visible:ring-blue-400" 
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="objective" className="py-6 mt-2">
                      <div className="p-4 rounded-md bg-green-50 dark:bg-green-950 border border-green-100 dark:border-green-900">
                        <div className="space-y-6">
                          {/* Vital Signs Section */}
                          <div>
                            <h3 className="text-green-600 dark:text-green-300 font-medium mb-3">Vital Signs</h3>
                            <div className="bg-white dark:bg-slate-900 rounded-md p-4 border border-green-200 dark:border-green-800">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField
                                  control={form.control}
                                  name="temperature"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Temperature</FormLabel>
                                      <FormControl>
                                        <div className="flex">
                                          <Input
                                            type="number"
                                            step="0.1"
                                            placeholder="98.6"
                                            className="rounded-r-none"
                                            {...field}
                                          />
                                          <div className="bg-muted px-3 py-2 border border-l-0 rounded-r-md text-sm">
                                            °F
                                          </div>
                                        </div>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={form.control}
                                  name="heartRate"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Heart Rate</FormLabel>
                                      <FormControl>
                                        <div className="flex">
                                          <Input
                                            type="number"
                                            placeholder="80"
                                            className="rounded-r-none"
                                            {...field}
                                          />
                                          <div className="bg-muted px-3 py-2 border border-l-0 rounded-r-md text-sm">
                                            BPM
                                          </div>
                                        </div>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={form.control}
                                  name="respiratoryRate"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Respiratory Rate</FormLabel>
                                      <FormControl>
                                        <div className="flex">
                                          <Input
                                            type="number"
                                            placeholder="16"
                                            className="rounded-r-none"
                                            {...field}
                                          />
                                          <div className="bg-muted px-3 py-2 border border-l-0 rounded-r-md text-sm">
                                            RPM
                                          </div>
                                        </div>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={form.control}
                                  name="weight"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Weight</FormLabel>
                                      <FormControl>
                                        <div className="flex">
                                          <Input
                                            type="number"
                                            step="0.1"
                                            placeholder="10.5"
                                            className="rounded-r-none"
                                            {...field}
                                          />
                                          <Select
                                            defaultValue="kg"
                                            onValueChange={(value) => {
                                              // Weight unit could be stored in another form field if needed
                                            }}
                                          >
                                            <SelectTrigger className="w-20 rounded-l-none">
                                              <SelectValue placeholder="Unit" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="kg">kg</SelectItem>
                                              <SelectItem value="lb">lb</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={form.control}
                                  name="bloodPressure"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Blood Pressure</FormLabel>
                                      <FormControl>
                                        <div className="flex">
                                          <Input
                                            placeholder="120/80"
                                            className="rounded-r-none"
                                            {...field}
                                          />
                                          <div className="bg-muted px-3 py-2 border border-l-0 rounded-r-md text-sm">
                                            mmHg
                                          </div>
                                        </div>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={form.control}
                                  name="oxygenSaturation"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>O₂ Saturation</FormLabel>
                                      <FormControl>
                                        <div className="flex">
                                          <Input
                                            type="number"
                                            placeholder="98"
                                            className="rounded-r-none"
                                            {...field}
                                          />
                                          <div className="bg-muted px-3 py-2 border border-l-0 rounded-r-md text-sm">
                                            %
                                          </div>
                                        </div>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          </div>
                          
                          {/* Examination Findings Section */}
                          <div>
                            <h3 className="text-green-600 dark:text-green-300 font-medium mb-3">Examination Findings</h3>
                            <div className="space-y-4">
                              <div className="bg-white dark:bg-slate-900 rounded-md p-6 border border-green-200 dark:border-green-800 shadow-sm">
                                <Tabs defaultValue="general" className="w-full">
                                  <div className="mb-8">
                                    <TabsList className="w-full bg-green-50 dark:bg-green-950 p-2 rounded-lg grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                      <TabsTrigger value="general" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 rounded-md data-[state=active]:shadow-sm">
                                        <div className="flex items-center gap-2">
                                          <CircleIcon className="h-4 w-4" />
                                          <span>General</span>
                                        </div>
                                      </TabsTrigger>
                                      <TabsTrigger value="cardio" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 rounded-md data-[state=active]:shadow-sm">
                                        <div className="flex items-center gap-2">
                                          <HeartPulseIcon className="h-4 w-4" />
                                          <span>Cardiovascular</span>
                                        </div>
                                      </TabsTrigger>
                                      <TabsTrigger value="respiratory" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 rounded-md data-[state=active]:shadow-sm">
                                        <div className="flex items-center gap-2">
                                          <Wind className="h-4 w-4" />
                                          <span>Respiratory</span>
                                        </div>
                                      </TabsTrigger>
                                      <TabsTrigger value="gastrointestinal" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 rounded-md data-[state=active]:shadow-sm">
                                        <div className="flex items-center gap-2">
                                          <Utensils className="h-4 w-4" />
                                          <span>Gastrointestinal</span>
                                        </div>
                                      </TabsTrigger>
                                      <TabsTrigger value="musculoskeletal" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 rounded-md data-[state=active]:shadow-sm">
                                        <div className="flex items-center gap-2">
                                          <Activity className="h-4 w-4" />
                                          <span>Musculoskeletal</span>
                                        </div>
                                      </TabsTrigger>
                                      <TabsTrigger value="neurological" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 rounded-md data-[state=active]:shadow-sm">
                                        <div className="flex items-center gap-2">
                                          <Brain className="h-4 w-4" />
                                          <span>Neurological</span>
                                        </div>
                                      </TabsTrigger>
                                      <TabsTrigger value="skin" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 rounded-md data-[state=active]:shadow-sm">
                                        <div className="flex items-center gap-2">
                                          <Fingerprint className="h-4 w-4" />
                                          <span>Integumentary</span>
                                        </div>
                                      </TabsTrigger>
                                    </TabsList>
                                  </div>
                                  
                                  <TabsContent value="general" className="mt-8 pt-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <Card className="shadow-sm border-green-100 dark:border-green-800">
                                        <CardHeader className="pb-2">
                                          <CardTitle className="text-base font-medium">General Appearance</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                          <FormField
                                            control={form.control}
                                            name="generalAppearance"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormControl>
                                                  <Textarea 
                                                    placeholder="Enter observations about general appearance..."
                                                    className="min-h-[100px]"
                                                    {...field}
                                                  />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                        </CardContent>
                                      </Card>
                                      
                                      <Card className="shadow-sm border-green-100 dark:border-green-800">
                                        <CardHeader className="pb-2">
                                          <CardTitle className="text-base font-medium">Hydration Status</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                          <FormField
                                            control={form.control}
                                            name="hydration"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormControl>
                                                  <Select 
                                                    onValueChange={field.onChange} 
                                                    value={field.value || ""}
                                                  >
                                                    <SelectTrigger>
                                                      <SelectValue placeholder="Select hydration status" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="normal">Normal</SelectItem>
                                                      <SelectItem value="mild_dehydration">Mild Dehydration</SelectItem>
                                                      <SelectItem value="moderate_dehydration">Moderate Dehydration</SelectItem>
                                                      <SelectItem value="severe_dehydration">Severe Dehydration</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                        </CardContent>
                                      </Card>
                                    </div>
                                  </TabsContent>
                                  
                                  <TabsContent value="cardio" className="mt-6 pt-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <Card className="shadow-sm border-green-100 dark:border-green-800">
                                        <CardHeader className="pb-2">
                                          <CardTitle className="text-base font-medium">Heart Sounds</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                          <FormField
                                            control={form.control}
                                            name="heartSounds"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormControl>
                                                  <Select 
                                                    onValueChange={field.onChange} 
                                                    value={field.value || ""}
                                                  >
                                                    <SelectTrigger>
                                                      <SelectValue placeholder="Select heart sounds" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="normal">Normal</SelectItem>
                                                      <SelectItem value="murmur">Murmur</SelectItem>
                                                      <SelectItem value="arrhythmia">Arrhythmia</SelectItem>
                                                      <SelectItem value="muffled">Muffled</SelectItem>
                                                      <SelectItem value="gallop">Gallop Rhythm</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                        </CardContent>
                                      </Card>
                                      
                                      <Card className="shadow-sm border-green-100 dark:border-green-800">
                                        <CardHeader className="pb-2">
                                          <CardTitle className="text-base font-medium">Pulse Quality</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                          <FormField
                                            control={form.control}
                                            name="pulseQuality"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormControl>
                                                  <Select 
                                                    onValueChange={field.onChange} 
                                                    value={field.value || ""}
                                                  >
                                                    <SelectTrigger>
                                                      <SelectValue placeholder="Select pulse quality" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="normal">Normal</SelectItem>
                                                      <SelectItem value="weak">Weak</SelectItem>
                                                      <SelectItem value="bounding">Bounding</SelectItem>
                                                      <SelectItem value="irregular">Irregular</SelectItem>
                                                      <SelectItem value="absent">Absent</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                        </CardContent>
                                      </Card>
                                      
                                      <Card className="shadow-sm border-green-100 dark:border-green-800 md:col-span-2">
                                        <CardHeader className="pb-2">
                                          <CardTitle className="text-base font-medium">Additional Notes</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                          <FormField
                                            control={form.control}
                                            name="cardiovascularNotes"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormControl>
                                                  <Textarea 
                                                    placeholder="Enter cardiovascular notes..."
                                                    className="min-h-[100px]"
                                                    {...field}
                                                  />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                        </CardContent>
                                      </Card>
                                    </div>
                                  </TabsContent>
                                  
                                  <TabsContent value="respiratory" className="mt-6 pt-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <Card className="shadow-sm border-green-100 dark:border-green-800">
                                        <CardHeader className="pb-2">
                                          <CardTitle className="text-base font-medium">Lung Sounds</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                          <FormField
                                            control={form.control}
                                            name="lungSounds"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormControl>
                                                  <Select 
                                                    onValueChange={field.onChange} 
                                                    value={field.value || ""}
                                                  >
                                                    <SelectTrigger>
                                                      <SelectValue placeholder="Select lung sounds" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="normal">Normal</SelectItem>
                                                      <SelectItem value="crackles">Crackles</SelectItem>
                                                      <SelectItem value="wheezes">Wheezes</SelectItem>
                                                      <SelectItem value="absent">Absent</SelectItem>
                                                      <SelectItem value="muffled">Muffled</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                        </CardContent>
                                      </Card>
                                      
                                      <Card className="shadow-sm border-green-100 dark:border-green-800">
                                        <CardHeader className="pb-2">
                                          <CardTitle className="text-base font-medium">Respiratory Effort</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                          <FormField
                                            control={form.control}
                                            name="respiratoryEffort"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormControl>
                                                  <Select 
                                                    onValueChange={field.onChange} 
                                                    value={field.value || ""}
                                                  >
                                                    <SelectTrigger>
                                                      <SelectValue placeholder="Select respiratory effort" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="normal">Normal</SelectItem>
                                                      <SelectItem value="mild_increased">Mildly Increased</SelectItem>
                                                      <SelectItem value="moderate_increased">Moderately Increased</SelectItem>
                                                      <SelectItem value="severe_increased">Severely Increased</SelectItem>
                                                      <SelectItem value="labored">Labored</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                        </CardContent>
                                      </Card>
                                      
                                      <Card className="shadow-sm border-green-100 dark:border-green-800 md:col-span-2">
                                        <CardHeader className="pb-2">
                                          <CardTitle className="text-base font-medium">Additional Notes</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                          <FormField
                                            control={form.control}
                                            name="respiratoryNotes"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormControl>
                                                  <Textarea 
                                                    placeholder="Enter respiratory notes..."
                                                    className="min-h-[100px]"
                                                    {...field}
                                                  />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                        </CardContent>
                                      </Card>
                                    </div>
                                  </TabsContent>
                                  
                                  <TabsContent value="gastrointestinal" className="mt-6 pt-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <Card className="shadow-sm border-green-100 dark:border-green-800">
                                        <CardHeader className="pb-2">
                                          <CardTitle className="text-base font-medium">Abdomen Palpation</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                          <FormField
                                            control={form.control}
                                            name="abdomenPalpation"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormControl>
                                                  <Select 
                                                    onValueChange={field.onChange} 
                                                    value={field.value || ""}
                                                  >
                                                    <SelectTrigger>
                                                      <SelectValue placeholder="Select abdomen findings" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="normal">Normal</SelectItem>
                                                      <SelectItem value="soft">Soft</SelectItem>
                                                      <SelectItem value="tense">Tense</SelectItem>
                                                      <SelectItem value="painful">Painful</SelectItem>
                                                      <SelectItem value="distended">Distended</SelectItem>
                                                      <SelectItem value="mass_present">Mass Present</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                        </CardContent>
                                      </Card>
                                      
                                      <Card className="shadow-sm border-green-100 dark:border-green-800">
                                        <CardHeader className="pb-2">
                                          <CardTitle className="text-base font-medium">Bowel Sounds</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                          <FormField
                                            control={form.control}
                                            name="bowelSounds"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormControl>
                                                  <Select 
                                                    onValueChange={field.onChange} 
                                                    value={field.value || ""}
                                                  >
                                                    <SelectTrigger>
                                                      <SelectValue placeholder="Select bowel sounds" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="normal">Normal</SelectItem>
                                                      <SelectItem value="increased">Increased</SelectItem>
                                                      <SelectItem value="decreased">Decreased</SelectItem>
                                                      <SelectItem value="absent">Absent</SelectItem>
                                                      <SelectItem value="borborygmi">Borborygmi</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                        </CardContent>
                                      </Card>
                                      
                                      <Card className="shadow-sm border-green-100 dark:border-green-800 md:col-span-2">
                                        <CardHeader className="pb-2">
                                          <CardTitle className="text-base font-medium">Additional Notes</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                          <FormField
                                            control={form.control}
                                            name="gastrointestinalNotes"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormControl>
                                                  <Textarea 
                                                    placeholder="Enter gastrointestinal notes..."
                                                    className="min-h-[100px]"
                                                    {...field}
                                                  />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                        </CardContent>
                                      </Card>
                                    </div>
                                  </TabsContent>
                                  
                                  <TabsContent value="musculoskeletal" className="mt-6 pt-4 pb-4 bg-white dark:bg-slate-900 rounded-md border border-green-200 dark:border-green-800">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <Card className="shadow-sm border-green-100 dark:border-green-800">
                                        <CardHeader className="pb-2">
                                          <CardTitle className="text-base font-medium">Gait</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                          <FormField
                                            control={form.control}
                                            name="gait"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormControl>
                                                  <Select 
                                                    onValueChange={field.onChange} 
                                                    value={field.value || ""}
                                                  >
                                                    <SelectTrigger>
                                                      <SelectValue placeholder="Select gait assessment" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="normal">Normal</SelectItem>
                                                      <SelectItem value="stiff">Stiff</SelectItem>
                                                      <SelectItem value="ataxic">Ataxic</SelectItem>
                                                      <SelectItem value="limping">Limping</SelectItem>
                                                      <SelectItem value="reluctant_to_move">Reluctant to Move</SelectItem>
                                                      <SelectItem value="non_weight_bearing">Non-weight Bearing</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                        </CardContent>
                                      </Card>
                                      
                                      <Card className="shadow-sm border-green-100 dark:border-green-800">
                                        <CardHeader className="pb-2">
                                          <CardTitle className="text-base font-medium">Joint Status</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                          <FormField
                                            control={form.control}
                                            name="jointStatus"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormControl>
                                                  <Select 
                                                    onValueChange={field.onChange} 
                                                    value={field.value || ""}
                                                  >
                                                    <SelectTrigger>
                                                      <SelectValue placeholder="Select joint status" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="normal">Normal</SelectItem>
                                                      <SelectItem value="painful">Painful</SelectItem>
                                                      <SelectItem value="swollen">Swollen</SelectItem>
                                                      <SelectItem value="crepitus">Crepitus</SelectItem>
                                                      <SelectItem value="reduced_range_of_motion">Reduced Range of Motion</SelectItem>
                                                      <SelectItem value="instability">Instability</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                        </CardContent>
                                      </Card>
                                      
                                      <Card className="shadow-sm border-green-100 dark:border-green-800 md:col-span-2">
                                        <CardHeader className="pb-2">
                                          <CardTitle className="text-base font-medium">Additional Notes</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                          <FormField
                                            control={form.control}
                                            name="musculoskeletalNotes"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormControl>
                                                  <Textarea 
                                                    placeholder="Enter musculoskeletal notes..."
                                                    className="min-h-[100px]"
                                                    {...field}
                                                  />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                        </CardContent>
                                      </Card>
                                    </div>
                                  </TabsContent>
                                  
                                  <TabsContent value="neurological" className="mt-6 pt-4 pb-4 bg-white dark:bg-slate-900 rounded-md border border-green-200 dark:border-green-800">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <Card className="shadow-sm border-green-100 dark:border-green-800">
                                        <CardHeader className="pb-2">
                                          <CardTitle className="text-base font-medium">Mental Status</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                          <FormField
                                            control={form.control}
                                            name="mentalStatus"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormControl>
                                                  <Select 
                                                    onValueChange={field.onChange} 
                                                    value={field.value || ""}
                                                  >
                                                    <SelectTrigger>
                                                      <SelectValue placeholder="Select mental status" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="alert">Alert</SelectItem>
                                                      <SelectItem value="responsive">Responsive</SelectItem>
                                                      <SelectItem value="depressed">Depressed</SelectItem>
                                                      <SelectItem value="disoriented">Disoriented</SelectItem>
                                                      <SelectItem value="lethargic">Lethargic</SelectItem>
                                                      <SelectItem value="stuporous">Stuporous</SelectItem>
                                                      <SelectItem value="comatose">Comatose</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                        </CardContent>
                                      </Card>
                                      
                                      <Card className="shadow-sm border-green-100 dark:border-green-800">
                                        <CardHeader className="pb-2">
                                          <CardTitle className="text-base font-medium">Reflexes</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                          <FormField
                                            control={form.control}
                                            name="reflexes"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormControl>
                                                  <Select 
                                                    onValueChange={field.onChange} 
                                                    value={field.value || ""}
                                                  >
                                                    <SelectTrigger>
                                                      <SelectValue placeholder="Select reflex status" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="normal">Normal</SelectItem>
                                                      <SelectItem value="hyperreflexia">Hyperreflexia</SelectItem>
                                                      <SelectItem value="hyporeflexia">Hyporeflexia</SelectItem>
                                                      <SelectItem value="absent">Absent</SelectItem>
                                                      <SelectItem value="crossed_extensor">Crossed Extensor</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                        </CardContent>
                                      </Card>
                                      
                                      <Card className="shadow-sm border-green-100 dark:border-green-800 md:col-span-2">
                                        <CardHeader className="pb-2">
                                          <CardTitle className="text-base font-medium">Additional Notes</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                          <FormField
                                            control={form.control}
                                            name="neurologicalNotes"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormControl>
                                                  <Textarea 
                                                    placeholder="Enter neurological notes..."
                                                    className="min-h-[100px]"
                                                    {...field}
                                                  />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                        </CardContent>
                                      </Card>
                                    </div>
                                  </TabsContent>
                                  
                                  <TabsContent value="skin" className="mt-6 pt-4 pb-4 bg-white dark:bg-slate-900 rounded-md border border-green-200 dark:border-green-800">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <Card className="shadow-sm border-green-100 dark:border-green-800">
                                        <CardHeader className="pb-2">
                                          <CardTitle className="text-base font-medium">Skin Condition</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                          <FormField
                                            control={form.control}
                                            name="skinCondition"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormControl>
                                                  <Select 
                                                    onValueChange={field.onChange} 
                                                    value={field.value || ""}
                                                  >
                                                    <SelectTrigger>
                                                      <SelectValue placeholder="Select skin condition" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="normal">Normal</SelectItem>
                                                      <SelectItem value="dry">Dry</SelectItem>
                                                      <SelectItem value="oily">Oily</SelectItem>
                                                      <SelectItem value="scaly">Scaly</SelectItem>
                                                      <SelectItem value="erythematous">Erythematous</SelectItem>
                                                      <SelectItem value="ulcerated">Ulcerated</SelectItem>
                                                      <SelectItem value="crusted">Crusted</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                        </CardContent>
                                      </Card>
                                      
                                      <Card className="shadow-sm border-green-100 dark:border-green-800">
                                        <CardHeader className="pb-2">
                                          <CardTitle className="text-base font-medium">Coat/Fur Condition</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                          <FormField
                                            control={form.control}
                                            name="coatCondition"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormControl>
                                                  <Select 
                                                    onValueChange={field.onChange} 
                                                    value={field.value || ""}
                                                  >
                                                    <SelectTrigger>
                                                      <SelectValue placeholder="Select coat condition" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="normal">Normal</SelectItem>
                                                      <SelectItem value="dull">Dull</SelectItem>
                                                      <SelectItem value="alopecia">Alopecia</SelectItem>
                                                      <SelectItem value="matted">Matted</SelectItem>
                                                      <SelectItem value="greasy">Greasy</SelectItem>
                                                      <SelectItem value="brittle">Brittle</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                        </CardContent>
                                      </Card>
                                      
                                      <Card className="shadow-sm border-green-100 dark:border-green-800 md:col-span-2">
                                        <CardHeader className="pb-2">
                                          <CardTitle className="text-base font-medium">Additional Notes</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                          <FormField
                                            control={form.control}
                                            name="skinNotes"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormControl>
                                                  <Textarea 
                                                    placeholder="Enter notes about skin, coat, parasites, or other integumentary findings..."
                                                    className="min-h-[100px]"
                                                    {...field}
                                                  />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                        </CardContent>
                                      </Card>
                                    </div>
                                  </TabsContent>
                                  
                                </Tabs>
                              </div>
                            </div>
                          </div>
                          
                          {/* Lab Results Section */}
                          <div>
                            <h3 className="text-green-600 dark:text-green-300 font-medium mb-3">Lab Results</h3>
                            <div className="bg-white dark:bg-slate-900 rounded-md p-4 border border-green-200 dark:border-green-800">
                              <SoapLabResultsSection 
                                soapNoteId={0} 
                                petId={form.watch("petId") || 0} 
                                section="objective"
                              />
                            </div>
                          </div>
                          
                          {/* Keep the original textbox for additional notes */}
                          <FormField
                            control={form.control}
                            name="objective"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-green-600 dark:text-green-300 font-medium">Additional Objective Notes</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Any additional objective findings not captured above..." 
                                    className="min-h-[100px] bg-white dark:bg-slate-900 border-green-200 dark:border-green-800 focus-visible:ring-green-400" 
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="assessment" className="py-6 mt-2">
                      <div className="p-4 rounded-md bg-amber-50 dark:bg-amber-950 border border-amber-100 dark:border-amber-900">
                        <div className="space-y-6">
                          {/* Primary Diagnosis */}
                          <div>
                            <h3 className="text-amber-600 dark:text-amber-300 font-medium mb-3">Primary Diagnosis</h3>
                            <div className="bg-white dark:bg-slate-900 rounded-md p-4 border border-amber-200 dark:border-amber-800">
                              <FormField
                                control={form.control}
                                name="primaryDiagnosis"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Primary Diagnosis</FormLabel>
                                    <FormControl>
                                      <MultiSelect
                                        options={[
                                          { value: "Gastroenteritis", label: "Gastroenteritis" },
                                          { value: "Otitis externa", label: "Otitis externa" },
                                          { value: "Urinary tract infection", label: "Urinary tract infection" },
                                          { value: "Dermatitis", label: "Dermatitis" },
                                          { value: "Dental disease", label: "Dental disease" },
                                          { value: "Osteoarthritis", label: "Osteoarthritis" },
                                          { value: "Upper respiratory infection", label: "Upper respiratory infection" },
                                          { value: "Allergic reaction", label: "Allergic reaction" },
                                          { value: "Pancreatitis", label: "Pancreatitis" },
                                          { value: "Diabetes mellitus", label: "Diabetes mellitus" },
                                          { value: "Hyperthyroidism", label: "Hyperthyroidism" },
                                          { value: "Chronic kidney disease", label: "Chronic kidney disease" }
                                        ]}
                                        selected={field.value}
                                        onChange={field.onChange}
                                        placeholder="Select primary diagnosis..."
                                        searchPlaceholder="Search diagnoses..."
                                        groupHeading="Common Diagnoses"
                                        emptyMessage="No diagnoses found."
                                        className="bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-800"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                                                          
                              <div className="mt-4">
                                <FormField
                                  control={form.control}
                                  name="confirmationStatus"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Confirmation Status</FormLabel>
                                      <Select 
                                        onValueChange={field.onChange} 
                                        value={field.value || ""}
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select status" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="confirmed">Confirmed</SelectItem>
                                          <SelectItem value="presumptive">Presumptive</SelectItem>
                                          <SelectItem value="rule_out">Rule Out</SelectItem>
                                          <SelectItem value="differential">Differential</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          </div>
                          
                          {/* Differential Diagnoses */}
                          <div>
                            <h3 className="text-amber-600 dark:text-amber-300 font-medium mb-3">Differential Diagnoses</h3>
                            <div className="bg-white dark:bg-slate-900 rounded-md p-4 border border-amber-200 dark:border-amber-800">
                              <FormField
                                control={form.control}
                                name="differentialDiagnoses"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Differential Diagnoses</FormLabel>
                                    <FormControl>
                                      <MultiSelect
                                        options={[
                                          { value: "Gastroenteritis", label: "Gastroenteritis" },
                                          { value: "Pancreatitis", label: "Pancreatitis" },
                                          { value: "Foreign body ingestion", label: "Foreign body ingestion" },
                                          { value: "Inflammatory bowel disease", label: "Inflammatory bowel disease" },
                                          { value: "Parasitic infection", label: "Parasitic infection" },
                                          { value: "Dietary indiscretion", label: "Dietary indiscretion" },
                                          { value: "Drug reaction", label: "Drug reaction" },
                                          { value: "Hepatic disease", label: "Hepatic disease" },
                                          { value: "Renal disease", label: "Renal disease" },
                                          { value: "Metabolic disorder", label: "Metabolic disorder" },
                                          { value: "Endocrine disorder", label: "Endocrine disorder" },
                                          { value: "Infectious disease", label: "Infectious disease" },
                                          { value: "Neoplasia", label: "Neoplasia" },
                                          { value: "Intoxication", label: "Intoxication" },
                                          { value: "Trauma", label: "Trauma" }
                                        ]}
                                        selected={field.value || []}
                                        onChange={field.onChange}
                                        placeholder="Select differential diagnoses..."
                                        searchPlaceholder="Search diagnoses..."
                                        groupHeading="Potential Diagnoses"
                                        emptyMessage="No diagnoses found."
                                        className="bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-800"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                          
                          {/* Progress Evaluation */}
                          <div>
                            <h3 className="text-amber-600 dark:text-amber-300 font-medium mb-3">Progress Evaluation</h3>
                            <div className="bg-white dark:bg-slate-900 rounded-md p-4 border border-amber-200 dark:border-amber-800">
                              <div className="space-y-4">
                                <FormField
                                  control={form.control}
                                  name="progressStatus"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Progress Status</FormLabel>
                                      <Select 
                                        onValueChange={field.onChange} 
                                        value={field.value || ""}
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select progress status" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="improving">Improving</SelectItem>
                                          <SelectItem value="stable">Stable</SelectItem>
                                          <SelectItem value="worsening">Worsening</SelectItem>
                                          <SelectItem value="resolved">Resolved</SelectItem>
                                          <SelectItem value="new">New Condition</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={form.control}
                                  name="progressNotes"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Progress Notes</FormLabel>
                                      <FormControl>
                                        <Textarea 
                                          placeholder="Enter notes about the patient's progress..."
                                          className="min-h-[100px]"
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          </div>
                          
                          {/* Additional Assessment Notes */}
                          <FormField
                            control={form.control}
                            name="assessment"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-amber-600 dark:text-amber-300 font-medium">Additional Assessment Notes</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Enter any additional assessment information..." 
                                    className="min-h-[100px] bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-800 focus-visible:ring-amber-400" 
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="plan" className="py-6 mt-2">
                      <div className="p-4 rounded-md bg-purple-50 dark:bg-purple-950 border border-purple-100 dark:border-purple-900">
                        <div className="space-y-6">
                          {/* Procedures and Treatments Section */}
                          <div>
                            <h3 className="text-purple-600 dark:text-purple-300 font-medium mb-3">Procedures & Treatments</h3>
                            <div className="bg-white dark:bg-slate-900 rounded-md p-4 border border-purple-200 dark:border-purple-800">
                              <FormField
                                control={form.control}
                                name="procedures"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Procedures & Treatments</FormLabel>
                                    <FormControl>
                                      <MultiSelect
                                        options={[
                                          { value: "Dental cleaning", label: "Dental cleaning" },
                                          { value: "Fluid therapy", label: "Fluid therapy" },
                                          { value: "Wound treatment", label: "Wound treatment" },
                                          { value: "Radiograph", label: "Radiograph" },
                                          { value: "Ultrasound", label: "Ultrasound" },
                                          { value: "Blood transfusion", label: "Blood transfusion" },
                                          { value: "Bandage application", label: "Bandage application" },
                                          { value: "Ear cleaning", label: "Ear cleaning" },
                                          { value: "Nail trim", label: "Nail trim" },
                                          { value: "Anal gland expression", label: "Anal gland expression" },
                                          { value: "Laser therapy", label: "Laser therapy" },
                                          { value: "Orthopedic examination", label: "Orthopedic examination" },
                                          { value: "Neurological examination", label: "Neurological examination" },
                                          { value: "Physical therapy", label: "Physical therapy" },
                                          { value: "Acupuncture", label: "Acupuncture" }
                                        ]}
                                        selected={Array.isArray(field.value) ? field.value : []}
                                        onChange={field.onChange}
                                        placeholder="Select procedures & treatments..."
                                        searchPlaceholder="Search procedures..."
                                        groupHeading="Common Procedures"
                                        emptyMessage="No procedures found."
                                        className="bg-white dark:bg-slate-900 border-purple-200 dark:border-purple-800"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <div className="mt-4">
                                <FormField
                                  control={form.control}
                                  name="procedureNotes"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Additional Procedure Notes</FormLabel>
                                      <FormControl>
                                        <Textarea 
                                          placeholder="Enter any additional procedure or treatment details..."
                                          className="min-h-[100px]"
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          </div>
                          
                          {/* Diagnostics Section */}
                          <div>
                            <h3 className="text-purple-600 dark:text-purple-300 font-medium mb-3">Diagnostics</h3>
                            <div className="bg-white dark:bg-slate-900 rounded-md p-4 border border-purple-200 dark:border-purple-800">
                              <FormField
                                control={form.control}
                                name="diagnostics"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Diagnostic Tests</FormLabel>
                                    <FormControl>
                                      <MultiSelect
                                        options={[
                                          { value: "CBC/Chemistry", label: "CBC/Chemistry" },
                                          { value: "Urinalysis", label: "Urinalysis" },
                                          { value: "Fecal examination", label: "Fecal examination" },
                                          { value: "Cytology", label: "Cytology" },
                                          { value: "Biopsy", label: "Biopsy" },
                                          { value: "Culture and sensitivity", label: "Culture and sensitivity" },
                                          { value: "Heartworm test", label: "Heartworm test" },
                                          { value: "FeLV/FIV test", label: "FeLV/FIV test" },
                                          { value: "Thyroid panel", label: "Thyroid panel" },
                                          { value: "Cortisol test", label: "Cortisol test" },
                                          { value: "Radiography", label: "Radiography" },
                                          { value: "Ultrasound", label: "Ultrasound" },
                                          { value: "MRI", label: "MRI" },
                                          { value: "CT scan", label: "CT scan" },
                                          { value: "Electrocardiogram", label: "Electrocardiogram" }
                                        ]}
                                        selected={Array.isArray(field.value) ? field.value : []}
                                        onChange={field.onChange}
                                        placeholder="Select recommended diagnostic tests..."
                                        searchPlaceholder="Search diagnostics..."
                                        groupHeading="Recommended Tests"
                                        emptyMessage="No diagnostic tests found."
                                        className="bg-white dark:bg-slate-900 border-purple-200 dark:border-purple-800"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                          
                          {/* Additional Plan Notes with Health Plan Templates */}
                          <div>
                            <FormField
                              control={form.control}
                              name="plan"
                              render={({ field }) => (
                                <FormItem>
                                  <div className="flex justify-between items-center">
                                    <FormLabel className="text-purple-600 dark:text-purple-300 font-medium">Additional Treatment Plan Notes</FormLabel>
                                    <HealthPlanSelector onSelect={(plan) => {
                                      // Append the health plan to the current value
                                      const currentValue = field.value || '';
                                      const separator = currentValue ? '\n\n' : '';
                                      const planText = `## Health Plan: ${plan.name}\n${plan.description || 'No additional details available.'}`;
                                      field.onChange(currentValue + separator + planText);
                                    }} />
                                  </div>
                                  <FormControl>
                                    <Textarea 
                                      placeholder="Enter any additional treatment plan information..." 
                                      className="min-h-[100px] bg-white dark:bg-slate-900 border-purple-200 dark:border-purple-800 focus-visible:ring-purple-400" 
                                      {...field} 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          {/* Client Education Section */}
                          <div>
                            <h3 className="text-purple-600 dark:text-purple-300 font-medium mb-3">Client Education</h3>
                            <div className="bg-white dark:bg-slate-900 rounded-md p-4 border border-purple-200 dark:border-purple-800">
                              <FormField
                                control={form.control}
                                name="clientEducation"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Education & Home Care Instructions</FormLabel>
                                    <FormControl>
                                      <Textarea 
                                        placeholder="Enter client education and home care instructions..."
                                        className="min-h-[100px]"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                          
                          {/* Follow-up Scheduling */}
                          <div>
                            <h3 className="text-purple-600 dark:text-purple-300 font-medium mb-3">Follow-up</h3>
                            <div className="bg-white dark:bg-slate-900 rounded-md p-4 border border-purple-200 dark:border-purple-800">
                              <div className="space-y-4">
                                <FormField
                                  control={form.control}
                                  name="followUpTimeframe"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Follow-up Timeframe</FormLabel>
                                      <Select 
                                        onValueChange={field.onChange} 
                                        value={field.value || ""}
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select timeframe" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="1_week">1 week</SelectItem>
                                          <SelectItem value="2_weeks">2 weeks</SelectItem>
                                          <SelectItem value="1_month">1 month</SelectItem>
                                          <SelectItem value="3_months">3 months</SelectItem>
                                          <SelectItem value="6_months">6 months</SelectItem>
                                          <SelectItem value="as_needed">As needed</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={form.control}
                                  name="followUpReason"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Follow-up Reason</FormLabel>
                                      <FormControl>
                                        <Input
                                          placeholder="e.g., Recheck wound, Follow-up bloodwork"
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              
                              <div className="mt-4">
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full"
                                  onClick={() => {
                                    // Create a new follow-up appointment based on the current form data
                                    // This would typically integrate with your appointment scheduling system
                                    toast({
                                      title: "Follow-up appointment",
                                      description: "This would open the appointment scheduler with pre-filled data",
                                    });
                                  }}
                                >
                                  <CalendarPlus className="h-4 w-4 mr-2" />
                                  Schedule Follow-up Appointment
                                </Button>
                              </div>
                            </div>
                          </div>
                          

                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => router.push("/admin/soap-notes")}
                    >
                      Cancel
                    </Button>
                    {savedNoteId && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSaveAsTemplate}
                        disabled={isLoading}
                      >
                        <BookTemplate className="mr-2 h-4 w-4" />
                        Save as Template
                      </Button>
                    )}
                    <Button 
                      type="submit" 
                      disabled={isLoading}
                    >
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save SOAP Note
                    </Button>
                  </div>
                </form>
              </FormProvider>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          {/* File Attachments Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-md">Attachments</CardTitle>
              <CardDescription>
                Upload files related to this SOAP note
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUpload 
                onFilesUploaded={handleFileUpload}
                endpoint="/api/soap-notes/attachments"
                maxFiles={5}
                maxSizeMB={10}
                allowedFileTypes={["image/jpeg", "image/png", "image/gif", "application/pdf", "text/plain"]}
                recordType={savedNoteId ? "soap-note" : "PENDING"}
                recordId={savedNoteId || undefined}
                practiceId={userPracticeId || undefined}
              />
              
              {uploadedFiles.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Uploaded Files ({uploadedFiles.length})</h4>
                  <div className="space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                        <div className="flex items-center">
                          <Paperclip className="h-4 w-4 mr-2 text-muted-foreground" />
                          <div>
                            <span className="text-sm font-medium truncate max-w-[200px] block">
                              {file.fileName || `File ${index + 1}`}
                            </span>
                            {file.fileSize && (
                              <span className="text-xs text-muted-foreground">
                                {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                              </span>
                            )}
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Template Info Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-md">Template</CardTitle>
              <CardDescription>
                {selectedTemplate 
                  ? `Using template: ${selectedTemplate.name}` 
                  : "Save this SOAP note as a template"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedTemplate ? (
                <div className="space-y-2">
                  <p className="text-sm">{selectedTemplate.description}</p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full"
                    onClick={() => setSelectedTemplate(null)}
                  >
                    Clear Template
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-center py-2">
                    <NotebookPen className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Create a reusable template from this SOAP note
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full"
                    onClick={() => setShowSaveAsTemplateDialog(true)}
                    disabled={!savedNoteId}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save as Template
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Lab Results Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-md">Lab Results</CardTitle>
              <CardDescription>
                Link lab results to this SOAP note
              </CardDescription>
            </CardHeader>
            <CardContent>
              {form.watch("petId") ? (
                <SoapLabResultsSection 
                  petId={form.watch("petId") || ""}
                  soapNoteId={savedNoteId || 0}
                  section="objective"
                  isEditable={true}
                />
              ) : (
                <div>
                  <Button 
                    variant="outline"
                    className="w-full"
                    disabled={!form.watch("petId")}
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Link Lab Results
                  </Button>
                  {!form.watch("petId") && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Select a pet first
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Prescriptions Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-md">Prescriptions</CardTitle>
              <CardDescription>
                Add prescriptions to this SOAP note
              </CardDescription>
            </CardHeader>
            <CardContent>
              {form.watch("petId") ? (
                <div className="space-y-4">
                  <Button 
                    variant="outline"
                    className="w-full"
                    onClick={() => setIsPrescriptionFormOpen(true)}
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Prescription
                  </Button>
                  
                  {/* Always show SoapPrescriptionDisplay to display existing prescriptions */}
                  <SoapPrescriptionDisplay soapNoteId={savedNoteId || 0} />
                </div>
              ) : (
                <div>
                  <Button 
                    variant="outline"
                    className="w-full"
                    disabled={!form.watch("petId")}
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Prescription
                  </Button>
                  {!form.watch("petId") && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Select a pet first
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Follow-up Appointments Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-md">Follow-up</CardTitle>
              <CardDescription>
                Schedule follow-up appointments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline"
                className="w-full"
                onClick={() => setShowFollowUpDialog(true)}
                disabled={!form.watch("petId")}
              >
                <CalendarPlus className="h-4 w-4 mr-2" />
                Schedule Follow-up
              </Button>
              {!form.watch("petId") && (
                <p className="text-xs text-muted-foreground mt-2">
                  Select a pet first
                </p>
              )}
            </CardContent>
          </Card>

          {/* Referrals Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-md">Referrals</CardTitle>
              <CardDescription>
                Refer to specialists
              </CardDescription>
            </CardHeader>
            <CardContent>
              {form.watch("petId") ? (
                <div className="space-y-4">
                  <Button 
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowReferralDialog(true)}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Add Referral
                  </Button>
                  
                  {/* Display added referrals */}
                  {referrals.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Added Referrals:</h4>
                      {referrals.map((referral, index) => (
                        <div key={index} className="p-2 border rounded-md text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{referral.specialty || referral.type}</span>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleRemoveReferral(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-muted-foreground">{referral.referralReason || referral.reason}</p>
                          <p className="text-xs text-muted-foreground">Priority: {referral.priority}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <Button 
                    variant="outline"
                    className="w-full"
                    disabled={!form.watch("petId")}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Add Referral
                  </Button>
                  {!form.watch("petId") && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Select a pet first
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Main Prescription Dialog */}
      <Dialog open={isPrescriptionFormOpen} onOpenChange={setIsPrescriptionFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Prescription</DialogTitle>
            <DialogDescription>
              Add a prescription to this SOAP note
            </DialogDescription>
          </DialogHeader>
          
          {form.watch('petId') ? (
            <PrescriptionForm 
              soapNoteId={savedNoteId || 0}
              practiceId={parseInt(userPracticeId || "0") || 0} 
              onPrescriptionCreated={() => {
                setIsPrescriptionFormOpen(false);
                toast({
                  title: "Prescription Added",
                  description: "The prescription has been added to the SOAP note"
                });
              }}
              onCancel={() => setIsPrescriptionFormOpen(false)}
            />
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Pet Required</AlertTitle>
              <AlertDescription>
                Please select a pet before adding a prescription.
              </AlertDescription>
            </Alert>
          )}
        </DialogContent>
      </Dialog>

      {/* Referral Dialog */}
      <Dialog open={showReferralDialog} onOpenChange={setShowReferralDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Referral</DialogTitle>
            <DialogDescription>
              Create a referral to another specialist or practice
            </DialogDescription>
          </DialogHeader>
          
          {form.watch("petId") ? (
            <QuickReferralForm 
              petId={form.watch("petId")}
              open={showReferralDialog}
              onOpenChange={setShowReferralDialog}
              onSuccess={handleAddReferral}
            />
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Pet Required</AlertTitle>
              <AlertDescription>
                Please select a pet before adding a referral.
              </AlertDescription>
            </Alert>
          )}
        </DialogContent>
      </Dialog>

      {/* Follow-up Appointment Dialog */}
      <Dialog open={showFollowUpDialog} onOpenChange={setShowFollowUpDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Follow-up</DialogTitle>
            <DialogDescription>
              Schedule a follow-up appointment for this patient
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="text-center">
              <CalendarPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                You will be redirected to the appointment booking system for this pet.
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowFollowUpDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    const petId = form.watch("petId");
                    if (petId) {
                      // Navigate to admin appointment booking with pre-filled pet ID
                      router.push(`/admin/appointments?petId=${petId}&type=follow-up&soapNoteId=${savedNoteId || ''}`);
                    }
                    setShowFollowUpDialog(false);
                  }}
                  className="flex-1"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Book Appointment
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save as Template Dialog */}
      <Dialog open={showSaveAsTemplateDialog} onOpenChange={setShowSaveAsTemplateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>
              Create a reusable template from this SOAP note
            </DialogDescription>
          </DialogHeader>
          
          <form className="space-y-4 py-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="templateName">Template Name</Label>
                <Input 
                  id="templateName" 
                  value={templateName} 
                  onChange={(e) => setTemplateName(e.target.value)} 
                  placeholder="Enter a name for this template"
                  className="w-full"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="templateDescription">Description (Optional)</Label>
                <Textarea 
                  id="templateDescription" 
                  value={templateDescription} 
                  onChange={(e) => setTemplateDescription(e.target.value)} 
                  placeholder="Enter a description for this template"
                  className="w-full"
                  rows={3}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="templateCategory">Category</Label>
                <Select 
                  value={templateCategory} 
                  onValueChange={setTemplateCategory}
                >
                  <SelectTrigger id="templateCategory">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="examination">Examination</SelectItem>
                    <SelectItem value="procedure">Procedure</SelectItem>
                    <SelectItem value="surgery">Surgery</SelectItem>
                    <SelectItem value="dental">Dental</SelectItem>
                    <SelectItem value="vaccination">Vaccination</SelectItem>
                    <SelectItem value="wellness">Wellness</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="speciesApplicability">Species Applicability (Optional)</Label>
                <MultiSelect
                  options={[
                    { value: "Dog", label: "Dog" },
                    { value: "Cat", label: "Cat" },
                    { value: "Bird", label: "Bird" },
                    { value: "Reptile", label: "Reptile" },
                    { value: "Small Mammal", label: "Small Mammal" },
                    { value: "Exotic", label: "Exotic" }
                  ]}
                  selected={speciesApplicability}
                  onChange={setSpeciesApplicability}
                  placeholder="Select applicable species"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowSaveAsTemplateDialog(false)}
              >
                Cancel
              </Button>
              <Button 
                type="button"
                onClick={handleTemplateSubmit}
                disabled={templateMutation.isPending}
              >
                {templateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Converting...
                  </>
                ) : "Save as Template"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SOAPNoteCreatePage;
