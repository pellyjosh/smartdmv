import { NextResponse, NextRequest } from "next/server";
import { db } from "@/db/index";
import { medicationSchedules } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stayId = searchParams.get('stayId');

    let medicationSchedulesList;

    if (stayId) {
      medicationSchedulesList = await db.query.medicationSchedules.findMany({
        where: (medicationSchedules, { eq }) => eq(medicationSchedules.stayId, stayId),
        with: {
          stay: {
            with: {
              pet: true
            }
          }
        }
      });
    } else {
      medicationSchedulesList = await db.query.medicationSchedules.findMany({
        with: {
          stay: {
            with: {
              pet: true
            }
          }
        }
      });
    }

    return NextResponse.json(medicationSchedulesList, { status: 200 });
  } catch (error) {
    console.error('Error fetching medication schedules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch medication schedules due to a server error. Please try again later.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      stayId, 
      medicationName, 
      dosage, 
      frequency, 
      route, 
      startDate, 
      endDate, 
      specialInstructions,
      practiceId 
    } = body;

    // Validate required fields
    if (!stayId || !medicationName || !dosage || !frequency || !route || !startDate || !practiceId) {
      return NextResponse.json(
        { error: 'Missing required fields: stayId, medicationName, dosage, frequency, route, startDate, and practiceId are required' },
        { status: 400 }
      );
    }

    // Check if the boarding stay exists
    const existingStay = await db.query.boardingStays.findFirst({
      where: (boardingStays, { eq }) => eq(boardingStays.id, stayId)
    });

    if (!existingStay) {
      return NextResponse.json(
        { error: 'Boarding stay not found' },
        { status: 404 }
      );
    }

    const medicationId = randomUUID();

    const newMedicationSchedule = await (db as any).insert(medicationSchedules)
      .values({
        id: medicationId,
        stayId,
        medicationName,
        dosage,
        frequency,
        route,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        specialInstructions: specialInstructions || null,
        lastAdministered: null,
        practiceId
      })
      .returning();

    // Fetch the complete medication schedule data with relations
    const completeMedicationSchedule = await db.query.medicationSchedules.findFirst({
      where: (medicationSchedules, { eq }) => eq(medicationSchedules.id, medicationId),
      with: {
        stay: {
          with: {
            pet: true
          }
        }
      }
    });

    return NextResponse.json(completeMedicationSchedule, { status: 201 });
  } catch (error) {
    console.error('Error creating medication schedule:', error);
    return NextResponse.json(
      { error: 'Failed to create medication schedule due to a server error. Please try again later.' },
      { status: 500 }
    );
  }
}
