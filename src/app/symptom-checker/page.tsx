"use client";

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { assessSymptoms, type SymptomAssessmentInput, type SymptomAssessmentOutput } from '@/ai/flows/symptom-assessment';
import { useUser } from '@/context/UserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Sparkles, Lightbulb, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const symptomCheckerFormSchema = z.object({
  species: z.string().min(2, { message: "Species must be at least 2 characters." }).max(50),
  age: z.coerce.number().min(0, { message: "Age must be a positive number." }).max(100),
  symptoms: z.string().min(10, { message: "Please describe symptoms in at least 10 characters." }).max(1000),
});

type SymptomCheckerFormValues = z.infer<typeof symptomCheckerFormSchema>;

export default function SymptomCheckerPage() {
  const { userPracticeId } = useUser();
  const [assessmentResult, setAssessmentResult] = useState<SymptomAssessmentOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<SymptomCheckerFormValues>({
    resolver: zodResolver(symptomCheckerFormSchema),
    defaultValues: {
      species: '',
      age: undefined,
      symptoms: '',
    },
  });

  const onSubmit: SubmitHandler<SymptomCheckerFormValues> = async (data) => {
    setIsLoading(true);
    setAssessmentResult(null);
    setError(null);
    try {
      // Include practiceId if available for practice-specific AI configuration
      const inputData: SymptomAssessmentInput = {
        ...data,
        ...(userPracticeId && { practiceId: userPracticeId })
      };
      
      const result = await assessSymptoms(inputData);
      setAssessmentResult(result);
      toast({
        title: "Assessment Complete",
        description: "Your pet's symptom assessment is ready.",
        variant: "default",
      });
    } catch (e) {
      console.error("Symptom assessment error:", e);
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      setError(`Failed to get assessment: ${errorMessage}`);
      toast({
        title: "Assessment Failed",
        description: `Could not complete the assessment. ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    if (severity.toLowerCase().includes('severe')) return <AlertTriangle className="h-5 w-5 text-destructive" />;
    if (severity.toLowerCase().includes('moderate')) return <Lightbulb className="h-5 w-5 text-yellow-500" />;
    return <CheckCircle className="h-5 w-5 text-green-500" />;
  };


  return (
    <div className="container mx-auto max-w-2xl">
      <Card className="shadow-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center mb-2">
            <Sparkles className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">AI Symptom Checker</CardTitle>
          <CardDescription className="text-md">
            Get a preliminary AI-powered assessment of your pet's symptoms. This tool is not a substitute for professional veterinary advice.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="species"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pet Species</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Dog, Cat, Bird" {...field} />
                    </FormControl>
                    <FormDescription>What kind of pet do you have?</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pet Age (years)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 3" {...field} />
                    </FormControl>
                     <FormDescription>How old is your pet in years?</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="symptoms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Symptoms</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your pet's symptoms in detail (e.g., lethargy, loss of appetite, coughing for 2 days)"
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Be as specific as possible.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Getting Assessment...
                  </>
                ) : (
                  'Get AI Assessment'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {assessmentResult && (
        <Card className="mt-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-primary">Assessment Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg flex items-center mb-1">
                Severity: <span className="ml-2 font-normal flex items-center gap-1">{getSeverityIcon(assessmentResult.severity)}{assessmentResult.severity}</span>
              </h3>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">Likely Issues:</h3>
              <p className="text-foreground whitespace-pre-wrap">{assessmentResult.likelyIssues}</p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">Recommendation:</h3>
              <p className="text-foreground whitespace-pre-wrap">{assessmentResult.recommendation}</p>
            </div>
            {assessmentResult.additionalNotes && (
              <div>
                <h3 className="font-semibold text-lg mb-1">Additional Notes:</h3>
                <p className="text-foreground whitespace-pre-wrap">{assessmentResult.additionalNotes}</p>
              </div>
            )}
          </CardContent>
           <CardFooter>
            <p className="text-xs text-muted-foreground">
              Disclaimer: This AI assessment is for informational purposes only and does not constitute professional veterinary advice. Always consult a qualified veterinarian for any health concerns or before making any decisions related to your pet's health.
            </p>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
