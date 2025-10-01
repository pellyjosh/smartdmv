import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice, getCurrentUser } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { aiConfigs, administratorAccessiblePractices, users } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema for AI config (simplified for frontend)
const aiConfigSchema = z.object({
  geminiApiKey: z.string().min(1, 'Gemini API key is required'),
  isEnabled: z.boolean().default(true),
});

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

const updateAiConfigSchema = z.object({
  geminiApiKey: z.string().optional(),
  isEnabled: z.boolean().optional(),
});

// Simple encryption functions (in production, use a proper encryption library)
const encrypt = (text: string): string => {
  // TODO: Implement proper encryption using crypto library
  // For now, just base64 encode (NOT SECURE - replace with proper encryption)
  return Buffer.from(text).toString('base64');
};

const decrypt = (encryptedText: string): string => {
  // TODO: Implement proper decryption
  // For now, just base64 decode (NOT SECURE - replace with proper decryption)
  try {
    return Buffer.from(encryptedText, 'base64').toString();
  } catch {
    return encryptedText; // Return as-is if not encrypted
  }
};

export async function GET(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    // Get current user from session
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const administratorId = searchParams.get('administratorId');

    if (administratorId) {
      // Verify the requesting user is the administrator or has permission
      if (currentUser.id !== Number(administratorId) && currentUser.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Get configurations for all practices accessible to this administrator
      const accessiblePractices = await tenantDb
        .select({
          practiceId: administratorAccessiblePractices.practiceId,
        })
        .from(administratorAccessiblePractices)
  .where(eq(administratorAccessiblePractices.administratorId, Number(administratorId)));

      const practiceIds = accessiblePractices.map((p: any) => p.practiceId);

      if (practiceIds.length === 0) {
        return NextResponse.json({ 
          configs: [],
          hasConfigs: false 
        });
      }

      const configs = await tenantDb.select().from(aiConfigs)
        .where(inArray(aiConfigs.practiceId, practiceIds));

      // Return configs without actual API keys for security
      const maskedConfigs = configs.map((config: any) => ({
        ...config,
        createdAt: config.createdAt ? new Date(config.createdAt).toISOString() : null,
        updatedAt: config.updatedAt ? new Date(config.updatedAt).toISOString() : null,
        geminiApiKey: config.geminiApiKey ? '***masked***' : null,
        hasApiKey: !!config.geminiApiKey,
      }));

      return NextResponse.json({
        configs: maskedConfigs,
        hasConfigs: configs.length > 0,
        practiceIds
      });
    }

    // For non-administrator requests, get user's practice configuration
    let practiceId: number;
    if (currentUser.role === 'ADMINISTRATOR' || currentUser.role === 'SUPER_ADMIN') {
      if (currentUser.currentPracticeId == null) {
        // Get first accessible practice for admin
        const adminPractices = await tenantDb.select({ practiceId: administratorAccessiblePractices.practiceId })
          .from(administratorAccessiblePractices)
          .where(eq(administratorAccessiblePractices.administratorId, Number(currentUser.id)))
          .limit(1);
        
        if (adminPractices.length === 0) {
          return NextResponse.json({ error: 'No accessible practices found' }, { status: 400 });
        }
        practiceId = adminPractices[0].practiceId as number;
      } else {
        practiceId = currentUser.currentPracticeId as number;
      }
    } else {
      if (currentUser.currentPracticeId == null) {
        return NextResponse.json({ error: 'No practice associated with user' }, { status: 400 });
      }
      practiceId = currentUser.currentPracticeId as number;
    }

    const config = await tenantDb.query.aiConfigs.findFirst({
      where: eq(aiConfigs.practiceId, practiceId),
      with: {
        configuredByUser: {
          columns: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    if (!config) {
      return NextResponse.json({ 
        config: null,
        hasConfig: false 
      });
    }
    
    // Return config without the actual API key for security
    return NextResponse.json({
      config: {
        ...config,
        createdAt: config.createdAt ? new Date(config.createdAt).toISOString() : null,
        updatedAt: config.updatedAt ? new Date(config.updatedAt).toISOString() : null,
        geminiApiKey: config.geminiApiKey ? '***masked***' : null,
        hasApiKey: !!config.geminiApiKey,
        configuredByUser: config.configuredByUser,
      },
      hasConfig: true
    });

  } catch (error) {
    console.error('Error fetching AI config:', error);
    return NextResponse.json({ error: 'Failed to fetch AI configuration' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    // Get current user from session
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's practice ID
    let practiceId: number;
    if (currentUser.role === 'ADMINISTRATOR' || currentUser.role === 'SUPER_ADMIN') {
      // For admins, we'll use their currentPracticeId or the first accessible practice
      if (currentUser.currentPracticeId == null) {
        // Get first accessible practice for admin
        const adminPractices = await tenantDb.select({ practiceId: administratorAccessiblePractices.practiceId })
          .from(administratorAccessiblePractices)
          .where(eq(administratorAccessiblePractices.administratorId, Number(currentUser.id)))
          .limit(1);
        
        if (adminPractices.length === 0) {
          return NextResponse.json({ error: 'No accessible practices found' }, { status: 400 });
        }
        practiceId = adminPractices[0].practiceId as number;
      } else {
        practiceId = currentUser.currentPracticeId as number;
      }
    } else {
      // For non-admins, use their current practice
      if (currentUser.currentPracticeId == null) {
        return NextResponse.json({ error: 'No practice associated with user' }, { status: 400 });
      }
      practiceId = currentUser.currentPracticeId as number;
    }

    const body = await request.json();
    const validatedData = aiConfigSchema.parse(body);

    // Encrypt the API key before storing
    const encryptedApiKey = encrypt(validatedData.geminiApiKey);

    // Check if config already exists for this practice
    const existingConfig = await tenantDb.select().from(aiConfigs)
      .where(eq(aiConfigs.practiceId, practiceId))
      .limit(1);

  let result;
  // Use Date objects for Drizzle timestamp columns (mode: 'date')
  const now = new Date();
    
    if (existingConfig.length > 0) {
      // Update existing config
      result = await tenantDb.update(aiConfigs)
        .set({
          geminiApiKey: encryptedApiKey,
          isEnabled: validatedData.isEnabled,
          maxTokens: '1000', // Set programmatically
          temperature: '0.7', // Set programmatically
          configuredBy: Number(currentUser.id),
          updatedAt: now,
        })
        .where(eq(aiConfigs.practiceId, practiceId))
        .returning();
    } else {
      // Create new config
      result = await tenantDb.insert(aiConfigs).values({
        practiceId: practiceId,
        geminiApiKey: encryptedApiKey,
        isEnabled: validatedData.isEnabled,
        maxTokens: '1000', // Set programmatically
        temperature: '0.7', // Set programmatically
  configuredBy: Number(currentUser.id),
  createdAt: now,
  updatedAt: now,
      }).returning();
    }

    // Return success without the actual API key
    const saved = result[0] || {};
    return NextResponse.json({
      message: 'AI configuration saved successfully',
      config: {
        ...saved,
        createdAt: saved.createdAt ? new Date(saved.createdAt).toISOString() : null,
        updatedAt: saved.updatedAt ? new Date(saved.updatedAt).toISOString() : null,
        geminiApiKey: '***masked***',
        hasApiKey: true,
        configuredByUser: {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
        }
      }
    });

  } catch (error) {
    console.error('Error saving AI config:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to save AI configuration' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    // Get current user from session
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's practice ID
    let practiceId: number;
    if (currentUser.role === 'ADMINISTRATOR' || currentUser.role === 'SUPER_ADMIN') {
      if (currentUser.currentPracticeId == null) {
        // Get first accessible practice for admin
        const adminPractices = await tenantDb.select({ practiceId: administratorAccessiblePractices.practiceId })
          .from(administratorAccessiblePractices)
          .where(eq(administratorAccessiblePractices.administratorId, Number(currentUser.id)))
          .limit(1);
        
        if (adminPractices.length === 0) {
          return NextResponse.json({ error: 'No accessible practices found' }, { status: 400 });
        }
        practiceId = adminPractices[0].practiceId as number;
      } else {
        practiceId = currentUser.currentPracticeId as number;
      }
    } else {
      if (currentUser.currentPracticeId == null) {
        return NextResponse.json({ error: 'No practice associated with user' }, { status: 400 });
      }
      practiceId = currentUser.currentPracticeId as number;
    }

    const body = await request.json();
    const validatedData = updateAiConfigSchema.parse(body);

    // Build update object
    const updateObject: any = {
      // Store as Date instance to match schema timestamp mode
      updatedAt: new Date(),
  configuredBy: Number(currentUser.id),
    };

    if (validatedData.isEnabled !== undefined) {
      updateObject.isEnabled = validatedData.isEnabled;
    }

    // Encrypt API key if provided
    if (validatedData.geminiApiKey) {
      updateObject.geminiApiKey = encrypt(validatedData.geminiApiKey);
    }

    const result = await tenantDb.update(aiConfigs)
      .set(updateObject)
      .where(eq(aiConfigs.practiceId, practiceId))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: 'AI configuration not found' }, { status: 404 });
    }

    const updated = result[0] || {};
    return NextResponse.json({
      message: 'AI configuration updated successfully',
      config: {
        ...updated,
        createdAt: updated.createdAt ? new Date(updated.createdAt).toISOString() : null,
        updatedAt: updated.updatedAt ? new Date(updated.updatedAt).toISOString() : null,
        geminiApiKey: updated.geminiApiKey ? '***masked***' : null,
        hasApiKey: !!updated.geminiApiKey,
        configuredByUser: {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
        }
      }
    });

  } catch (error) {
    console.error('Error updating AI config:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update AI configuration' }, { status: 500 });
  }
}

// Helper function to get decrypted API key for internal use
export async function getDecryptedApiKey(practiceId: string): Promise<string | null> {
  try {
    const practiceIdNum = Number(practiceId);
    const tenantDb = await getCurrentTenantDb();
    const config = await tenantDb.select().from(aiConfigs)
      .where(and(eq(aiConfigs.practiceId, practiceIdNum), eq(aiConfigs.isEnabled, true)))
      .limit(1);

    if (config.length === 0 || !config[0].geminiApiKey) {
      return null;
    }

    return decrypt(config[0].geminiApiKey);
  } catch (error) {
    console.error('Error getting decrypted API key:', error);
    return null;
  }
}
