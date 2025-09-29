import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { vaccineTypes } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema for creating vaccine types
const createVaccineTypeSchema = z.object({
  name: z.string().min(1),
  // allow case-insensitive input by lower-casing strings before enum validation
  type: z.preprocess((val) => (typeof val === 'string' ? val.toLowerCase() : val), z.enum(['core', 'non-core', 'optional'])),
  species: z.preprocess((val) => (typeof val === 'string' ? val.toLowerCase() : val), z.enum(['dog', 'cat', 'bird', 'reptile', 'rabbit', 'ferret', 'other'])),
  manufacturer: z.string().optional(),
  diseasesProtected: z.string().optional(), // JSON string
  recommendedSchedule: z.string().optional(), // JSON string
  durationOfImmunity: z.string().optional(),
  sideEffects: z.string().optional(),
  contraindications: z.string().optional(),
  isActive: z.boolean().default(true),
});

// GET /api/vaccinations/types - Get vaccine types for practice
export async function GET(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
  const practiceId = searchParams.get('practiceId') || userPractice.practiceId;
  const speciesParam = searchParams.get('species');
  const typeParam = searchParams.get('type');

  // Normalize query params to lowercase so 'Dog' and 'dog' behave the same
  const species = typeof speciesParam === 'string' ? speciesParam.toLowerCase() : speciesParam;
  const type = typeof typeParam === 'string' ? typeParam.toLowerCase() : typeParam;
    const isActive = searchParams.get('isActive');

    // Build conditions
    const conditions = [eq(vaccineTypes.practiceId, parseInt(practiceId))];
    
    if (species && species !== 'all') {
      conditions.push(eq(vaccineTypes.species, species as any));
    }

    if (type && type !== 'all') {
      conditions.push(eq(vaccineTypes.type, type as any));
    }
    
    if (isActive !== null) {
      conditions.push(eq(vaccineTypes.isActive, isActive === 'true'));
    }

    // Query vaccine types
    const result = await tenantDb.query.vaccineTypes.findMany({
      where: and(...conditions),
      orderBy: [desc(vaccineTypes.isActive), vaccineTypes.name],
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching vaccine types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vaccine types' },
      { status: 500 }
    );
  }
}

// POST /api/vaccinations/types - Create new vaccine type
export async function POST(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createVaccineTypeSchema.parse(body);

    // Check for duplicate vaccine type names within the practice
    const existingVaccineType = await tenantDb.query.vaccineTypes.findFirst({
      where: and(
        eq(vaccineTypes.practiceId, parseInt(userPractice.practiceId)),
        eq(vaccineTypes.name, validatedData.name),
        eq(vaccineTypes.species, validatedData.species)
      ),
    });

    if (existingVaccineType) {
      return NextResponse.json(
        { error: 'A vaccine type with this name already exists for this species' },
        { status: 409 }
      );
    }

    // Create vaccine type
    const [newVaccineType] = await tenantDb.insert(vaccineTypes).values({
      ...validatedData,
      practiceId: parseInt(userPractice.practiceId),
    }).returning();

    return NextResponse.json(newVaccineType, { status: 201 });
  } catch (error) {
    console.error('Error creating vaccine type:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create vaccine type' },
      { status: 500 }
    );
  }
}
