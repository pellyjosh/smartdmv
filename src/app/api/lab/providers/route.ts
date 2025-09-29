import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { labProviderSettings } from '@/db/schemas/labSchema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema for provider settings
const providerSettingsSchema = z.object({
  provider: z.enum(['idexx', 'antech', 'zoetis', 'heska', 'in_house', 'other']),
  apiKey: z.string().nullable().optional(),
  apiSecret: z.string().nullable().optional(),
  accountId: z.string().nullable().optional(),
  inHouseEquipment: z.string().optional(),
  inHouseContact: z.string().optional(),
  inHouseLocation: z.string().optional(),
  isActive: z.boolean().default(true),
  settings: z.union([z.string(), z.record(z.any())]).optional().transform((val) => {
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch {
        return {};
      }
    }
    return val;
  }),
});

export async function GET(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const providers = await db
      .select()
      .from(labProviderSettings)
      .where(eq(labProviderSettings.practiceId, userPractice.practiceId));

    // Parse settings JSON strings back to objects
    const processedProviders = providers.map(provider => ({
      ...provider,
      settings: provider.settings ? (() => {
        try {
          return JSON.parse(provider.settings);
        } catch {
          return {};
        }
      })() : {}
    }));

    return NextResponse.json(processedProviders);
  } catch (error) {
    console.error('Error fetching lab providers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = providerSettingsSchema.parse(body);

    const [provider] = await db
      .insert(labProviderSettings)
      .values({
        ...validated,
        practiceId: userPractice.practiceId,
        settings: validated.settings ? JSON.stringify(validated.settings) : null,
      })
      .returning();

    return NextResponse.json(provider, { status: 201 });
  } catch (error) {
    console.error('Error creating lab provider:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'Provider ID is required' }, { status: 400 });
    }

    const validated = providerSettingsSchema.partial().parse(updateData);

    const [updatedProvider] = await db
      .update(labProviderSettings)
      .set({
        ...validated,
        settings: validated.settings ? JSON.stringify(validated.settings) : null,
        updatedAt: Date.now(), // Use timestamp in milliseconds for SQLite
      })
      .where(
        and(
          eq(labProviderSettings.id, id),
          eq(labProviderSettings.practiceId, userPractice.practiceId)
        )
      )
      .returning();

    if (!updatedProvider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    return NextResponse.json(updatedProvider);
  } catch (error) {
    console.error('Error updating lab provider:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Provider ID is required' }, { status: 400 });
    }

    const [deletedProvider] = await db
      .delete(labProviderSettings)
      .where(
        and(
          eq(labProviderSettings.id, parseInt(id)),
          eq(labProviderSettings.practiceId, userPractice.practiceId)
        )
      )
      .returning();

    if (!deletedProvider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Provider deleted successfully' });
  } catch (error) {
    console.error('Error deleting lab provider:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
