import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { vaccineTypes } from '@/db/schema';
import { getUserPractice } from '@/lib/auth-utils';
import { eq, and } from 'drizzle-orm';

// GET /api/vaccinations/types/species/[species] - Get vaccine types for a specific species
export async function GET(
  request: NextRequest,
  { params }: { params: { species: string } }
) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const species = params.species;

    // Validate species
    const validSpecies = ['dog', 'cat', 'bird', 'reptile', 'rabbit', 'ferret', 'other'];
    if (!validSpecies.includes(species)) {
      return NextResponse.json(
        { error: 'Invalid species' },
        { status: 400 }
      );
    }

    // Query vaccine types for the species
    const result = await db.query.vaccineTypes.findMany({
      where: and(
        eq(vaccineTypes.practiceId, parseInt(userPractice.practiceId)),
        eq(vaccineTypes.species, species as any),
        eq(vaccineTypes.isActive, true)
      ),
      orderBy: [vaccineTypes.type, vaccineTypes.name],
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching vaccine types by species:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vaccine types by species' },
      { status: 500 }
    );
  }
}
