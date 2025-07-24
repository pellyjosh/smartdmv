'use client';
import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, ArrowRight, AlertCircle, Search, AlertTriangle, Pill, BookOpen, FileText, Settings, Save, Eye, EyeOff } from "lucide-react";
import { EnterpriseFeatureContainer } from "@/components/features/enterprise-feature-container";
import { useUser } from "@/context/UserContext";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

// Validation schema for symptom analysis form
const symptomAnalysisSchema = z.object({
  petType: z.string().min(1, { message: "Pet type is required" }),
  breed: z.string().optional(),
  age: z.string().optional(),
  symptoms: z.string().min(5, { message: "Please describe the symptoms (minimum 5 characters)" }),
  medicalHistory: z.string().optional(),
});

// Validation schema for treatment recommendations form
const treatmentRecommendationSchema = z.object({
  petType: z.string().min(1, { message: "Pet type is required" }),
  condition: z.string().min(1, { message: "Condition is required" }),
  additionalInfo: z.string().optional(),
});

// Validation schema for medical terms explanation form
const medicalTermsExplanationSchema = z.object({
  terms: z.string().min(1, { message: "Please enter at least one medical term" }),
  audienceType: z.enum(["client", "professional"]).default("client"),
});

// Type definitions derived from schemas
type SymptomAnalysisFormValues = z.infer<typeof symptomAnalysisSchema>;
type TreatmentRecommendationFormValues = z.infer<typeof treatmentRecommendationSchema>;
type MedicalTermsExplanationFormValues = z.infer<typeof medicalTermsExplanationSchema>;

