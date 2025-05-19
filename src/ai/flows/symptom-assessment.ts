// Symptom assessment flow
'use server';
/**
 * @fileOverview AI-powered symptom checker for preliminary pet symptom assessment.
 *
 * - assessSymptoms - A function that handles the symptom assessment process.
 * - SymptomAssessmentInput - The input type for the assessSymptoms function.
 * - SymptomAssessmentOutput - The return type for the assessSymptoms function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SymptomAssessmentInputSchema = z.object({
  species: z.string().describe('The species of the pet (e.g., dog, cat, bird).'),
  age: z.number().describe('The age of the pet in years.'),
  symptoms: z.string().describe('A detailed description of the pet\'s symptoms.'),
});
export type SymptomAssessmentInput = z.infer<typeof SymptomAssessmentInputSchema>;

const SymptomAssessmentOutputSchema = z.object({
  likelyIssues: z.string().describe('A list of the most likely potential issues based on the symptoms.'),
  severity: z.string().describe('An assessment of the severity of the symptoms (e.g., mild, moderate, severe).'),
  recommendation: z.string().describe('A recommendation on whether a vet visit is necessary and how soon.'),
  additionalNotes: z.string().optional().describe('Any additional notes or observations.'),
});
export type SymptomAssessmentOutput = z.infer<typeof SymptomAssessmentOutputSchema>;

export async function assessSymptoms(input: SymptomAssessmentInput): Promise<SymptomAssessmentOutput> {
  return symptomAssessmentFlow(input);
}

const symptomAssessmentPrompt = ai.definePrompt({
  name: 'symptomAssessmentPrompt',
  input: {schema: SymptomAssessmentInputSchema},
  output: {schema: SymptomAssessmentOutputSchema},
  prompt: `You are an AI-powered veterinary assistant. A pet owner will describe their pet's symptoms, and you will provide a preliminary assessment.

  Consider the pet's species, age, and symptoms to determine the likely issues, severity, and recommendations.

  Species: {{{species}}}
  Age: {{{age}}} years
  Symptoms: {{{symptoms}}}

  Respond with a structured assessment, including likely issues, severity, and a recommendation on whether a vet visit is necessary. Include additional notes if relevant.

  Format your repsonse as a valid JSON conforming to the output schema.`,
});

const symptomAssessmentFlow = ai.defineFlow(
  {
    name: 'symptomAssessmentFlow',
    inputSchema: SymptomAssessmentInputSchema,
    outputSchema: SymptomAssessmentOutputSchema,
  },
  async input => {
    const {output} = await symptomAssessmentPrompt(input);
    return output!;
  }
);
