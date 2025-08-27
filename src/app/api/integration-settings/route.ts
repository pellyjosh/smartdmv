import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { integrationSettings } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getUserPractice } from '@/lib/auth-utils';

// GET /api/integration-settings - Get integration settings for the practice
export async function GET(request: NextRequest) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch existing settings for this practice
    const existingSettings = await db.query.integrationSettings.findFirst({
      where: eq(integrationSettings.practiceId, parseInt(userPractice.practiceId))
    });

    if (!existingSettings) {
      // Return default settings if none exist
      return NextResponse.json({
        widgetSettings: null,
        apiSettings: null,
        websiteUrl: '',
        isVerified: false
      });
    }

    return NextResponse.json({
      widgetSettings: typeof existingSettings.widgetSettings === 'string'
        ? JSON.parse(existingSettings.widgetSettings)
        : null,
      apiSettings: typeof existingSettings.apiSettings === 'string'
        ? JSON.parse(existingSettings.apiSettings)
        : null,
      websiteUrl: existingSettings.websiteUrl || '',
      isVerified: existingSettings.isVerified || false
    });
  } catch (error) {
    console.error('Error fetching integration settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/integration-settings - Save integration settings
export async function POST(request: NextRequest) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { widgetSettings, apiSettings, websiteUrl } = body;

    // Validate the request body
    if (!widgetSettings && !apiSettings && !websiteUrl) {
      return NextResponse.json({ error: 'At least one setting must be provided' }, { status: 400 });
    }

    // Check if settings already exist
    const existingSettings = await db.query.integrationSettings.findFirst({
      where: eq(integrationSettings.practiceId, parseInt(userPractice.practiceId))
    });

    const settingsData = {
      practiceId: parseInt(userPractice.practiceId),
      widgetSettings: widgetSettings ? JSON.stringify(widgetSettings) : null,
      apiSettings: apiSettings ? JSON.stringify(apiSettings) : null,
      websiteUrl: websiteUrl || null,
      updatedAt: new Date()
    };

    if (existingSettings) {
      // Update existing settings
      await db
        .update(integrationSettings)
        .set(settingsData)
        .where(eq(integrationSettings.id, existingSettings.id));
    } else {
      // Create new settings
      await db.insert(integrationSettings).values({
        ...settingsData,
        createdAt: new Date()
      });
    }

    return NextResponse.json({ success: true, message: 'Settings saved successfully' });
  } catch (error) {
    console.error('Error saving integration settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
