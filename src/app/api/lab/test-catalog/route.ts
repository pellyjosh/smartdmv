import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { labTestCatalog } from '@/db/schemas/labSchema';
import { eq, and, like } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema for lab test
const testCatalogSchema = z.object({
  testCode: z.string().optional(), // Made optional since it can be auto-generated
  testName: z.string().min(1, "Test name is required"), // Reverted back to testName
  category: z.enum(['blood_chemistry', 'hematology', 'urinalysis', 'pathology', 'microbiology', 
                   'parasitology', 'endocrinology', 'serology', 'cytology', 'imaging', 'rapid_test', 'panel', 'other']),
  description: z.string().optional().nullable(),
  provider: z.enum(['idexx', 'antech', 'zoetis', 'heska', 'in_house', 'other']),
  price: z.string().optional().nullable(),
  turnAroundTime: z.string().optional().nullable(),
  practiceId: z.string().optional(), // Made optional since it's set by the server from user context
  isActive: z.boolean().default(true),
  referenceRanges: z.string().optional().nullable(),
  instructions: z.string().optional().nullable(),
  isPanel: z.boolean().default(false),
  panelTestIds: z.string().optional().nullable(),
  // Frontend form fields that aren't stored in the database (will be ignored)
  sampleType: z.string().optional().nullable(),
  sampleVolume: z.string().optional().nullable(),
}).transform(({ sampleType, sampleVolume, ...rest }) => rest); // Remove frontend-only fields

const partialTestCatalogSchema = z.object({
  testCode: z.string().optional(),
  testName: z.string().optional(), // Reverted back to testName
  category: z.enum(['blood_chemistry', 'hematology', 'urinalysis', 'pathology', 'microbiology', 
                   'parasitology', 'endocrinology', 'serology', 'cytology', 'imaging', 'rapid_test', 'panel', 'other']).optional(),
  description: z.string().optional().nullable(),
  provider: z.enum(['idexx', 'antech', 'zoetis', 'heska', 'in_house', 'other']).optional(),
  price: z.string().optional().nullable(),
  turnAroundTime: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  referenceRanges: z.string().optional().nullable(),
  instructions: z.string().optional().nullable(),
  isPanel: z.boolean().optional(),
  panelTestIds: z.string().optional().nullable(),
  // Frontend form fields that aren't stored in the database (will be ignored)
  sampleType: z.string().optional().nullable(),
  sampleVolume: z.string().optional().nullable(),
}).transform(({ sampleType, sampleVolume, ...rest }) => rest); // Remove frontend-only fields

// GET /api/lab/test-catalog - Get all lab tests
export async function GET(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const provider = searchParams.get('provider');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const isActive = searchParams.get('isActive');

    let whereConditions = [eq(labTestCatalog.practiceId, parseInt(userPractice.practiceId))];

    if (provider) {
      whereConditions.push(eq(labTestCatalog.provider, provider as any));
    }
    if (category) {
      whereConditions.push(eq(labTestCatalog.category, category as any));
    }
    if (search) {
      whereConditions.push(like(labTestCatalog.testName, `%${search}%`));
    }
    if (isActive !== null) {
      whereConditions.push(eq(labTestCatalog.isActive, isActive === 'true'));
    }

    const tests = await db
      .select()
      .from(labTestCatalog)
      .where(and(...whereConditions))
      .orderBy(labTestCatalog.testName);

    return NextResponse.json(tests);
  } catch (error) {
    console.error('Error fetching lab tests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/lab/test-catalog - Create a new lab test
export async function POST(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = testCatalogSchema.parse(body);

    // Generate testCode if not provided
    const testCode = validated.testCode || 
      `${validated.provider.toUpperCase()}-${validated.testName.replace(/[^A-Za-z0-9]/g, '').toUpperCase().substring(0, 10)}-${Date.now().toString().slice(-4)}`;

    const [test] = await db
      .insert(labTestCatalog)
      .values({
        ...validated,
        testCode,
        practiceId: parseInt(userPractice.practiceId),
        referenceRanges: validated.referenceRanges || null,
        panelTestIds: validated.panelTestIds || null,
      })
      .returning();

    return NextResponse.json(test, { status: 201 });
  } catch (error) {
    console.error('Error creating lab test:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/lab/test-catalog - Update a lab test
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
      return NextResponse.json({ error: 'Test ID is required' }, { status: 400 });
    }

    const validated = partialTestCatalogSchema.parse(updateData);

    const [updatedTest] = await db
      .update(labTestCatalog)
      .set({
        ...validated,
        referenceRanges: validated.referenceRanges || undefined,
        panelTestIds: validated.panelTestIds || undefined,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(labTestCatalog.id, id),
          eq(labTestCatalog.practiceId, parseInt(userPractice.practiceId))
        )
      )
      .returning();

    if (!updatedTest) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    return NextResponse.json(updatedTest);
  } catch (error) {
    console.error('Error updating lab test:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/lab/test-catalog - Delete a lab test
export async function DELETE(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Test ID is required' }, { status: 400 });
    }

    const [deletedTest] = await db
      .delete(labTestCatalog)
      .where(
        and(
          eq(labTestCatalog.id, parseInt(id)),
          eq(labTestCatalog.practiceId, parseInt(userPractice.practiceId))
        )
      )
      .returning();

    if (!deletedTest) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Test deleted successfully' });
  } catch (error) {
    console.error('Error deleting lab test:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
