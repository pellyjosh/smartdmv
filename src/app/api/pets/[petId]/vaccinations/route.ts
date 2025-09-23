import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { vaccinations } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request, context: { params: Promise<{ petId: string }> }) {
  try {
    const params = await context.params;
    const { petId } = params;
    const petIdInt = parseInt(petId, 10);
    
    if (!Number.isFinite(petIdInt)) {
      return NextResponse.json({ error: 'Invalid pet ID' }, { status: 400 });
    }

    console.log('Fetching vaccinations for Pet ID:', petId);

    // Query the database for vaccinations for the given pet
    const vaccinationRecords = await db.query.vaccinations.findMany({
      where: (vaccinations, { eq }) => eq(vaccinations.petId, petIdInt),
      with: {
        vaccineType: true,
        administeringVet: {
          columns: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: (vaccinations, { desc }) => [desc(vaccinations.administrationDate)],
    });

    // Transform vaccination records to the format expected by the frontend
    const transformedVaccinations = vaccinationRecords.map(vaccination => {
      const isCompleted = vaccination.status === 'completed';
      const administrationDate = vaccination.administrationDate;
      const nextDueDate = vaccination.nextDueDate;

      return {
        id: vaccination.id,
        name: vaccination.vaccineName,
        completed: isCompleted,
        completedDate: isCompleted ? administrationDate : null,
        dueDate: nextDueDate,
        nextDue: nextDueDate,
        manufacturer: vaccination.manufacturer,
        lotNumber: vaccination.lotNumber,
        veterinarian: vaccination.administeringVet 
          ? vaccination.administeringVet.name
          : null,
        administrationSite: vaccination.administrationSite,
        dose: vaccination.dose,
        reactions: vaccination.reactions,
        notes: vaccination.notes,
        status: vaccination.status,
      };
    });

    return NextResponse.json(transformedVaccinations, { status: 200 });
  } catch (error) {
    console.error('Error fetching vaccinations:', error);
    return NextResponse.json({ error: 'Failed to fetch vaccinations' }, { status: 500 });
  }
}
