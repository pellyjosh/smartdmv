'use client';
import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import PageHeader from "@/components/page-header";
import Breadcrumbs from "@/components/breadcrumbs";
import LoadingSpinner from "@/components/loading-spinner";
import { Calendar, FileImage, FileX, ImageIcon, Upload, Plus } from "lucide-react";
import ImagingViewer from "@/components/medical-imaging/imaging-viewer";
import { apiRequest } from "@/lib/queryClient";

// Validation schema for new medical imaging record
const createMedicalImagingSchema = z.object({
  petId: z.string().min(1, "Please select a pet"),
  studyDate: z.string(),
  studyType: z.string().min(1, "Please select a study type"),
  description: z.string().optional(),
  veterinarianId: z.string().min(1, "Please select a veterinarian")
});

// Validation schema for new imaging series
const createImagingSeriesSchema = z.object({
  modality: z.string(),
  description: z.string().optional(),
  bodyPart: z.string().optional(),
  medicalImagingId: z.string()
});

const MedicalImagingPage: React.FC = () => {
  const params = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMedicalImaging, setSelectedMedicalImaging] = useState<string | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isNewStudyDialogOpen, setIsNewStudyDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Parse pet ID from URL if available
  const petId = params.petId ? parseInt(params.petId as string) : undefined;
  
  // Query to get pet data if pet ID is available
  const { data: pet, isLoading: isPetLoading } = useQuery({
    queryKey: ['/api/pets', petId],
    queryFn: async () => {
      if (!petId) return null;
      const response = await fetch(`/api/pets/${petId}`);
      if (!response.ok) throw new Error("Failed to fetch pet data");
      return response.json();
    },
    enabled: !!petId
  });
  
  // Query to get all medical imaging studies
  const { 
    data: medicalImaging,
    isLoading: isMedicalImagingLoading,
    isError: isMedicalImagingError
  } = useQuery({
    queryKey: petId ? ['/api/medical-imaging/pet', petId] : ['/api/medical-imaging'],
    queryFn: async () => {
      const url = petId ? `/api/medical-imaging/pet/${petId}` : `/api/medical-imaging`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch medical imaging data");
      return response.json();
    }
  });
  
  // Query to get all series for the selected medical imaging
  const {
    data: imagingSeries,
    isLoading: isSeriesLoading,
    isError: isSeriesError
  } = useQuery({
    queryKey: ['/api/medical-imaging', selectedMedicalImaging, 'series'],
    queryFn: async () => {
      if (!selectedMedicalImaging) return [];
      const response = await fetch(`/api/medical-imaging/${selectedMedicalImaging}/series`);
      if (!response.ok) throw new Error("Failed to fetch imaging series data");
      return response.json();
    },
    enabled: !!selectedMedicalImaging
  });
  
  // Query to get annotations for selected series
  const {
    data: annotations,
    isLoading: isAnnotationsLoading
  } = useQuery({
    queryKey: ['/api/imaging-series', selectedSeries, 'annotations'],
    queryFn: async () => {
      if (!selectedSeries) return [];
      const response = await fetch(`/api/imaging-series/${selectedSeries}/annotations`);
      if (!response.ok) throw new Error("Failed to fetch annotations");
      return response.json();
    },
    enabled: !!selectedSeries
  });
  
  // Query to get measurements for selected series
  const {
    data: measurements,
    isLoading: isMeasurementsLoading
  } = useQuery({
    queryKey: ['/api/imaging-series', selectedSeries, 'measurements'],
    queryFn: async () => {
      if (!selectedSeries) return [];
      const response = await fetch(`/api/imaging-series/${selectedSeries}/measurements`);
      if (!response.ok) throw new Error("Failed to fetch measurements");
      return response.json();
    },
    enabled: !!selectedSeries
  });
  
  // Query to get all veterinarians for dropdown
  const {
    data: veterinarians,
    isLoading: isVeterinariansLoading
  } = useQuery({
    queryKey: ['/api/veterinarians'],
    queryFn: async () => {
      const response = await fetch('/api/users/veterinarians');
      if (!response.ok) throw new Error("Failed to fetch veterinarians");
      return response.json();
    }
  });

  // Query to get all pets for dropdown
  const {
    data: pets,
    isLoading: isPetsLoading
  } = useQuery({
    queryKey: ['/api/pets'],
    queryFn: async () => {
      const response = await fetch('/api/pets');
      if (!response.ok) throw new Error("Failed to fetch pets");
      return response.json();
    }
  });
  
  // Form for creating a new medical imaging study
  const newStudyForm = useForm<z.infer<typeof createMedicalImagingSchema>>({
    resolver: zodResolver(createMedicalImagingSchema),
    defaultValues: {
      petId: petId?.toString() || "",
      studyDate: format(new Date(), 'yyyy-MM-dd'),
      studyType: "",
      description: "",
      veterinarianId: ""
    }
  });
  
  // Form for adding a new series to an imaging study
  const newSeriesForm = useForm<z.infer<typeof createImagingSeriesSchema>>({
    resolver: zodResolver(createImagingSeriesSchema),
    defaultValues: {
      modality: "",
      description: "",
      bodyPart: "",
      medicalImagingId: selectedMedicalImaging || ""
    }
  });
  
  // Update the medicalImagingId when selectedMedicalImaging changes
  useEffect(() => {
    if (selectedMedicalImaging) {
      newSeriesForm.setValue('medicalImagingId', selectedMedicalImaging);
    }
  }, [selectedMedicalImaging, newSeriesForm]);
  
  // Mutation for creating a new medical imaging record
  const createMedicalImagingMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createMedicalImagingSchema>) => {
      const response = await fetch("/api/medical-imaging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          petId: data.petId,
          practiceId: "default-practice", // You might want to get this from context
          imagingType: data.studyType,
          anatomicalRegion: "other", // Default value
          studyName: data.studyType,
        }),
      });
      if (!response.ok) throw new Error("Failed to create medical imaging record");
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate the appropriate query based on whether we have a petId
      if (petId) {
        queryClient.invalidateQueries({ queryKey: ['/api/medical-imaging/pet', petId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['/api/medical-imaging'] });
      }
      setSelectedMedicalImaging(data.id);
      setIsNewStudyDialogOpen(false);
      newStudyForm.reset();
      toast({
        title: "Success",
        description: "New imaging study created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create new imaging study",
        variant: "destructive",
      });
    }
  });
  
  // Mutation for uploading a new series image
  const uploadSeriesImageMutation = useMutation({
    mutationFn: async (data: { file: File, formData: z.infer<typeof createImagingSeriesSchema> }) => {
      if (!selectedMedicalImaging) throw new Error("No medical imaging selected");
      
      const formData = new FormData();
      formData.append('imageFile', data.file);
      formData.append('data', JSON.stringify(data.formData));
      
      const response = await fetch(`/api/medical-imaging/${data.formData.medicalImagingId}/series`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error("Failed to upload image");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/medical-imaging', selectedMedicalImaging, 'series'] });
      setSelectedSeries(data.id);
      setIsUploadDialogOpen(false);
      setSelectedFile(null);
      toast({
        title: "Success",
        description: "New imaging series uploaded successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to upload imaging series",
        variant: "destructive",
      });
    }
  });
  
  // Handle new annotation added
  const handleAnnotationAdded = (annotation: any) => {
    queryClient.invalidateQueries({ queryKey: ['/api/imaging-series', selectedSeries, 'annotations'] });
    toast({
      title: "Annotation Added",
      description: "The annotation has been saved successfully",
    });
  };
  
  // Handle new measurement added
  const handleMeasurementAdded = (measurement: any) => {
    queryClient.invalidateQueries({ queryKey: ['/api/imaging-series', selectedSeries, 'measurements'] });
    toast({
      title: "Measurement Added",
      description: "The measurement has been saved successfully",
    });
  };
  
  // Handles file selection for image upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };
  
  // Handles submission of new medical imaging study form
  const onSubmitNewStudy = (data: z.infer<typeof createMedicalImagingSchema>) => {
    createMedicalImagingMutation.mutate(data);
  };
  
  // Handles submission of new series form
  const onSubmitNewSeries = (data: z.infer<typeof createImagingSeriesSchema>) => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please select an image file first",
        variant: "destructive",
      });
      return;
    }
    
    uploadSeriesImageMutation.mutate({ file: selectedFile, formData: data });
  };
  
  // Loading state
  if (isPetLoading) {
    return <LoadingSpinner />;
  }
  
  return (
    <div className="container mx-auto p-4 space-y-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Clients", href: "/clients" },
          pet && { label: pet.name, href: `/clients/${pet.ownerId}/pets/${pet.id}` },
          { label: "Medical Imaging", href: `/pets/${petId}/medical-imaging` }
        ]}
      />
      
      <PageHeader
        title={pet ? `${pet.name}'s Medical Imaging` : "Medical Imaging"}
        description="View and manage diagnostic imaging studies"
        actions={
          <Button onClick={() => setIsNewStudyDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Imaging Study
          </Button>
        }
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left sidebar - List of imaging studies */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Imaging Studies</CardTitle>
            <CardDescription>Select a study to view its series</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isMedicalImagingLoading ? (
              <LoadingSpinner />
            ) : isMedicalImagingError ? (
              <div className="text-red-500">Failed to load imaging studies</div>
            ) : medicalImaging?.length === 0 ? (
              <div className="text-center p-6 bg-muted/50 rounded-lg">
                <FileX className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No imaging studies found</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setIsNewStudyDialogOpen(true)}
                >
                  Create First Study
                </Button>
              </div>
            ) : (
              <Accordion
                type="single"
                collapsible
                value={selectedMedicalImaging || undefined}
                onValueChange={(value) => setSelectedMedicalImaging(value || null)}
              >
                {medicalImaging?.map((study: any) => (
                  <AccordionItem value={study.id.toString()} key={study.id}>
                    <AccordionTrigger>
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-medium">{study.studyType}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(study.studyDate), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pt-2">
                        <p className="text-sm">{study.description}</p>
                        <div className="flex justify-end">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedMedicalImaging(study.id);
                              setIsUploadDialogOpen(true);
                            }}
                          >
                            <Upload className="h-4 w-4 mr-1" /> Add Series
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>
        
        {/* Main content - Series list and viewer */}
        <div className="lg:col-span-2 space-y-4">
          {/* Series thumbnails */}
          <Card>
            <CardHeader>
              <CardTitle>Image Series</CardTitle>
              <CardDescription>
                {selectedMedicalImaging 
                  ? "Select a series to view detailed images" 
                  : "Select an imaging study from the left panel"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedMedicalImaging ? (
                <div className="text-center p-6 bg-muted/50 rounded-lg">
                  <FileImage className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Please select an imaging study</p>
                </div>
              ) : isSeriesLoading ? (
                <LoadingSpinner />
              ) : isSeriesError ? (
                <div className="text-red-500">Failed to load series data</div>
              ) : imagingSeries?.length === 0 ? (
                <div className="text-center p-6 bg-muted/50 rounded-lg">
                  <ImageIcon className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No series found for this study</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setIsUploadDialogOpen(true)}
                  >
                    Upload First Image
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {imagingSeries?.map((series: any) => (
                    <div 
                      key={series.id}
                      className={`
                        relative rounded-lg overflow-hidden border-2 cursor-pointer
                        ${selectedSeries === series.id ? 'border-primary' : 'border-transparent'}
                      `}
                      onClick={() => setSelectedSeries(series.id)}
                    >
                      <img 
                        src={series.filePath ? `/${series.filePath.replace(/\\/g, '/')}` : '/placeholder-image.jpg'} 
                        alt={series.description || `Series ${series.id}`}
                        className="w-full h-32 object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2">
                        <p className="text-white text-xs truncate">
                          {series.modality}: {series.bodyPart || 'Unknown'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Image viewer */}
          {selectedSeries && imagingSeries && (
            <Card className="min-h-[500px]">
              <CardHeader className="p-3">
                <CardTitle className="text-lg">Image Viewer</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isAnnotationsLoading || isMeasurementsLoading ? (
                  <div className="flex justify-center items-center h-[400px]">
                    <LoadingSpinner />
                  </div>
                ) : (
                  <ImagingViewer
                    seriesId={selectedSeries}
                    imageUrl={
                      imagingSeries?.find((s: any) => s.id === selectedSeries)?.filePath 
                        ? `/${imagingSeries?.find((s: any) => s.id === selectedSeries)?.filePath?.replace(/\\/g, '/')}` 
                        : '/placeholder-image.jpg'
                    }
                    title={imagingSeries?.find((s: any) => s.id === selectedSeries)?.modality || 'Medical Image'}
                    description={imagingSeries?.find((s: any) => s.id === selectedSeries)?.description || ''}
                    annotations={annotations || []}
                    measurements={measurements || []}
                    onAnnotationAdded={handleAnnotationAdded}
                    onMeasurementAdded={handleMeasurementAdded}
                  />
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      {/* Dialog for creating a new medical imaging study */}
      <Dialog open={isNewStudyDialogOpen} onOpenChange={setIsNewStudyDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>New Imaging Study</DialogTitle>
            <DialogDescription>
              Add information about the new imaging study
            </DialogDescription>
          </DialogHeader>
          
          <Form {...newStudyForm}>
            <form onSubmit={newStudyForm.handleSubmit(onSubmitNewStudy)} className="space-y-4">
              {/* Only show pet selection if we're not in a pet-specific view */}
              {!petId && (
                <FormField
                  control={newStudyForm.control}
                  name="petId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pet</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a pet" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isPetsLoading ? (
                            <SelectItem value="" disabled>Loading pets...</SelectItem>
                          ) : pets?.map((pet: any) => (
                            <SelectItem key={pet.id} value={pet.id.toString()}>
                              {pet.name} - {pet.species}
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
                control={newStudyForm.control}
                name="studyType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Study Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select study type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="X-Ray">X-Ray</SelectItem>
                        <SelectItem value="Ultrasound">Ultrasound</SelectItem>
                        <SelectItem value="CT Scan">CT Scan</SelectItem>
                        <SelectItem value="MRI">MRI</SelectItem>
                        <SelectItem value="Endoscopy">Endoscopy</SelectItem>
                        <SelectItem value="Echocardiogram">Echocardiogram</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={newStudyForm.control}
                name="studyDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Study Date</FormLabel>
                    <FormControl>
                      <div className="flex items-center">
                        <Input type="date" {...field} />
                        <Calendar className="h-4 w-4 absolute right-10 text-muted-foreground" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
                <FormField
                  control={newStudyForm.control}
                  name="veterinarianId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Veterinarian</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select veterinarian" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {veterinarians?.map((vet: any) => (
                            <SelectItem key={vet.id} value={vet.id}>
                              {vet.firstName} {vet.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />              <FormField
                control={newStudyForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter study description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsNewStudyDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMedicalImagingMutation.isPending}>
                  {createMedicalImagingMutation.isPending ? "Creating..." : "Create Study"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Dialog for uploading a new image series */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Image Series</DialogTitle>
            <DialogDescription>
              Upload a new image for the selected study
            </DialogDescription>
          </DialogHeader>
          
          <Form {...newSeriesForm}>
            <form onSubmit={newSeriesForm.handleSubmit(onSubmitNewSeries)} className="space-y-4">
              <FormField
                control={newSeriesForm.control}
                name="modality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modality</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select imaging modality" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="DX">DX (Digital X-Ray)</SelectItem>
                        <SelectItem value="US">US (Ultrasound)</SelectItem>
                        <SelectItem value="CT">CT (Computed Tomography)</SelectItem>
                        <SelectItem value="MR">MR (Magnetic Resonance)</SelectItem>
                        <SelectItem value="ES">ES (Endoscopy)</SelectItem>
                        <SelectItem value="ECG">ECG (Echocardiogram)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={newSeriesForm.control}
                name="bodyPart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Body Part</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Thorax, Abdomen, Limb" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={newSeriesForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter image description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-2">
                <FormLabel>Image File</FormLabel>
                <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="image-upload"
                    onChange={handleFileChange}
                  />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    {selectedFile ? (
                      <>
                        <FileImage className="h-10 w-10 mx-auto mb-2 text-primary" />
                        <p className="text-sm font-medium">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </>
                    ) : (
                      <>
                        <Upload className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm">Click to select an image or drag and drop</p>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG, JPEG up to 50MB
                        </p>
                      </>
                    )}
                  </label>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={uploadSeriesImageMutation.isPending || !selectedFile}>
                  {uploadSeriesImageMutation.isPending ? "Uploading..." : "Upload Image"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MedicalImagingPage;
