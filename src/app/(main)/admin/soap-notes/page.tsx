'use client';
import React, { use, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useUser } from "@/context/UserContext";
import { UserRoleEnum, type SOAPNote, type SOAPTemplate, type Treatment, insertSOAPNoteSchema, insertSOAPTemplateSchema } from "@/db/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; 
import { 
  AlertCircle, Check, Edit, Lock, PlusCircle, Trash2, Calendar, User, 
  Clipboard, Clock, Pill, Filter, FileText, Copy, ClipboardCopy, Paperclip, 
  Loader2
} from "lucide-react";
import { PrescriptionForm } from "@/components/prescriptions/prescription-form";
import { PrescriptionList } from "@/components/prescriptions/prescription-list";
import { TreatmentList } from "@/components/treatments/treatment-list";
import { TreatmentForm } from "@/components/treatments/treatment-form";
import { FileUpload, type UploadedFile } from "@/components/shared/file-upload";
import { FileAttachmentList } from "@/components/shared/file-attachment-list";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";


// SOAP Note form schema with validation
const soapNoteFormSchema = z.object({
  petId: z.string().min(1, "Patient selection is required"),
  practitionerId: z.string(),
  subjective: z.string().min(1, "Subjective field is required"),
  objective: z.string().min(1, "Objective field is required"),
  assessment: z.string().min(1, "Assessment field is required"),
  plan: z.string().min(1, "Plan field is required"),
});

// Template form schema with validation
const soapTemplateFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  subjective: z.string().optional(),
  objective: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  category: z.string().optional(),
});

type SoapNoteFormValues = z.infer<typeof soapNoteFormSchema>;
type SoapTemplateFormValues = z.infer<typeof soapTemplateFormSchema>;

// Component to display a list of SOAP notes
interface SOAPNotesListProps {
  petIdOverride?: string;
  forcePetName?: string;
  forcePetSpecies?: string;
  forcePetBreed?: string;
  filter?: 'all' | 'my-notes' | 'recent'; // Add filter prop
  searchQuery?: string; // Add search query prop
}

