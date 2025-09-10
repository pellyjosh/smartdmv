import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { vaccinations, vaccineTypes, pets, users } from '@/db/schema';
import { getUserPractice } from '@/lib/auth-utils';
import { eq, and, desc, gte, lte } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema for creating vaccinations
const createVaccinationSchema = z.object({
  petId: z.number(),
  vaccineTypeId: z.number().optional(),
  vaccineName: z.string().min(1),
  manufacturer: z.string().optional(),
  lotNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  expirationDate: z.string().optional(),
  administrationDate: z.string(),
  administrationSite: z.string().optional(),
  route: z.enum(['subcutaneous', 'intramuscular', 'intranasal', 'oral', 'topical']).optional(),
  dose: z.string().optional(),
  administeringVetId: z.number().optional(),
  nextDueDate: z.string().optional(),
  status: z.enum(['completed', 'scheduled', 'missed', 'cancelled']).default('completed'),
  reactions: z.string().optional(),
  notes: z.string().optional(),
});

type CreateVaccinationData = z.infer<typeof createVaccinationSchema>;

// GET /api/vaccinations - Get vaccinations for practice
export async function GET(request: NextRequest) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const practiceId = searchParams.get('practiceId') || userPractice.practiceId.toString();
    const petId = searchParams.get('petId');
    const status = searchParams.get('status');

    // Build conditions
    const conditions = [eq(vaccinations.practiceId, parseInt(practiceId))];
    
    if (petId) {
      conditions.push(eq(vaccinations.petId, parseInt(petId)));
    }
    
    if (status) {
      conditions.push(eq(vaccinations.status, status as any));
    }

    // Query vaccinations with related data
    const result = await db.query.vaccinations.findMany({
      where: and(...conditions),
      orderBy: desc(vaccinations.administrationDate),
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

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching vaccinations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vaccinations' },
      { status: 500 }
    );
  }
}

// POST /api/vaccinations - Create new vaccination record
export async function POST(request: NextRequest) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Allow only practice-level roles, administrators and super admins to create vaccinations
    const allowedRoles = ['PRACTICE_ADMINISTRATOR', 'VETERINARIAN', 'SUPER_ADMIN', 'ADMINISTRATOR'];
    if (!allowedRoles.includes(userPractice.userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createVaccinationSchema.parse(body) as CreateVaccinationData;

    // Check if pet belongs to the practice
    const pet = await db.query.pets.findFirst({
      where: and(
        eq(pets.id, Number(validatedData.petId)),
        eq(pets.practiceId, parseInt(userPractice.practiceId.toString()))
      ),
    });

    if (!pet) {
      return NextResponse.json(
        { error: 'Pet not found or does not belong to this practice' },
        { status: 404 }
      );
    }

    // Validate vaccine type if provided
    if (validatedData.vaccineTypeId) {
      const vaccineType = await db.query.vaccineTypes.findFirst({
        where: and(
          eq(vaccineTypes.id, Number(validatedData.vaccineTypeId)),
          eq(vaccineTypes.practiceId, parseInt(userPractice.practiceId.toString()))
        ),
      });

      if (!vaccineType) {
        return NextResponse.json(
          { error: 'Vaccine type not found or does not belong to this practice' },
          { status: 404 }
        );
      }
    }

    // Create vaccination record
    const insertData = {
      petId: Number(validatedData.petId),
      practiceId: parseInt(userPractice.practiceId.toString()),
      vaccineTypeId: validatedData.vaccineTypeId ? Number(validatedData.vaccineTypeId) : null,
      vaccineName: String(validatedData.vaccineName),
      manufacturer: validatedData.manufacturer ? String(validatedData.manufacturer) : null,
      lotNumber: validatedData.lotNumber ? String(validatedData.lotNumber) : null,
      serialNumber: validatedData.serialNumber ? String(validatedData.serialNumber) : null,
      expirationDate: validatedData.expirationDate ? new Date(String(validatedData.expirationDate)) : null,
      administrationDate: new Date(String(validatedData.administrationDate)),
      administrationSite: validatedData.administrationSite ? String(validatedData.administrationSite) : null,
      route: validatedData.route ? String(validatedData.route) : null,
      dose: validatedData.dose ? String(validatedData.dose) : null,
      administeringVetId: validatedData.administeringVetId ? Number(validatedData.administeringVetId) : null,
      nextDueDate: validatedData.nextDueDate ? new Date(String(validatedData.nextDueDate)) : null,
      status: String(validatedData.status),
      reactions: validatedData.reactions ? String(validatedData.reactions) : null,
      notes: validatedData.notes ? String(validatedData.notes) : null,
    };

    const [newVaccination] = await db.insert(vaccinations).values(insertData).returning();

    // Fetch the complete vaccination record with relations
    const completeVaccination = await db.query.vaccinations.findFirst({
      where: eq(vaccinations.id, newVaccination.id),
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

    return NextResponse.json(completeVaccination, { status: 201 });
  } catch (error) {
    console.error('Error creating vaccination:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create vaccination' },
      { status: 500 }
    );
  }
}
