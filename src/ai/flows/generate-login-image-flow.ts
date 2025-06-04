
'use server';
/**
 * @fileOverview Generates an image for the login page background.
 * - generateLoginImage - A function that returns a data URI for a generated image.
 * - LoginImageInput - Input type (optional, can be topic).
 * - LoginImageOutput - Output type (imageDataUri).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const LoginImageInputSchema = z.object({
  topic: z.string().optional().default('veterinary clinic environment'),
});
export type LoginImageInput = z.infer<typeof LoginImageInputSchema>;

const LoginImageOutputSchema = z.object({
  imageDataUri: z.string().describe('The generated image as a data URI.'),
});
export type LoginImageOutput = z.infer<typeof LoginImageOutputSchema>;

export async function generateLoginImage(input: LoginImageInput): Promise<LoginImageOutput> {
  return generateLoginImageFlow(input);
}

// Define the flow for generating the login image
const generateLoginImageFlow = ai.defineFlow(
  {
    name: 'generateLoginImageFlow',
    inputSchema: LoginImageInputSchema,
    outputSchema: LoginImageOutputSchema,
  },
  async (input) => {
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp', // Ensure this model is used for image generation
      prompt: `Generate an image of a ${input.topic}. The image should be serene, professional, well-lit, with a comfortable and welcoming atmosphere. Optionally include subtle hints of happy pets or friendly staff in the background. The image should evoke trust and calmness. Dimensions should be suitable for a tall background (e.g., portrait orientation).`,
      config: {
        responseModalities: ['TEXT', 'IMAGE'], // Must include IMAGE for image generation
      },
      safetySettings: [ // Recommended safety settings
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
      ],
    });

    if (!media || !media.url) {
      throw new Error('Image generation failed to return a media URL.');
    }
    return { imageDataUri: media.url };
  }
);
