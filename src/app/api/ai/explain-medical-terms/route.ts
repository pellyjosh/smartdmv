import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth-utils';
import { getPracticeAI } from '@/ai/genkit';

// Input validation schema
const medicalTermsExplanationSchema = z.object({
  terms: z.array(z.string()).min(1, { message: "At least one medical term is required" }),
  audienceType: z.enum(["client", "professional"]).default("client"),
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
    const validatedData = medicalTermsExplanationSchema.parse(body);

    // Get practice-specific AI instance
    const ai = await getPracticeAI(practiceId);

    // Create explanations for each term
    const explanations: Record<string, string> = {};

    for (const term of validatedData.terms) {
      if (!term.trim()) continue;

      const audienceContext = validatedData.audienceType === "client" 
        ? "pet owners (non-medical audience)" 
        : "veterinary professionals";

      const prompt = `Explain the veterinary medical term "${term.trim()}" for ${audienceContext}.

${validatedData.audienceType === "client" 
  ? `Provide a clear, simple explanation that a pet owner can understand. Avoid technical jargon and use everyday language. Include:
- What the condition/term means in simple terms
- How it might affect their pet
- What they should know as a pet owner`
  : `Provide a comprehensive professional explanation including:
- Clinical definition and pathophysiology
- Diagnostic considerations
- Treatment implications
- Relevant clinical notes`}

Keep the explanation concise but informative (2-4 sentences). Focus on the most important information for the intended audience.`;

      try {
        const generateFlow = ai.defineFlow({
          name: 'explainMedicalTerm',
          inputSchema: z.string(),
          outputSchema: z.string(),
        }, async (input: string) => {
          const llmResponse = await ai.generate({
            model: 'googleai/gemini-2.0-flash',
            prompt: input,
            config: {
              temperature: 0.2,
              maxOutputTokens: 512,
            },
          });
          return llmResponse.text;
        });

        const explanation = await generateFlow(prompt);
        explanations[term.trim()] = explanation || `Unable to provide explanation for "${term}" at this time.`;
      } catch (termError) {
        console.error(`Error explaining term "${term}":`, termError);
        explanations[term.trim()] = `Unable to provide explanation for "${term}" at this time.`;
      }
    }

    return NextResponse.json(explanations);

  } catch (error) {
    console.error('Error in medical terms explanation:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid input data', 
        details: error.errors 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      error: 'Failed to explain medical terms. Please ensure AI configuration is properly set up.' 
    }, { status: 500 });
  }
}
