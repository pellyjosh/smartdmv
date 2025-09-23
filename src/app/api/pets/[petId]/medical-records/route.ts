import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { soapNotes } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request, context: { params: Promise<{ petId: string }> }) {
  try {
    const params = await context.params;
    const { petId } = params;
    const petIdInt = parseInt(petId, 10);
    
    if (!Number.isFinite(petIdInt)) {
      return NextResponse.json({ error: 'Invalid pet ID' }, { status: 400 });
    }

    console.log('Fetching medical records for Pet ID:', petId);

    // Query the database for SOAP notes for the given pet
    const medicalRecords = await db.query.soapNotes.findMany({
      where: (soapNotes, { eq }) => eq(soapNotes.petId, petIdInt),
      with: {
        practitioner: {
          columns: {
            id: true,
            name: true,
          }
        },
        appointment: {
          columns: {
            id: true,
            date: true,
            title: true,
            type: true,
          }
        }
      },
      orderBy: (soapNotes, { desc }) => [desc(soapNotes.createdAt)],
    });

    // Transform SOAP notes to medical records format expected by the frontend
    const transformedRecords = medicalRecords.map(record => ({
      id: record.id,
      title: record.appointment?.title || 'Medical Visit',
      date: record.createdAt,
      type: record.appointment?.type || 'checkup',
      veterinarian: record.practitioner 
        ? record.practitioner.name
        : 'Unknown Veterinarian',
      diagnosis: record.assessment,
      treatment: record.plan,
      notes: record.subjective,
      objective: record.objective,
      medications: [], // This could be expanded to include prescription data
    }));

    return NextResponse.json(transformedRecords, { status: 200 });
  } catch (error) {
    console.error('Error fetching medical records:', error);
    return NextResponse.json({ error: 'Failed to fetch medical records' }, { status: 500 });
  }
}
