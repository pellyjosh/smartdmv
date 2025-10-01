import { NextResponse, NextRequest } from "next/server";
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { medicationSchedules } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const { searchParams } = new URL(request.url);
    const stayId = searchParams.get('stayId');

    let medicationSchedulesList;

    if (stayId) {
      const stayIdNum = typeof stayId === 'string' ? parseInt(stayId, 10) : stayId;
      medicationSchedulesList = await tenantDb.query.medicationSchedules.findMany({
        where: eq(medicationSchedules.stayId, stayIdNum),
        with: {
          stay: {
            with: {
              pet: true
            }
          }
        }
      });
    } else {
      medicationSchedulesList = await tenantDb.query.medicationSchedules.findMany({
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
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const body = await request.json();
    let { 
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

    // Coerce numeric ids to numbers
    const stayIdNum = typeof stayId === 'string' ? parseInt(stayId, 10) : stayId;
    const practiceIdNum = typeof practiceId === 'string' ? parseInt(practiceId, 10) : practiceId;

    // Validate required fields
  if (!stayIdNum || !medicationName || !dosage || !frequency || !route || !startDate || !practiceIdNum) {
      return NextResponse.json(
        { error: 'Missing required fields: stayId, medicationName, dosage, frequency, route, startDate, and practiceId are required' },
        { status: 400 }
      );
    }

    // Check if the boarding stay exists
    const existingStay = await tenantDb.query.boardingStays.findFirst({
      where: eq((tenantDb.schema as any).boardingStays.id, stayIdNum)
    });

    if (!existingStay) {
      return NextResponse.json(
        { error: 'Boarding stay not found' },
        { status: 404 }
      );
    }

    // Insert and let the DB generate the integer primary key (id)
  const newMedicationSchedule = await tenantDb.insert(medicationSchedules)
      .values({
        stayId: stayIdNum,
        medicationName,
        dosage,
        frequency,
        route,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        specialInstructions: specialInstructions || null,
        lastAdministered: null,
        practiceId: practiceIdNum
      })
      .returning();

    // Use returned id from the insert to fetch the full record with relations
    const insertedId = Array.isArray(newMedicationSchedule) && newMedicationSchedule[0] ? newMedicationSchedule[0].id : (newMedicationSchedule as any).id;

    const completeMedicationSchedule = await tenantDb.query.medicationSchedules.findFirst({
      where: eq(medicationSchedules.id, insertedId),
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
