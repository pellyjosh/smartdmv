import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth-utils';
import { assessSymptoms } from '@/ai/flows/symptom-assessment';

// Input validation schema
const symptomAnalysisSchema = z.object({
  petType: z.string().min(1, { message: "Pet type is required" }),
  breed: z.string().optional(),
  age: z.string().optional(),
  symptoms: z.string().min(5, { message: "Please describe the symptoms (minimum 5 characters)" }),
  medicalHistory: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Get current user from session
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's practice ID for AI config
    const practiceId = currentUser.currentPracticeId;
    if (!practiceId) {
      return NextResponse.json({ error: 'No practice associated with user' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = symptomAnalysisSchema.parse(body);

    // Prepare input for the AI assessment
    const assessmentInput = {
      species: validatedData.petType,
      age: validatedData.age ? parseFloat(validatedData.age) || 1 : 1, // Default to 1 if age not provided or invalid
      symptoms: `Symptoms: ${validatedData.symptoms}${validatedData.breed ? `\nBreed: ${validatedData.breed}` : ''}${validatedData.medicalHistory ? `\nMedical History: ${validatedData.medicalHistory}` : ''}`,
      practiceId
    };

    // Call the AI assessment function
    const result = await assessSymptoms(assessmentInput);

    // Transform the result to match the frontend's expected format
    const analysisResult = {
      urgencyLevel: result.severity === 'severe' ? 'Emergency' : 
                   result.severity === 'moderate' ? 'Urgent' : 
                   result.severity === 'mild' ? 'Standard' : 'Routine',
      possibleConditions: [
        {
          name: "Preliminary Assessment",
          likelihood: result.severity === 'severe' ? 'High' : 
                     result.severity === 'moderate' ? 'Medium' : 'Low',
          description: result.likelyIssues
        }
      ],
      recommendedTests: ["Physical examination", "Complete blood count", "Basic chemistry panel"],
      generalAdvice: result.recommendation + (result.additionalNotes ? ` ${result.additionalNotes}` : ''),
      disclaimer: "This AI analysis is for informational purposes only and does not constitute veterinary advice. Always consult with a licensed veterinarian for proper diagnosis and treatment."
    };

    return NextResponse.json(analysisResult);

  } catch (error) {
    console.error('Error in symptom analysis:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid input data', 
        details: error.errors 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      error: 'Failed to analyze symptoms. Please ensure AI configuration is properly set up.' 
    }, { status: 500 });
  }
}