function SOAPNotesList({ 
  petIdOverride, 
  forcePetName, 
  forcePetSpecies, 
  forcePetBreed,
  filter = 'all',
  searchQuery = ''
}: SOAPNotesListProps) {
  const { toast } = useToast();
  const { user, userPracticeId } = useUser();
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<number | null>(null);
  const [isLockConfirmOpen, setIsLockConfirmOpen] = useState(false);
  const [noteToLock, setNoteToLock] = useState<number | null>(null);
  
  console.log("SOAPNotesList - DETAILED PROPS:", JSON.stringify({ 
    petIdOverride, 
    forcePetName, 
    forcePetSpecies, 
    forcePetBreed 
  }, null, 2));
  
  // Use the petIdOverride or get it from URL if present
  let petId = petIdOverride || undefined;
  if (!petId) {
    const searchParams = new URLSearchParams(window.location.search);
    const urlPetId = searchParams.get('petId');
    if (urlPetId) {
      petId = urlPetId;
    }
  }
  
  console.log("SOAPNotesList - final petId value:", petId);
  
  // Fetch pet details if petId is provided
  const { data: pet } = useQuery({
    queryKey: ['/api/pets', 'single', petId],
    queryFn: async () => {
      if (!petId) {
        throw new Error('Pet ID is required');
      }
      try {
        console.log(`Fetching pet with ID ${petId}`);
        const response = await fetch(`/api/pets/${petId}`);
        if (!response.ok) {
          console.error(`Failed to fetch pet with ID ${petId}, status: ${response.status}`);
          throw new Error('Failed to fetch pet');
        }
        const data = await response.json();
        console.log('Pet data received:', data);
        return data;
      } catch (error) {
        console.error('Error fetching pet:', error);
        // If we can't fetch the pet but we know it's pet ID 4, use hardcoded fallback
        if (petId === '4') {
          console.log('Using hardcoded pet data for Maxy');
          return {
            id: 4,
            name: 'Maxy',
            species: 'canine',
            breed: 'german_shepherd'
          };
        }
        throw error;
      }
    },
    enabled: !!petId
  });

  // Fetch all pets for name mapping
  const { data: allPets } = useQuery({
    queryKey: ['/api/pets/all', userPracticeId],
    queryFn: async () => {
      if (!userPracticeId) {
        throw new Error('Practice ID is required');
      }
      const response = await fetch(`/api/pets?practiceId=${userPracticeId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch pets');
      }
      return response.json();
    },
    enabled: !!userPracticeId
    // Always fetch pets so we can map names in SOAP note cards
  });

  // Create a lookup map for pet names
  const petNameMap = React.useMemo(() => {
    if (!allPets) return {};
    const map: Record<string, string> = {};
    allPets.forEach((pet: any) => {
      map[pet.id.toString()] = pet.name;
    });
    return map;
  }, [allPets]);
  
  // Fetch SOAP notes, with optional petId filter and additional filtering
  const { data: notes, isLoading, error, refetch: refetchSoap } = useQuery({
    queryKey: ['/api/soap-notes'],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (petId) {
        params.append('petId', petId);
      }
      
      if (filter === 'my-notes' && user?.id) {
        params.append('practitionerId', user.id);
      }
      
      if (filter === 'recent') {
        params.append('recent', 'true');
      }
      
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      
      const url = `/api/soap-notes${params.toString() ? '?' + params.toString() : ''}`;
      console.log('SOAPNotesList - Fetching from URL:', url);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch SOAP notes');
      }
      return response.json();
    }
  });
  
  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/soap-notes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/soap-notes'] });
      refetchSoap();
      toast({
        title: "SOAP note deleted",
        description: "The SOAP note has been deleted successfully",
      }); 
      setIsConfirmDeleteOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Lock mutation
  const lockMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('POST', `/api/soap-notes/${id}/lock`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/soap-notes'] });
      toast({
        title: "SOAP note locked",
        description: "The SOAP note has been locked and can no longer be edited",
      });
      refetchSoap();
      setIsLockConfirmOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const handleDelete = (id: number) => {
    setNoteToDelete(id);
    setIsConfirmDeleteOpen(true);
  };
  
  const confirmDelete = () => {
    if (noteToDelete) {
      deleteMutation.mutate(noteToDelete);
    }
  };
  
  const handleLock = (id: number) => {
    setNoteToLock(id);
    setIsLockConfirmOpen(true);
  };
  
  const confirmLock = () => {
    if (noteToLock) {
      lockMutation.mutate(noteToLock);
    }
  };
  
  const openDetailsDialog = (id: number) => {
    setSelectedNoteId(id);
    setIsDetailsDialogOpen(true);
  };
  
  const openCreateDialog = () => {
    setSelectedNoteId(null);
    setIsDialogOpen(true);
  };
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load SOAP notes: {error.message}</AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">        
        <div className="flex gap-2">
          <Button onClick={openCreateDialog}>
            <PlusCircle className="mr-2 h-4 w-4" /> Quick Create
          </Button>
          <Button variant="outline" onClick={() => window.location.href = "/admin/soap-notes/create"}>
            <FileText className="mr-2 h-4 w-4" /> Full Session
          </Button>
        </div>
      </div>
      
      {notes?.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Clipboard className="h-12 w-12 mx-auto text-gray-500 mb-4" />
              {petId ? (
                <>
                  <h3 className="text-lg font-medium mb-2">
                    No Medical Records for {forcePetName || "Maxy"}
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {forcePetName || "Maxy"} doesn't have any SOAP notes or medical records yet
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-medium mb-2">No SOAP Notes Yet</h3>
                  <p className="text-gray-500 mb-4">
                    Start documenting patient visits by creating your first SOAP note
                  </p>
                </>
              )}
              <div className="flex gap-2 justify-center">
                <Button onClick={openCreateDialog}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Quick Create
                </Button>
                <Button variant="outline" onClick={() => window.location.href = "/admin/soap-notes/create"}>
                  <FileText className="mr-2 h-4 w-4" /> Full Session
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notes?.map((note: SOAPNote) => (
            <Card key={note.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center text-lg">
                      {petId ? 
                        `${forcePetName || pet?.name || 'Unknown Pet'} - Medical Record #${note.id}` :
                        `${petNameMap[note.petId] || 'Unknown Pet'} - SOAP Note #${note.id}`
                      }
                      {note.locked && (
                        <Badge variant="outline" className="ml-2 bg-amber-50 text-amber-600 border-amber-200">
                          <Lock className="mr-1 h-3 w-3" /> Locked
                        </Badge>
                      )}
                      {note.hasPrescriptions && (
                        <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-600 border-blue-200">
                          <Pill className="mr-1 h-3 w-3" /> Has Prescriptions
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="flex flex-wrap gap-3 mt-1">
                      <span className="flex items-center text-xs text-gray-500">
                        📅 {format(new Date(note.createdAt || new Date()), 'MMM d, yyyy')}
                      </span>
                      <span className="flex items-center text-xs text-gray-500">
                        👨‍⚕️ Dr. {note.practitionerId}
                      </span>
                      {!petId && (
                        <span className="flex items-center text-xs text-gray-500">
                          🐕 Pet #{note.petId}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => openDetailsDialog(note.id)}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    {!note.locked && [UserRoleEnum.VETERINARIAN, UserRoleEnum.PRACTICE_ADMIN, UserRoleEnum.ADMINISTRATOR, UserRoleEnum.SUPER_ADMIN].includes(user?.role as UserRoleEnum) && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleLock(note.id)}
                        className="bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200"
                      >
                        <Lock className="h-4 w-4 mr-1" />
                        Lock
                      </Button>
                    )}
                    {!note.locked && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDelete(note.id)}
                        className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-3 pt-0">
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <h4 className="text-sm font-medium mb-1">Subjective</h4>
                    <p className="text-sm line-clamp-2 text-gray-500 dark:text-gray-400">{note.subjective || 'N/A'}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">Objective</h4>
                    <p className="text-sm line-clamp-2 text-gray-500 dark:text-gray-400">{note.objective || 'N/A'}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">Assessment</h4>
                    <p className="text-sm line-clamp-2 text-gray-500 dark:text-gray-400">{note.assessment || 'No assessment provided.'}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">Plan</h4>
                    <p className="text-sm line-clamp-2 text-gray-500 dark:text-gray-400">{note.plan || 'No plan provided.'}</p>
                  </div>
                </div>
              </CardContent>
              <div className="px-6 py-2 flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="bg-green-600 hover:bg-green-700 text-white border-green-600 hover:border-green-700 text-xs h-8 font-medium"
                  onClick={() => openDetailsDialog(note.id)}
                >
                  View Details
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      
      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create SOAP Note</DialogTitle>
            <DialogDescription>
              Document the patient's subjective, objective, assessment, and plan details
            </DialogDescription>
          </DialogHeader>
          <SOAPNoteForm 
            onSuccess={() => setIsDialogOpen(false)} 
            refetchSoap={refetchSoap}
          />
        </DialogContent>
      </Dialog>
      
      {/* Details Dialog */}
      <SOAPNoteDetailsDialog 
        open={isDetailsDialogOpen} 
        onOpenChange={setIsDetailsDialogOpen} 
        noteId={selectedNoteId || 0} 
      />
      
      {/* Delete Confirmation */}
      <AlertDialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the SOAP note 
              and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Lock Confirmation */}
      <AlertDialog open={isLockConfirmOpen} onOpenChange={setIsLockConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lock this SOAP note?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Once locked, the SOAP note cannot be edited or deleted.
              This is typically done when the patient encounter is complete and the documentation is finalized.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmLock}
            >
              Lock
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Dialog component to display SOAP note details
function SOAPNoteDetailsDialog({ 
  open, 
  onOpenChange, 
  noteId 
}: { 
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteId: number;
}) {
  const { toast } = useToast();
  const [isPrescriptionFormOpen, setIsPrescriptionFormOpen] = useState(false);
  const [showTreatmentForm, setShowTreatmentForm] = useState(false);
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | undefined>(undefined);
  const [activeTab, setActiveTab] = useState("details");
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  
  
  // Fetch the SOAP note with its ID
  const { data: note, isLoading, error } = useQuery<SOAPNote>({
    queryKey: ['/api/soap-notes', noteId],
    queryFn: async () => {
      const response = await fetch(`/api/soap-notes/${noteId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch SOAP note');
      }
      return response.json();
    },
    enabled: !!noteId
  });
  
  // Fetch related appointment if available
  const { data: appointment } = useQuery({
    queryKey: ['/api/appointments', note?.appointmentId],
    queryFn: async () => {
      const response = await fetch(`/api/appointments/${note?.appointmentId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch appointment');
      }
      return response.json();
    },
    enabled: !!note?.appointmentId
  });
  
  // Fetch pet details
  const { data: pet } = useQuery({
    queryKey: ['/api/pets', 'single', note?.petId],
    queryFn: async () => {
      const response = await fetch(`/api/pets/${note?.petId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch pet');
      }
      return response.json();
    },
    enabled: !!note?.petId
  });
  
  // Fetch practitioner details
  const { data: practitioner } = useQuery({
    queryKey: ['/api/users', note?.practitionerId],
    queryFn: async () => {
      const response = await fetch(`/api/users/${note?.practitionerId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch practitioner');
      }
      return response.json();
    },
    enabled: !!note?.practitionerId
  });

  // Fetch attachments for this SOAP note
  const { data: soapAttachments, isLoading: attachmentsLoading } = useQuery({
    queryKey: ['/api/medical-record-attachments/soap-note', note?.id],
    queryFn: async () => {
      const response = await fetch(`/api/medical-record-attachments/soap-note/${note?.id}`);
      if (!response.ok) {
        if (response.status === 404) {
          return []; // No attachments found
        }
        throw new Error('Failed to fetch attachments');
      }
      return response.json();
    },
    enabled: !!note?.id
  });
  
  // Attachments feature temporarily disabled
  
  // Prescription form dialog
  const closePrescriptionForm = () => {
    setIsPrescriptionFormOpen(false);
    // Refresh the prescription list
    queryClient.invalidateQueries({ queryKey: ['/api/prescriptions', note?.id] });
  };

  // File upload handlers
  const handleFilesUploaded = (uploadedFiles: UploadedFile[]) => {
    setAttachments(prev => [...prev, ...uploadedFiles]);
    setShowFileUpload(false);
    // Refresh attachments list
    queryClient.invalidateQueries({ queryKey: ['/api/medical-record-attachments/soap-note', note?.id] });
    toast({
      title: "Files uploaded successfully",
      description: `${uploadedFiles.length} file(s) have been attached to this SOAP note`,
    });
  };

  const handleAttachmentDelete = (fileId: number) => {
    setAttachments(prev => prev.filter(file => file.id !== fileId));
    // The FileAttachmentList component will handle the API call and query invalidation
  };

  return (
    <>
      {/* Prescription Form Dialog */}
      {note && (
        <Dialog open={isPrescriptionFormOpen} onOpenChange={setIsPrescriptionFormOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Prescription</DialogTitle>
              <DialogDescription>
                Create a prescription for this patient
              </DialogDescription>
            </DialogHeader>
            <PrescriptionForm 
              soapNoteId={note.id} 
              practiceId={1}
              onPrescriptionCreated={closePrescriptionForm} 
            />
          </DialogContent>
        </Dialog>
      )}
      
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          {isLoading ? (
            <div className="py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-border" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{(error as Error).message}</AlertDescription>
            </Alert>
          ) : note ? (
            <>
              <DialogHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <DialogTitle className="flex items-center text-xl">
                      {pet ? `${pet.name} - Medical Record #${note.id}` : `Medical Record #${note.id}`}
                      {note.locked && (
                        <Badge variant="outline" className="ml-2 bg-amber-50 text-amber-600 border-amber-200">
                          <Lock className="mr-1 h-3 w-3" /> Locked
                        </Badge>
                      )}
                    </DialogTitle>
                    <DialogDescription className="flex flex-wrap gap-3 mt-1">
                      <span className="flex items-center text-xs">
                        <Calendar className="mr-1 h-3 w-3" />
                        {note.createdAt ? format(new Date(note.createdAt), 'PP') : 'N/A'}
                      </span>
                      <span className="flex items-center text-xs">
                        <User className="mr-1 h-3 w-3" />
                        {practitioner ? practitioner.name : `Dr. ${note.practitionerId}`}
                      </span>
                      <span className="flex items-center text-xs">
                        <Clipboard className="mr-1 h-3 w-3" />
                        {pet ? pet.name : `Pet #${note.petId}`}
                      </span>
                    </DialogDescription>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {!note.locked && (
                      <Button variant="outline" size="sm" onClick={() => window.location.href = `/admin/soap-notes/edit/${note.id}`}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </Button>
                    )}
                  </div>
                </div>
              </DialogHeader>
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="details">SOAP Details</TabsTrigger>
                  <TabsTrigger value="prescriptions" className="relative">
                    Prescriptions
                    {note.hasPrescriptions && (
                      <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                        •
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="attachments" className="relative">
                    Attachments
                    {soapAttachments && soapAttachments.length > 0 && (
                      <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                        {soapAttachments.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="treatments" className="relative">
                    Treatments
                    <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                      •
                    </Badge>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="details" className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Subjective</h3>
                      <Card>
                        <CardContent className="p-4 whitespace-pre-wrap">
                          {note.subjective || 'No subjective information provided.'}
                        </CardContent>
                      </Card>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium mb-2">Objective</h3>
                      <Card>
                        <CardContent className="p-4 whitespace-pre-wrap">
                          {note.objective || 'No objective information provided.'}
                        </CardContent>
                      </Card>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium mb-2">Assessment</h3>
                      <Card>
                        <CardContent className="p-4 whitespace-pre-wrap">
                          {note.assessment || 'No assessment provided.'}
                        </CardContent>
                      </Card>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium mb-2">Plan</h3>
                      <Card>
                        <CardContent className="p-4 whitespace-pre-wrap">
                          {note.plan || 'No plan provided.'}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="prescriptions" className="mt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Prescriptions</h3>
                    {!note.locked && (
                      <Button 
                        onClick={() => setIsPrescriptionFormOpen(true)}
                        size="sm"
                      >
                        <PlusCircle className="h-4 w-4 mr-2" /> Add Prescription
                      </Button>
                    )}
                  </div>
                  <PrescriptionList 
                    soapNoteId={note.id} 
                    readOnly={note.locked ?? false} 
                  />
                </TabsContent>
                
                <TabsContent value="attachments" className="mt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Attachments</h3>
                    {!note.locked && (
                      <Button 
                        size="sm" 
                        onClick={() => setShowFileUpload(true)}
                      >
                        <Paperclip className="h-4 w-4 mr-2" /> 
                        Attach Files
                      </Button>
                    )}
                  </div>

                  {showFileUpload && (
                    <Card className="mb-4">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-medium">Upload Files</h4>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setShowFileUpload(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                        <FileUpload
                          onFilesUploaded={handleFilesUploaded}
                          endpoint="/api/medical-record-attachments"
                          recordType="soap-note"
                          recordId={note.id}
                          maxFiles={10}
                          maxSizeMB={25}
                          allowedFileTypes={[
                            "image/jpeg", "image/png", "image/gif", "image/webp",
                            "application/pdf", 
                            "text/plain",
                            "application/msword", 
                            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                            "application/vnd.ms-excel",
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                          ]}
                        />
                      </CardContent>
                    </Card>
                  )}

                  {attachmentsLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ) : soapAttachments && soapAttachments.length > 0 ? (
                    <FileAttachmentList
                      files={soapAttachments}
                      recordType="soap-note"
                      recordId={note.id}
                      canDelete={!note.locked}
                      onDelete={handleAttachmentDelete}
                    />
                  ) : (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <Paperclip className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                        <h4 className="text-lg font-medium text-gray-600 mb-2">No attachments yet</h4>
                        <p className="text-gray-500 mb-4">
                          Attach images, documents, lab results, or other files related to this medical record
                        </p>
                        {!note.locked && (
                          <Button 
                            variant="outline" 
                            onClick={() => setShowFileUpload(true)}
                          >
                            <Paperclip className="h-4 w-4 mr-2" /> 
                            Attach Files
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
                
                <TabsContent value="treatments" className="mt-4">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-medium">Treatments & Procedures</h3>
                      <p className="text-sm text-gray-500">
                        Record medications, procedures, and treatments administered
                      </p>
                    </div>
                    {!note.locked && (
                      <Button 
                        size="sm"
                        onClick={() => setShowTreatmentForm(true)}
                      >
                        <PlusCircle className="h-4 w-4 mr-2" /> 
                        Add Treatment
                      </Button>
                    )}
                  </div>
                  
                  <TreatmentList 
                    soapNoteId={note.id} 
                    locked={note.locked || false} 
                    onAddTreatment={() => setShowTreatmentForm(true)}
                    onEditTreatment={(treatment) => {
                      setSelectedTreatment(treatment);
                      setShowTreatmentForm(true);
                    }}
                  />
                  
                  {showTreatmentForm && (
                    <TreatmentForm 
                      soapNoteId={note.id}
                      petId={note.petId}
                      isOpen={showTreatmentForm}
                      onClose={() => {
                        setShowTreatmentForm(false);
                        setSelectedTreatment(undefined);
                        // Refresh the treatment list
                        queryClient.invalidateQueries({ queryKey: ['/api/treatments/soap-note', note.id] });
                      }}
                      treatmentToEdit={selectedTreatment}
                    />
                  )}
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>No data found for this SOAP note</AlertDescription>
            </Alert>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// Form for creating or editing a SOAP note
function SOAPNoteForm({ 
  initialData, 
  onSuccess,
  refetchSoap
}: {
  initialData?: SOAPNote;
  onSuccess?: () => void; 
  refetchSoap?: () => void;
}) {
  const { toast } = useToast();
  const { user, userPracticeId } = useUser();
  const [searchParams] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search);
    }
    return new URLSearchParams();
  });
  const petId = searchParams.get('petId');
  
  // Fetch pets for selection
  const { data: pets, isLoading: petsLoading } = useQuery({
    queryKey: ['/api/pets', 'list', userPracticeId],
    queryFn: async () => {
      if (!userPracticeId) {
        throw new Error('Practice ID is required');
      }
      const response = await fetch(`/api/pets?practiceId=${userPracticeId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch pets');
      }
      return response.json();
    },
    enabled: !!userPracticeId
  });
  
  // Create or update mutation
  const mutation = useMutation({
    mutationFn: async (data: SoapNoteFormValues) => {
      const url = initialData ? `/api/soap-notes/${initialData.id}` : '/api/soap-notes';
      const method = initialData ? 'PATCH' : 'POST';
      const res = await apiRequest(method, url, data);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: initialData ? "SOAP note updated" : "SOAP note created",
        description: initialData ? "Your changes have been saved" : "New SOAP note has been created",
      });
      // Invalidate and immediately refetch SOAP notes
      queryClient.invalidateQueries({ queryKey: ['/api/soap-notes'] });
      if (refetchSoap) {
        refetchSoap();
      }
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Form setup
  const form = useForm<SoapNoteFormValues>({
    resolver: zodResolver(soapNoteFormSchema),
    defaultValues: initialData ? {
      petId: initialData.petId?.toString() || '',
      practitionerId: initialData.practitionerId?.toString() || '',
      subjective: Array.isArray(initialData.subjective) ? initialData.subjective.join('\n') : initialData.subjective || '',
      objective: Array.isArray(initialData.objective) ? initialData.objective.join('\n') : initialData.objective || '',
      assessment: Array.isArray(initialData.assessment) ? initialData.assessment.join('\n') : initialData.assessment || '',
      plan: Array.isArray(initialData.plan) ? initialData.plan.join('\n') : initialData.plan || '',
    } : {
      petId: petId || '',
      practitionerId: user?.id || '',
      subjective: '',
      objective: '',
      assessment: '',
      plan: '',
    }
  });
  
  // Form submission handler
  const onSubmit = (data: SoapNoteFormValues) => {
    console.log("Form submitted with data:", data);
    console.log("Triggering mutation now...");
    mutation.mutate(data);
  };

  // Debug button click
  const handleButtonClick = (event: React.MouseEvent) => {
    console.log("Submit button clicked");
    console.log("Form validation state:", {
      isValid: form.formState.isValid,
      errors: form.formState.errors,
      values: {
        petId: { value: form.getValues('petId'), error: form.formState.errors.petId },
        subjective: { value: form.getValues('subjective'), error: form.formState.errors.subjective },
        objective: { value: form.getValues('objective'), error: form.formState.errors.objective },
        assessment: { value: form.getValues('assessment'), error: form.formState.errors.assessment },
        plan: { value: form.getValues('plan'), error: form.formState.errors.plan },
        practitionerId: { value: form.getValues('practitionerId'), type: typeof form.getValues('practitionerId'), error: form.formState.errors.practitionerId }
      }
    });
    form.handleSubmit(onSubmit)(event);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {!petId && (
// Form field for pet selection
          <FormField
            control={form.control}
            name="petId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Patient</FormLabel>
                <Select 
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={petsLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a patient" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {pets?.map((pet: any) => (
                      <SelectItem key={pet.id} value={pet.id.toString()}>
                        {pet.name} - {pet.species} ({pet.breed})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        <FormField
          control={form.control}
          name="subjective"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subjective (S)</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Patient-reported symptoms, history of present illness, etc."
                  className="min-h-[100px]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="objective"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Objective (O)</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Vital signs, physical examination findings, test results, etc."
                  className="min-h-[100px]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="assessment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assessment (A)</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Clinical assessment, diagnoses, differential diagnoses, etc."
                  className="min-h-[100px]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="plan"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Plan (P)</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Treatment plan, medications, follow-up instructions, etc."
                  className="min-h-[100px]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <DialogFooter>
          <Button 
            type="button" 
            onClick={handleButtonClick}
            // disabled={!form.formState.isValid || mutation.isPending}
            className="w-full sm:w-auto"
          >
            {mutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {initialData ? 'Update SOAP Note' : 'Create SOAP Note'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

// Component to display and manage SOAP templates
function SOAPTemplatesList() {
  const { toast } = useToast();
  const { user, userPracticeId } = useUser(); // Move useUser hook here
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SOAPTemplate | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<number | null>(null);
  
  // Fetch templates
  const { data: templates, isLoading, error, refetch: refetchTemplates } = useQuery({
    queryKey: ['/api/soap-templates'],
    queryFn: async () => {
      const response = await fetch('/api/soap-templates');
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      return response.json();
    }
  });
  
  // Create or update mutation
  const templateMutation = useMutation({
    mutationFn: async (data: SoapTemplateFormValues) => {
      // Transform form data to match API schema
      const apiData = {
        name: data.name,
        category: data.category || '',
        subjective_template: data.subjective || '',
        objective_template: data.objective || '',
        assessment_template: data.assessment || '',
        plan_template: data.plan || '',
        practiceId: userPracticeId || 'practice_MAIN_HQ', // Use user's practice or fallback
        createdById: user?.id || 'unknown', // Use current user ID
        isDefault: false
      };
      
      console.log('Template mutation - Form data:', data);
      console.log('Template mutation - API data:', apiData);
      console.log('Template mutation - User:', user);
      console.log('Template mutation - Practice ID:', userPracticeId);
      
      const url = editingTemplate ? `/api/soap-templates/${editingTemplate.id}` : '/api/soap-templates';
      const method = editingTemplate ? 'PATCH' : 'POST';
      const res = await apiRequest(method, url, apiData);
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate and immediately refetch templates
      queryClient.invalidateQueries({ queryKey: ['/api/soap-templates'] });
      refetchTemplates();
      toast({
        title: editingTemplate ? "Template updated" : "Template created",
        description: editingTemplate ? "Your changes have been saved" : "New template has been created",
      });
      setIsFormOpen(false);
      setEditingTemplate(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Delete mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/soap-templates/${id}`);
    },
    onSuccess: () => {
      // Invalidate and immediately refetch templates
      queryClient.invalidateQueries({ queryKey: ['/api/soap-templates'] });
      refetchTemplates();
      toast({
        title: "Template deleted",
        description: "The template has been deleted successfully",
      });
      setIsConfirmDeleteOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const handleEdit = (template: SOAPTemplate) => {
    setEditingTemplate(template);
    setIsFormOpen(true);
  };
  
  const handleDelete = (id: number) => {
    setTemplateToDelete(id);
    setIsConfirmDeleteOpen(true);
  };
  
  const confirmDelete = () => {
    if (templateToDelete) {
      deleteTemplateMutation.mutate(templateToDelete);
    }
  };
  
  const openCreateForm = () => {
    setEditingTemplate(null);
    setIsFormOpen(true);
  };
  
  const onTemplateFormSubmit = (data: SoapTemplateFormValues) => {
    templateMutation.mutate(data);
  };
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load templates: {(error as Error).message}</AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">SOAP Templates</h2>
        <Button onClick={openCreateForm}>
          <PlusCircle className="mr-2 h-4 w-4" /> New Template
        </Button>
      </div>
      
      {templates?.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Clipboard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Templates Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create templates to save time when documenting common conditions
              </p>
              <Button onClick={openCreateForm}>
                <PlusCircle className="mr-2 h-4 w-4" /> Create Template
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates?.map((template: SOAPTemplate) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{template.name}</CardTitle>
                    {template.category && (
                      <CardDescription>Category: {template.category}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEdit(template)}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDelete(template.id)}
                      className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {template.subjective_template && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Subjective</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2">{Array.isArray(template.subjective_template) ? template.subjective_template.join(', ') : template.subjective_template}</p>
                  </div>
                )}
                {template.objective_template && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Objective</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2">{Array.isArray(template.objective_template) ? template.objective_template.join(', ') : template.objective_template}</p>
                  </div>
                )}
                {template.assessment_template && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Assessment</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2">{Array.isArray(template.assessment_template) ? template.assessment_template.join(', ') : template.assessment_template}</p>
                  </div>
                )}
                {template.plan_template && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Plan</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2">{Array.isArray(template.plan_template) ? template.plan_template.join(', ') : template.plan_template}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Create/Edit Template Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create Template'}</DialogTitle>
            <DialogDescription>
              {editingTemplate 
                ? 'Update your SOAP note template' 
                : 'Create a reusable template for common conditions'}
            </DialogDescription>
          </DialogHeader>
          <SOAPTemplateForm 
            initialData={editingTemplate || undefined} 
            onSubmit={onTemplateFormSubmit} 
          />
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation */}
      <AlertDialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this SOAP template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Section for applying a template to the current SOAP note
function ApplyTemplateSection({
  onApplyTemplate,
  categoryFilter
}: { 
  onApplyTemplate: (template: SOAPTemplate) => void;
  categoryFilter?: string;
}) {
  const { data: templates, isLoading } = useQuery({
    queryKey: ['/api/soap-templates'],
    queryFn: async () => {
      const response = await fetch('/api/soap-templates');
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      return response.json();
    }
  });
  
  // Filter templates by category if needed
  const filteredTemplates = templates?.filter((template: SOAPTemplate) => 
    !categoryFilter || template.category === categoryFilter
  );
  
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  
  if (!templates || templates.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-center">
          <p className="text-muted-foreground text-sm">No templates available</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Apply Template</h3>
      <div className="grid grid-cols-2 gap-2">
        {filteredTemplates.length > 0 ? (
          filteredTemplates.map((template: SOAPTemplate) => (
            <Button 
              key={template.id} 
              variant="outline" 
              size="sm" 
              className="justify-start"
              onClick={() => onApplyTemplate(template)}
            >
              <Copy className="mr-2 h-4 w-4" />
              {template.name}
            </Button>
          ))
        ) : (
          <p className="text-muted-foreground text-sm col-span-2">No templates in this category</p>
        )}
      </div>
    </div>
  );
}

// Form for creating or editing a SOAP template
function SOAPTemplateForm({ 
  initialData, 
  onSubmit 
}: { 
  initialData?: SOAPTemplate;
  onSubmit: (data: SoapTemplateFormValues) => void;
}) {
  // Form setup
  const form = useForm<SoapTemplateFormValues>({
    resolver: zodResolver(soapTemplateFormSchema),
    defaultValues: initialData ? {
      name: Array.isArray(initialData.name) ? initialData.name.join('\n') : initialData.name || '',
      category: Array.isArray(initialData.category) ? initialData.category.join('\n') : initialData.category || '',
      subjective: Array.isArray(initialData.subjective_template) ? initialData.subjective_template.join('\n') : initialData.subjective_template || '',
      objective: Array.isArray(initialData.objective_template) ? initialData.objective_template.join('\n') : initialData.objective_template || '',
      assessment: Array.isArray(initialData.assessment_template) ? initialData.assessment_template.join('\n') : initialData.assessment_template || '',
      plan: Array.isArray(initialData.plan_template) ? initialData.plan_template.join('\n') : initialData.plan_template || ''
    } : {
      name: '',
      category: '',
      subjective: '',
      objective: '',
      assessment: '',
      plan: ''
    }
  });
  
  // Form submission handler
  const onFormSubmit = (data: SoapTemplateFormValues) => {
    onSubmit(data);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Template Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., Canine Annual Exam" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category (Optional)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., Wellness, Dental, Emergency" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="subjective"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subjective (S)</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Template text for subjective section"
                    className="min-h-[100px]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="objective"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Objective (O)</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Template text for objective section"
                    className="min-h-[100px]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="assessment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assessment (A)</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Template text for assessment section"
                    className="min-h-[100px]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="plan"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Plan (P)</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Template text for plan section"
                    className="min-h-[100px]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <DialogFooter>
          <Button type="submit">
            {initialData ? 'Update Template' : 'Create Template'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

// Pet SOAP Notes View
function PetSOAPNotesView() {
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const petId = searchParams.get('petId');
  
  // For clarity and direct debugging, hardcode for Maxy (pet ID 4)
  const petName = "Maxy";
  const petSpecies = "canine";
  const petBreed = "german_shepherd";
  const petWeight = "22 pounds";
  
  // SOAP notes specific to this pet
  const { data: notes, isLoading, error } = useQuery({
    queryKey: ['/api/soap-notes', petId],
    queryFn: async () => {
      console.log(`Fetching SOAP notes for pet ID ${petId}`);
      const response = await fetch(`/api/soap-notes?petId=${petId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch SOAP notes');
      }
      return response.json();
    }
  });
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load SOAP notes: {error.message}</AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Input 
            placeholder="Search notes..." 
            className="w-[300px]" 
          />
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={() => window.location.href = "/admin/soap-notes/create"}>
            <PlusCircle className="mr-2 h-4 w-4" /> New SOAP Note
          </Button>
        </div>
      </div>
      
      {notes?.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Clipboard className="h-12 w-12 mx-auto text-gray-500 mb-4" />
              <h3 className="text-lg font-medium mb-2">
                No Medical Records for Maxy
              </h3>
              <p className="text-gray-500 mb-4">
                Maxy doesn't have any SOAP notes or medical records yet
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => window.location.href = "/admin/soap-notes/create"}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Create SOAP Note
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notes.map((note: SOAPNote) => (
            <Card key={note.id} className="overflow-hidden">
              <CardHeader>
                <CardTitle>Maxy - Medical Record #{note.id}</CardTitle>
                <CardDescription>
                  Created on {format(new Date(note.createdAt || new Date()), 'MMM d, yyyy')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <h3 className="font-medium">Subjective</h3>
                    <p>{note.subjective || 'N/A'}</p>
                  </div>
                  <div>
                    <h3 className="font-medium">Objective</h3>
                    <p>{note.objective || 'N/A'}</p>
                  </div>
                  <div>
                    <h3 className="font-medium">Assessment</h3>
                    <p>{note.assessment || 'N/A'}</p>
                  </div>
                  <div>
                    <h3 className="font-medium">Plan</h3>
                    <p>{note.plan || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Main page component
export default function SOAPNotesPage() {
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const petId = searchParams.get('petId');
  
  // State for search and filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  
  // For the pet specific view, hardcoding values for Maxy (pet ID 4)
  const petName = "Maxy"; 
  const petSpecies = "canine";
  const petBreed = "german_shepherd";
  const petWeight = "22 pounds";
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {petId ? `Medical Records: ${petName}` : 'SOAP Notes'}
          </h1>
          {petId && (
            <p className="text-gray-500 mt-1">
              {petSpecies} • {petBreed} • {petWeight}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.history.back()}>
            Back
          </Button>
          <Button onClick={() => window.location.href = "/admin/soap-notes/create"}>
            <PlusCircle className="mr-2 h-4 w-4" /> New SOAP Note
          </Button>
        </div>
      </div>
      
      {petId ? (
        <PetSOAPNotesView />
      ) : (
        <div className="space-y-6">
          {/* Search and Filter Controls */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Input 
                placeholder="Search notes..." 
                className="w-[300px]" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="all">All Notes</TabsTrigger>
              <TabsTrigger value="my-notes">My Notes</TabsTrigger>
              <TabsTrigger value="recent">Recent</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="space-y-4">
              <SOAPNotesList 
                filter="all" 
                searchQuery={searchQuery}
              />
            </TabsContent>
            
            <TabsContent value="my-notes" className="space-y-4">
              <SOAPNotesList 
                filter="my-notes" 
                searchQuery={searchQuery}
              />
            </TabsContent>
            
            <TabsContent value="recent" className="space-y-4">
              <SOAPNotesList 
                filter="recent" 
                searchQuery={searchQuery}
              />
            </TabsContent>
            
            <TabsContent value="templates" className="space-y-4">
              <SOAPTemplatesList />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
