import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { vaccinations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/vaccinations/[id] - Get a specific vaccination record
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string  }> }
) {
  const resolvedParams = await params;
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vaccinationId = parseInt(resolvedParams.id);

    // Query vaccination with related data
    const vaccination = await tenantDb.query.vaccinations.findFirst({
      where: and(
        eq(vaccinations.id, vaccinationId),
        eq(vaccinations.practiceId, parseInt(userPractice.practiceId))
      ),
      with: {
        pet: {
          columns: {
            id: true,
            name: true,
            species: true,
            breed: true,
            dateOfBirth: true,
            gender: true,
            weight: true,
          },
          with: {
            owner: {
              columns: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        vaccineType: {
          columns: {
            id: true,
            name: true,
            type: true,
            species: true,
            durationOfImmunity: true,
            diseasesProtected: true,
            sideEffects: true,
            contraindications: true,
          },
        },
        administeringVet: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!vaccination) {
      return NextResponse.json(
        { error: 'Vaccination record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(vaccination);
  } catch (error) {
    console.error('Error fetching vaccination details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vaccination details' },
      { status: 500 }
    );
  }
}

// PUT /api/vaccinations/[id] - Update a vaccination record
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string  }> }
) {
  const resolvedParams = await params;
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vaccinationId = parseInt(resolvedParams.id);
    const body = await request.json();

    // Check if vaccination exists and belongs to the practice
    const existingVaccination = await tenantDb.query.vaccinations.findFirst({
      where: and(
        eq(vaccinations.id, vaccinationId),
        eq(vaccinations.practiceId, parseInt(userPractice.practiceId))
      ),
    });

    if (!existingVaccination) {
      return NextResponse.json(
        { error: 'Vaccination record not found' },
        { status: 404 }
      );
    }

    // Update vaccination record
    const [updatedVaccination] = await db
      .update(vaccinations)
      .set({
        ...body,
        administrationDate: body.administrationDate ? new Date(body.administrationDate) : undefined,
        expirationDate: body.expirationDate ? new Date(body.expirationDate) : undefined,
        nextDueDate: body.nextDueDate ? new Date(body.nextDueDate) : undefined,
      })
      .where(eq(vaccinations.id, vaccinationId))
      .returning();

    // Fetch the complete updated vaccination record
    const completeVaccination = await tenantDb.query.vaccinations.findFirst({
      where: eq(vaccinations.id, updatedVaccination.id),
      with: {
        pet: {
          columns: {
            id: true,
            name: true,
            species: true,
            breed: true,
          },
        },
        vaccineType: {
          columns: {
            id: true,
            name: true,
            type: true,
            durationOfImmunity: true,
          },
        },
        administeringVet: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(completeVaccination);
  } catch (error) {
    console.error('Error updating vaccination:', error);
    return NextResponse.json(
      { error: 'Failed to update vaccination' },
      { status: 500 }
    );
  }
}

// DELETE /api/vaccinations/[id] - Delete a vaccination record
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string  }> }
) {
  const resolvedParams = await params;
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vaccinationId = parseInt(resolvedParams.id);

    // Check if vaccination exists and belongs to the practice
    const existingVaccination = await tenantDb.query.vaccinations.findFirst({
      where: and(
        eq(vaccinations.id, vaccinationId),
        eq(vaccinations.practiceId, parseInt(userPractice.practiceId))
      ),
    });

    if (!existingVaccination) {
      return NextResponse.json(
        { error: 'Vaccination record not found' },
        { status: 404 }
      );
    }

    // Delete vaccination record
    await tenantDb.delete(vaccinations).where(eq(vaccinations.id, vaccinationId));

    return NextResponse.json({ message: 'Vaccination record deleted successfully' });
  } catch (error) {
    console.error('Error deleting vaccination:', error);
    return NextResponse.json(
      { error: 'Failed to delete vaccination' },
      { status: 500 }
    );
  }
}
