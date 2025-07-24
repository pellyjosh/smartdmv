import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth-utils';
import { getPracticeAI } from '@/ai/genkit';

// Input validation schema
const treatmentRecommendationSchema = z.object({
  petType: z.string().min(1, { message: "Pet type is required" }),
  condition: z.string().min(1, { message: "Condition is required" }),
  additionalInfo: z.string().optional(),
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
    const validatedData = treatmentRecommendationSchema.parse(body);

    // Get practice-specific AI instance
    const ai = await getPracticeAI(practiceId);

    // Create a prompt for treatment recommendations
    const prompt = `You are a veterinary treatment advisor. Provide evidence-based treatment recommendations for the following case.

Pet Information:
- Type: ${validatedData.petType}
- Diagnosed Condition: ${validatedData.condition}
${validatedData.additionalInfo ? `- Additional Information: ${validatedData.additionalInfo}` : ''}

Please provide comprehensive treatment recommendations including:

1. **Primary Treatment Options**
   - First-line treatment approaches
   - Medication recommendations with dosing considerations
   - Supportive care measures

2. **Monitoring and Follow-up**
   - Key parameters to monitor
   - Follow-up schedule recommendations
   - Warning signs to watch for

3. **Prognosis and Expectations**
   - Expected treatment response timeline
   - Long-term outlook
   - Factors affecting prognosis

4. **Client Education Points**
   - Important care instructions
   - Lifestyle modifications
   - Prevention strategies

Format your response as clear, actionable recommendations that can be easily understood by veterinary professionals. Use markdown formatting for better readability.

Important: Base recommendations on current veterinary best practices and evidence-based medicine.`;

    // Generate treatment recommendations using the AI
    const generateFlow = ai.defineFlow({
      name: 'treatmentRecommendations',
      inputSchema: z.string(),
      outputSchema: z.string(),
    }, async (input: string) => {
      const llmResponse = await ai.generate({
        model: 'googleai/gemini-2.0-flash',
        prompt: input,
        config: {
          temperature: 0.3,
          maxOutputTokens: 2048,
        },
      });
      return llmResponse.text;
    });

    const recommendations = await generateFlow(prompt);

    return NextResponse.json({
      recommendations: recommendations || 'Unable to generate recommendations at this time.',
      disclaimer: "These are general recommendations only. Treatment should always be determined by a licensed veterinarian based on the specific case, patient history, and clinical examination findings."
    });

  } catch (error) {
    console.error('Error in treatment recommendations:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid input data', 
        details: error.errors 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      error: 'Failed to generate treatment recommendations. Please ensure AI configuration is properly set up.' 
    }, { status: 500 });
  }
}
