import { NextResponse, NextRequest } from "next/server";
import { db } from "@/db/index";
import { pets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth-utils";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user || user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Unauthorized. Client access required.' }, { status: 401 });
    }

    console.log('Fetching pets for client ID:', user.id);

    const petsData = await db.query.pets.findMany({
      where: eq(pets.ownerId, user.id),
      with: {
        owner: {
          columns: {
            id: true,
            name: true,
            email: true,
          }
        },
        practice: {
          columns: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: (pets, { asc }) => [asc(pets.name)]
    });

    console.log(`Found ${petsData.length} pets for client ${user.id}`);

    // Transform the data to match the frontend expectations
    const transformedPets = petsData.map(pet => {
      // Handle dateOfBirth - it might be a timestamp (number) or Date object
      let birthTime: number | null = null;
      if (pet.dateOfBirth) {
        if (typeof pet.dateOfBirth === 'number') {
          birthTime = pet.dateOfBirth;
        } else if (pet.dateOfBirth instanceof Date) {
          birthTime = pet.dateOfBirth.getTime();
        } else if (typeof pet.dateOfBirth === 'string') {
          birthTime = new Date(pet.dateOfBirth).getTime();
        }
      }
      
      return {
        ...pet,
        age: birthTime ? Math.floor((Date.now() - birthTime) / (365.25 * 24 * 60 * 60 * 1000)) : null,
        sex: pet.gender,
        photoUrl: pet.photoPath,
        species: pet.species || 'Unknown',
        breed: pet.breed || 'Mixed',
        vaccinationStatus: 'Up to date', // You'll need to calculate this based on actual vaccination records
        lastCheckup: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000), // Mock data - replace with actual
      };
    });

    return NextResponse.json(transformedPets, { status: 200 });
  } catch (error) {
    console.error('Error fetching client pets:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch pets due to a server error. Please try again later.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
