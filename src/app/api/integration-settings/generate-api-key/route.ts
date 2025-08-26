import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { integrationSettings, integrationApiKeys } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getUserPractice } from '@/lib/auth-utils';
import crypto from 'crypto';

// POST /api/integration-settings/generate-api-key - Generate a new API key
export async function POST(request: NextRequest) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate a new API key
    const apiKey = `sk_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const keyPrefix = apiKey.substring(0, 10) + '...';

    // Default permissions for new API keys
    const defaultPermissions = ['read', 'write'];
    const defaultScopes = ['appointments', 'clients', 'availability'];

    // Create new API key record
    await db.insert(integrationApiKeys).values({
      practiceId: parseInt(userPractice.practiceId),
      keyName: `API Key ${new Date().toLocaleDateString()}`,
      keyHash,
      keyPrefix,
      permissions: JSON.stringify(defaultPermissions),
      scopes: JSON.stringify(defaultScopes),
      rateLimitPerHour: 100,
      rateLimitPerDay: 1000,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Update the integration settings with the new API key (for backward compatibility)
    const existingSettings = await db.query.integrationSettings.findFirst({
      where: eq(integrationSettings.practiceId, parseInt(userPractice.practiceId))
    });

    if (existingSettings) {
      // Update existing settings with new API key
      const apiSettingsString = Array.isArray(existingSettings.apiSettings) 
        ? existingSettings.apiSettings[0] 
        : existingSettings.apiSettings;
      const currentApiSettings = apiSettingsString ? JSON.parse(apiSettingsString) : {};
      const updatedApiSettings = {
        ...currentApiSettings,
        apiKey: apiKey,
        lastGenerated: new Date().toISOString()
      };

      await db
        .update(integrationSettings)
        .set({
          apiSettings: JSON.stringify(updatedApiSettings),
          updatedAt: new Date()
        })
        .where(eq(integrationSettings.id, existingSettings.id));
    } else {
      // Create new settings if they don't exist
      await db.insert(integrationSettings).values({
        practiceId: parseInt(userPractice.practiceId),
        apiSettings: JSON.stringify({
          apiKey: apiKey,
          lastGenerated: new Date().toISOString(),
          permissions: {
            readAccess: true,
            writeAccess: true,
            clientAccess: false,
            practitionerAccess: false
          }
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    return NextResponse.json({ 
      apiKey,
      keyPrefix,
      message: 'API key generated successfully'
    });
  } catch (error) {
    console.error('Error generating API key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
