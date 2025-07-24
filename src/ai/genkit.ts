import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import { getDecryptedApiKey } from '@/app/api/ai-config/route';

// Create a cached instance map to avoid recreating Genkit instances
const genkitInstances = new Map<string, any>();

// Default Genkit instance (fallback)
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.0-flash',
});

// Function to get practice-specific Genkit instance
export async function getPracticeAI(practiceId: string) {
  try {
    // Check if we already have a cached instance for this practice
    if (genkitInstances.has(practiceId)) {
      return genkitInstances.get(practiceId);
    }

    // Get the practice-specific API key
    const apiKey = await getDecryptedApiKey(practiceId);
    
    if (!apiKey) {
      console.log(`No API key found for practice ${practiceId}, using default instance`);
      return ai; // Return default instance if no API key configured
    }

    // Create practice-specific Genkit instance
    const practiceAI = genkit({
      plugins: [googleAI({ apiKey })],
      model: 'googleai/gemini-2.0-flash',
    });

    // Cache the instance
    genkitInstances.set(practiceId, practiceAI);
    
    console.log(`Created practice-specific AI instance for practice ${practiceId}`);
    return practiceAI;

  } catch (error) {
    console.error(`Error creating practice AI for ${practiceId}:`, error);
    return ai; // Return default instance on error
  }
}

// Function to clear cached instance (useful when API key is updated)
export function clearPracticeAICache(practiceId?: string) {
  if (practiceId) {
    genkitInstances.delete(practiceId);
    console.log(`Cleared AI cache for practice ${practiceId}`);
  } else {
    genkitInstances.clear();
    console.log('Cleared all AI caches');
  }
}
