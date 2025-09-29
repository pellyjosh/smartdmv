import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { aiConfigs, administratorAccessiblePractices } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema for bulk AI config (for administrators)
const bulkAiConfigSchema = z.object({
  geminiApiKey: z.string().min(1, 'Gemini API key is required'),
  isEnabled: z.boolean().default(true),
  maxTokens: z.string().optional().default('1000'),
  temperature: z.string().optional().default('0.7'),
  practiceIds: z.array(z.string()).min(1, 'At least one practice ID is required'),
  configuredBy: z.string().min(1, 'User ID is required'),
  applyToAll: z.boolean().default(false), // Whether to apply to all accessible practices
});

// Simple encryption functions (in production, use a proper encryption library)
const encrypt = (text: string): string => {
  // TODO: Implement proper encryption using crypto library
  // For now, just base64 encode (NOT SECURE - replace with proper encryption)
  return Buffer.from(text).toString('base64');
};

export async function POST(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const body = await request.json();
    const validatedData = bulkAiConfigSchema.parse(body);

    let targetPracticeIds = validatedData.practiceIds;

    // If applyToAll is true, get all accessible practices for this administrator
    if (validatedData.applyToAll) {
      const accessiblePractices = await (db as any)
        .select({
          practiceId: administratorAccessiblePractices.practiceId,
        })
        .from(administratorAccessiblePractices)
  .where(eq(administratorAccessiblePractices.administratorId, Number(validatedData.configuredBy)));

      targetPracticeIds = accessiblePractices.map((p: any) => p.practiceId);
    }

    if (targetPracticeIds.length === 0) {
      return NextResponse.json({ error: 'No practices found to configure' }, { status: 400 });
    }

    // Encrypt the API key before storing
    const encryptedApiKey = encrypt(validatedData.geminiApiKey);

    const results = [];
    const errors = [];

    // Process each practice
  for (const practiceId of targetPracticeIds) {
      try {
    const practiceIdNum = Number(practiceId);
        // Check if config already exists for this practice
        const existingConfig = await (db as any).select().from(aiConfigs)
          .where(eq(aiConfigs.practiceId, practiceIdNum))
          .limit(1);

        let result;
        
        if (existingConfig.length > 0) {
          // Update existing config
          result = await (db as any).update(aiConfigs)
            .set({
              geminiApiKey: encryptedApiKey,
              isEnabled: validatedData.isEnabled,
              maxTokens: validatedData.maxTokens,
              temperature: validatedData.temperature,
              configuredBy: Number(validatedData.configuredBy),
              updatedAt: new Date(),
            })
            .where(eq(aiConfigs.practiceId, practiceIdNum))
            .returning();
        } else {
          // Create new config
          result = await (db as any).insert(aiConfigs).values({
            practiceId: practiceIdNum,
            geminiApiKey: encryptedApiKey,
            isEnabled: validatedData.isEnabled,
            maxTokens: validatedData.maxTokens,
            temperature: validatedData.temperature,
            configuredBy: Number(validatedData.configuredBy),
          }).returning();
        }

        const saved = result[0] || {};
        results.push({
          practiceId,
          success: true,
          config: {
            ...saved,
            createdAt: saved.createdAt ? new Date(saved.createdAt).toISOString() : null,
            updatedAt: saved.updatedAt ? new Date(saved.updatedAt).toISOString() : null,
            geminiApiKey: '***masked***',
            hasApiKey: true,
          }
        });

      } catch (error) {
        console.error(`Error configuring AI for practice ${practiceId}:`, error);
        errors.push({
          practiceId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      message: `AI configuration applied to ${results.length} practices`,
      results,
      errors,
      totalProcessed: targetPracticeIds.length,
      successCount: results.length,
      errorCount: errors.length
    });

  } catch (error) {
    console.error('Error in bulk AI config:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to configure AI for practices' }, { status: 500 });
  }
}