// Component for Symptom Analysis tab
function SymptomAnalysisForm() {
  const { toast } = useToast();
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const form = useForm<SymptomAnalysisFormValues>({
    resolver: zodResolver(symptomAnalysisSchema),
    defaultValues: {
      petType: "",
      breed: "",
      age: "",
      symptoms: "",
      medicalHistory: "",
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async (data: SymptomAnalysisFormValues) => {
      const response = await apiRequest("POST", "/api/ai/analyze-symptoms", data);
      return await response.json();
    },
    onSuccess: (data) => {
      setAnalysisResult(data);
      toast({
        title: "Analysis Complete",
        description: "AI has generated a preliminary analysis of the symptoms.",
      });
    },
    onError: (error: Error) => {
      console.error("Symptom analysis error:", error);
      toast({
        title: "Analysis Failed",
        description: `Error: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SymptomAnalysisFormValues) => {
    analyzeMutation.mutate(data);
  };

  const getLikelihoodColor = (likelihood: string) => {
    switch (likelihood) {
      case "High":
        return "bg-red-100 text-red-800 hover:bg-red-100";
      case "Medium":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      case "Low":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="w-full lg:w-1/2">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="petType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pet Type*</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select pet type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Dog">Dog</SelectItem>
                      <SelectItem value="Cat">Cat</SelectItem>
                      <SelectItem value="Bird">Bird</SelectItem>
                      <SelectItem value="Reptile">Reptile</SelectItem>
                      <SelectItem value="Small Mammal">Small Mammal</SelectItem>
                      <SelectItem value="Horse">Horse</SelectItem>
                      <SelectItem value="Exotic">Exotic</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="breed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Breed (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter breed" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="age"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Age (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 3 years, 6 months" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="symptoms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Symptoms*</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the symptoms in detail"
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="medicalHistory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Medical History (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any relevant medical history"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={analyzeMutation.isPending}
            >
              {analyzeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Analyze Symptoms
                </>
              )}
            </Button>
          </form>
        </Form>
      </div>

      <div className="w-full lg:w-1/2">
        {analyzeMutation.isPending ? (
          <Card>
            <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[400px]">
              <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
              <p className="text-center text-muted-foreground">
                Generating analysis based on symptoms...
                <br />
                This may take a moment.
              </p>
            </CardContent>
          </Card>
        ) : analysisResult ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-primary" />
                Preliminary Analysis
              </CardTitle>
              <CardDescription>
                AI-generated analysis based on reported symptoms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {analysisResult.urgencyLevel && (
                <div>
                  <h3 className="font-medium mb-1">Urgency Level:</h3>
                  <Badge
                    variant="outline"
                    className={
                      analysisResult.urgencyLevel === "Emergency"
                        ? "bg-red-100 text-red-800 hover:bg-red-100"
                        : analysisResult.urgencyLevel === "Urgent"
                        ? "bg-orange-100 text-orange-800 hover:bg-orange-100"
                        : analysisResult.urgencyLevel === "Standard"
                        ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                        : "bg-green-100 text-green-800 hover:bg-green-100"
                    }
                  >
                    {analysisResult.urgencyLevel}
                  </Badge>
                </div>
              )}

              {analysisResult.possibleConditions && (
                <div>
                  <h3 className="font-medium mb-2">Possible Conditions:</h3>
                  <div className="space-y-2">
                    {analysisResult.possibleConditions.map((condition: any, index: number) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="font-medium">{condition.name}</h4>
                          <Badge variant="outline" className={getLikelihoodColor(condition.likelihood)}>
                            {condition.likelihood} Likelihood
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{condition.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysisResult.recommendedTests && (
                <div>
                  <h3 className="font-medium mb-1">Recommended Tests:</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {analysisResult.recommendedTests.map((test: string, index: number) => (
                      <li key={index} className="text-sm">{test}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysisResult.generalAdvice && (
                <div>
                  <h3 className="font-medium mb-1">General Advice:</h3>
                  <p className="text-sm text-muted-foreground">{analysisResult.generalAdvice}</p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Alert className="w-full bg-yellow-50 text-yellow-800 border-yellow-200">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Disclaimer</AlertTitle>
                <AlertDescription className="text-xs">
                  {analysisResult.disclaimer || 
                    "This AI analysis is for informational purposes only and does not constitute veterinary advice. Always consult with a licensed veterinarian for proper diagnosis and treatment."}
                </AlertDescription>
              </Alert>
            </CardFooter>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[400px] text-center">
              <Search className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No Analysis Yet</p>
              <p className="text-muted-foreground">
                Enter pet information and symptoms on the left to get an AI-powered preliminary analysis.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Component for Treatment Recommendations tab
function TreatmentRecommendationsForm() {
  const { toast } = useToast();
  const [recommendationsResult, setRecommendationsResult] = useState<any>(null);

  const form = useForm<TreatmentRecommendationFormValues>({
    resolver: zodResolver(treatmentRecommendationSchema),
    defaultValues: {
      petType: "",
      condition: "",
      additionalInfo: "",
    },
  });

  const recommendationsMutation = useMutation({
    mutationFn: async (data: TreatmentRecommendationFormValues) => {
      const response = await apiRequest("POST", "/api/ai/treatment-recommendations", data);
      return await response.json();
    },
    onSuccess: (data) => {
      setRecommendationsResult(data);
      toast({
        title: "Recommendations Ready",
        description: "Treatment recommendations have been generated.",
      });
    },
    onError: (error: Error) => {
      console.error("Treatment recommendations error:", error);
      toast({
        title: "Failed to Get Recommendations",
        description: `Error: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TreatmentRecommendationFormValues) => {
    recommendationsMutation.mutate(data);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="w-full lg:w-1/2">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="petType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pet Type*</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select pet type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Dog">Dog</SelectItem>
                      <SelectItem value="Cat">Cat</SelectItem>
                      <SelectItem value="Bird">Bird</SelectItem>
                      <SelectItem value="Reptile">Reptile</SelectItem>
                      <SelectItem value="Small Mammal">Small Mammal</SelectItem>
                      <SelectItem value="Horse">Horse</SelectItem>
                      <SelectItem value="Exotic">Exotic</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="condition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Condition/Diagnosis*</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter diagnosed condition" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="additionalInfo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Information (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide additional context about the pet's condition"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={recommendationsMutation.isPending}
            >
              {recommendationsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Recommendations...
                </>
              ) : (
                <>
                  <Pill className="mr-2 h-4 w-4" />
                  Get Treatment Recommendations
                </>
              )}
            </Button>
          </form>
        </Form>
      </div>

      <div className="w-full lg:w-1/2">
        {recommendationsMutation.isPending ? (
          <Card>
            <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[400px]">
              <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
              <p className="text-center text-muted-foreground">
                Generating treatment recommendations...
                <br />
                This may take a moment.
              </p>
            </CardContent>
          </Card>
        ) : recommendationsResult ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pill className="h-5 w-5 text-primary" />
                Treatment Recommendations
              </CardTitle>
              <CardDescription>
                Evidence-based treatment approaches for the diagnosed condition
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <div dangerouslySetInnerHTML={{ 
                  __html: recommendationsResult.recommendations
                    .replace(/\n/g, '<br>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                }} />
              </div>
            </CardContent>
            <CardFooter>
              <Alert className="w-full bg-yellow-50 text-yellow-800 border-yellow-200">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Disclaimer</AlertTitle>
                <AlertDescription className="text-xs">
                  {recommendationsResult.disclaimer || 
                    "These are general recommendations only. Treatment should always be determined by a licensed veterinarian based on the specific case."}
                </AlertDescription>
              </Alert>
            </CardFooter>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[400px] text-center">
              <Pill className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No Recommendations Yet</p>
              <p className="text-muted-foreground">
                Enter pet type and diagnosed condition on the left to get evidence-based treatment recommendations.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Component for Medical Terms Explanation tab
function MedicalTermsExplanationForm() {
  const { toast } = useToast();
  const [explanationsResult, setExplanationsResult] = useState<Record<string, string> | null>(null);

  const form = useForm<MedicalTermsExplanationFormValues>({
    resolver: zodResolver(medicalTermsExplanationSchema),
    defaultValues: {
      terms: "",
      audienceType: "client",
    },
  });

  const explainTermsMutation = useMutation({
    mutationFn: async (data: MedicalTermsExplanationFormValues) => {
      // Process terms as array
      const processedData = {
        terms: data.terms.split(',').map(term => term.trim()),
        audienceType: data.audienceType
      };
      
      const response = await apiRequest("POST", "/api/ai/explain-medical-terms", processedData);
      return await response.json();
    },
    onSuccess: (data) => {
      setExplanationsResult(data);
      toast({
        title: "Explanations Ready",
        description: "Medical terms have been explained.",
      });
    },
    onError: (error: Error) => {
      console.error("Medical terms explanation error:", error);
      toast({
        title: "Failed to Explain Terms",
        description: `Error: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: MedicalTermsExplanationFormValues) => {
    explainTermsMutation.mutate(data);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="w-full lg:w-1/2">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="terms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Medical Terms*</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter medical terms separated by commas (e.g., hepatic lipidosis, urticaria, pulmonary edema)"
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="audienceType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Audience Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select audience type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="client">Client (Pet Owner)</SelectItem>
                      <SelectItem value="professional">Professional (Veterinary Staff)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={explainTermsMutation.isPending}
            >
              {explainTermsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Explaining Terms...
                </>
              ) : (
                <>
                  <BookOpen className="mr-2 h-4 w-4" />
                  Explain Medical Terms
                </>
              )}
            </Button>
          </form>
        </Form>
      </div>

      <div className="w-full lg:w-1/2">
        {explainTermsMutation.isPending ? (
          <Card>
            <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[400px]">
              <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
              <p className="text-center text-muted-foreground">
                Explaining medical terms...
                <br />
                This may take a moment.
              </p>
            </CardContent>
          </Card>
        ) : explanationsResult ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Medical Terms Explained
              </CardTitle>
              <CardDescription>
                {form.getValues().audienceType === "client"
                  ? "Explanations tailored for pet owners"
                  : "Technical explanations for veterinary professionals"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(explanationsResult).map(([term, explanation], index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <h4 className="font-medium mb-1">{term}</h4>
                    <p className="text-sm text-muted-foreground">{explanation}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[400px] text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No Explanations Yet</p>
              <p className="text-muted-foreground">
                Enter veterinary medical terms on the left to get clear explanations.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Component for AI Configuration tab (admin only)
function AiConfigurationForm() {
  const { toast } = useToast();
  const [config, setConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const form = useForm({
    defaultValues: {
      geminiApiKey: '',
      isEnabled: true,
    },
  });

  // Fetch current AI configuration
  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/ai-config');
      if (response.ok) {
        const data = await response.json();
        if (data.config) {
          setConfig(data.config);
          form.reset({
            geminiApiKey: '', // Don't populate API key for security
            isEnabled: data.config.isEnabled,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching AI config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      setIsSaving(true);
      
      // Only send the fields we want to configure
      const payload = {
        geminiApiKey: data.geminiApiKey,
        isEnabled: data.isEnabled,
        // Let the API handle other configurations programmatically
      };
      
      const method = config ? 'PUT' : 'POST';
      const response = await fetch('/api/ai-config', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        await fetchConfig(); // Refresh config
        form.setValue('geminiApiKey', ''); // Clear API key field for security
        toast({
          title: 'Success',
          description: 'AI configuration saved successfully',
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving AI config:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save configuration',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading configuration...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            AI Configuration
          </CardTitle>
          <CardDescription>
            Configure Gemini AI settings for your practice
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="apiKey">Gemini API Key</Label>
                <div className="relative">
                  <Input
                    id="apiKey"
                    type={showApiKey ? 'text' : 'password'}
                    placeholder={config?.hasApiKey ? '••••••••••••••••' : 'Enter your Gemini API key'}
                    {...form.register('geminiApiKey')}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {config?.hasApiKey 
                    ? 'API key is configured. Enter a new key to update.' 
                    : 'Enter your Gemini API key to enable AI features.'}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="enabled">Enable AI Features</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable or disable AI diagnostic features
                  </p>
                </div>
                <Switch
                  id="enabled"
                  checked={form.watch('isEnabled')}
                  onCheckedChange={(checked) => form.setValue('isEnabled', checked)}
                />
              </div>

              <Button type="submit" disabled={isSaving} className="w-full">
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Configuration
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        {config && (
          <CardFooter>
            <div className="w-full text-sm text-muted-foreground">
              <p>Last updated: {new Date(config.updatedAt).toLocaleString()}</p>
              {config.configuredByUser && (
                <p>Configured by: {config.configuredByUser.name || config.configuredByUser.email}</p>
              )}
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}

// Main component that renders the tabs
export default function AIDiagnosticAssistantPage() {
  const { user } = useUser();
  
  // Check if user is admin
  const isAdmin = user?.role === 'ADMINISTRATOR' || user?.role === 'SUPER_ADMIN' || user?.role === 'PRACTICE_ADMINISTRATOR';
  
  // Check if Gemini API key is configured
  const apiKeyQuery = useQuery({
    queryKey: ["/api/ai-config"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/ai-config");
        if (!response.ok) {
          // If no config exists, return hasKey: false
          if (response.status === 404) {
            return { hasKey: false, isEnabled: false };
          }
          throw new Error("Failed to check AI configuration");
        }
        const data = await response.json();
        return { 
          hasKey: data.config?.hasApiKey || false,
          isEnabled: data.config?.isEnabled || false 
        };
      } catch (error) {
        console.error("Error checking AI configuration:", error);
        return { hasKey: false, isEnabled: false };
      }
    },
    enabled: !!user, // Only run query when user is loaded
  });

  if (!user || apiKeyQuery.isLoading) {
    return (
      <div className="container py-10 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Content to render within the page
  const pageContent = (
    <div className="container py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">AI Diagnostic Assistant</h1>
        <p className="text-muted-foreground mt-2">
          Leverage AI to help with symptom analysis, treatment recommendations, and medical term explanations.
        </p>
      </div>

      {(!apiKeyQuery.data?.hasKey || !apiKeyQuery.data?.isEnabled) && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>AI Configuration Required</AlertTitle>
          <AlertDescription>
            {!apiKeyQuery.data?.hasKey 
              ? "The Gemini API key is not configured. Please contact your administrator to set up the API key."
              : "AI features are currently disabled. Please contact your administrator to enable them."}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="symptoms" className="space-y-6">
        <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <TabsTrigger value="symptoms" disabled={!apiKeyQuery.data?.hasKey || !apiKeyQuery.data?.isEnabled}>
            <Search className="mr-2 h-4 w-4" />
            Symptom Analysis
          </TabsTrigger>
          <TabsTrigger value="treatments" disabled={!apiKeyQuery.data?.hasKey || !apiKeyQuery.data?.isEnabled}>
            <Pill className="mr-2 h-4 w-4" />
            Treatment Recommendations
          </TabsTrigger>
          <TabsTrigger value="terms" disabled={!apiKeyQuery.data?.hasKey || !apiKeyQuery.data?.isEnabled}>
            <BookOpen className="mr-2 h-4 w-4" />
            Medical Terms
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="config">
              <Settings className="mr-2 h-4 w-4" />
              Configuration
            </TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="symptoms" className="space-y-4">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Symptom Analysis</h2>
            <p className="text-muted-foreground">
              Enter patient details and symptoms to receive AI-generated analysis of possible conditions.
            </p>
          </div>
          <SymptomAnalysisForm />
        </TabsContent>
        
        <TabsContent value="treatments" className="space-y-4">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Treatment Recommendations</h2>
            <p className="text-muted-foreground">
              Get evidence-based treatment recommendations for diagnosed conditions.
            </p>
          </div>
          <TreatmentRecommendationsForm />
        </TabsContent>
        
        <TabsContent value="terms" className="space-y-4">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Medical Terms Explanation</h2>
            <p className="text-muted-foreground">
              Explain complex veterinary medical terms for client communication or staff reference.
            </p>
          </div>
          <MedicalTermsExplanationForm />
        </TabsContent>
        
        {isAdmin && (
          <TabsContent value="config" className="space-y-4">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">AI Configuration</h2>
              <p className="text-muted-foreground">
                Configure Gemini AI settings for your practice. Only administrators can access this section.
              </p>
            </div>
            <AiConfigurationForm />
          </TabsContent>
        )}
      </Tabs>
      
      <div className="mt-12 border-t pt-6">
        <div className="flex items-center">
          <FileText className="h-5 w-5 text-muted-foreground mr-2" />
          <h3 className="text-lg font-medium">Important Notes</h3>
        </div>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc pl-5">
          <li>All AI-generated content is for informational purposes only and does not replace professional veterinary judgment.</li>
          <li>The accuracy of AI analysis depends on the quality and completeness of information provided.</li>
          <li>Always verify AI recommendations against established veterinary guidelines and protocols.</li>
          <li>Treatment recommendations should be adapted based on individual patient needs and clinical context.</li>
        </ul>
      </div>
    </div>
  );

  // Use the EnterpriseFeatureContainer which checks subscription tier directly
  return (
    <EnterpriseFeatureContainer 
      featureId="ai_clinical_assistant" 
      featureName="AI Diagnostic Assistant"
      description="Access our advanced AI Diagnostic Assistant to help with symptom analysis, treatment recommendations, and medical term explanations."
    >
      {pageContent}
    </EnterpriseFeatureContainer>
  );
}