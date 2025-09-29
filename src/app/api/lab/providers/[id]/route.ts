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
  apiKey: z.string().optional().nullable(),
  apiSecret: z.string().optional().nullable(),
  accountId: z.string().optional().nullable(),
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

// GET /api/lab/providers/[id] - Get a specific lab provider
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const { id } = await params;
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const provider = await db
      .select()
      .from(labProviderSettings)
      .where(
        and(
          eq(labProviderSettings.id, parseInt(id)),
          eq(labProviderSettings.practiceId, parseInt(userPractice.practiceId))
        )
      )
      .limit(1);

    if (provider.length === 0) {
      return NextResponse.json(
        { error: 'Lab provider not found' },
        { status: 404 }
      );
    }

    // Parse settings JSON string back to object
    const processedProvider = {
      ...provider[0],
      settings: provider[0].settings ? (() => {
        try {
          return typeof provider[0].settings === 'string' 
            ? JSON.parse(provider[0].settings) 
            : provider[0].settings;
        } catch {
          return {};
        }
      })() : {}
    };

    return NextResponse.json(processedProvider);
  } catch (error) {
    console.error('Error fetching lab provider:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lab provider' },
      { status: 500 }
    );
  }
}

// PUT /api/lab/providers/[id] - Update a lab provider
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const { id } = await params;
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = providerSettingsSchema.partial().parse(body);

    const [updatedProvider] = await db
      .update(labProviderSettings)
      .set({
        ...validated,
        settings: validated.settings ? JSON.stringify(validated.settings) : null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(labProviderSettings.id, parseInt(id)),
          eq(labProviderSettings.practiceId, parseInt(userPractice.practiceId))
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

// DELETE /api/lab/providers/[id] - Delete a lab provider
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const { id } = await params;
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [deletedProvider] = await db
      .delete(labProviderSettings)
      .where(
        and(
          eq(labProviderSettings.id, parseInt(id)),
          eq(labProviderSettings.practiceId, parseInt(userPractice.practiceId))
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
