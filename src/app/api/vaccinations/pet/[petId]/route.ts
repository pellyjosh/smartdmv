import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { vaccinations, pets } from '@/db/schema';
import { getUserPractice } from '@/lib/auth-utils';
import { eq, and, desc } from 'drizzle-orm';

// GET /api/vaccinations/pet/[petId] - Get vaccinations for a specific pet
export async function GET(
  request: NextRequest,
  { params }: { params: { petId: string } }
) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const petId = parseInt(params.petId);

    // Verify pet belongs to the practice
    const pet = await db.query.pets.findFirst({
      where: and(
        eq(pets.id, petId),
        eq(pets.practiceId, parseInt(userPractice.practiceId))
      ),
    });

    if (!pet) {
      return NextResponse.json(
        { error: 'Pet not found or does not belong to this practice' },
        { status: 404 }
      );
    }

    // Query vaccinations for the pet
    const result = await db.query.vaccinations.findMany({
      where: eq(vaccinations.petId, petId),
      orderBy: desc(vaccinations.administrationDate),
      with: {
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
    console.error('Error fetching pet vaccinations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pet vaccinations' },
      { status: 500 }
    );
  }
}
