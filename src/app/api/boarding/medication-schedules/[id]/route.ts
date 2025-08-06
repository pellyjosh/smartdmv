import { NextResponse, NextRequest } from "next/server";
import { db } from "@/db/index";
import { medicationSchedules } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: 'Medication schedule ID is required' }, 
      { status: 400 }
    );
  }

  try {
    const medicationSchedule = await db.query.medicationSchedules.findFirst({
      where: (medicationSchedules, { eq }) => eq(medicationSchedules.id, id),
      with: {
        stay: {
          with: {
            pet: true
          }
        }
      }
    });

    if (!medicationSchedule) {
      return NextResponse.json(
        { error: 'Medication schedule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(medicationSchedule, { status: 200 });
  } catch (error) {
    console.error('Error fetching medication schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch medication schedule due to a server error. Please try again later.' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: 'Medication schedule ID is required' }, 
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { 
      medicationName, 
      dosage, 
      instructions, 
      frequency, 
      times, 
      nextDueDate, 
      isCompleted 
    } = body;

    // Check if the medication schedule exists
    const existingSchedule = await db.query.medicationSchedules.findFirst({
      where: (medicationSchedules, { eq }) => eq(medicationSchedules.id, id)
    });

    if (!existingSchedule) {
      return NextResponse.json(
        { error: 'Medication schedule not found' },
        { status: 404 }
      );
    }

    const updatedSchedule = await (db as any).update(medicationSchedules)
      .set({
        ...(medicationName && { medicationName }),
        ...(dosage && { dosage }),
        ...(instructions !== undefined && { instructions }),
        ...(frequency && { frequency }),
        ...(times !== undefined && { times }),
        ...(nextDueDate !== undefined && { nextDueDate: nextDueDate ? new Date(nextDueDate) : null }),
        ...(isCompleted !== undefined && { isCompleted })
      })
      .where(eq(medicationSchedules.id, id))
      .returning();

    // Fetch the complete updated medication schedule data with relations
    const completeMedicationSchedule = await db.query.medicationSchedules.findFirst({
      where: (medicationSchedules, { eq }) => eq(medicationSchedules.id, id),
      with: {
        stay: {
          with: {
            pet: true
          }
        }
      }
    });

    return NextResponse.json(completeMedicationSchedule, { status: 200 });
  } catch (error) {
    console.error('Error updating medication schedule:', error);
    return NextResponse.json(
      { error: 'Failed to update medication schedule due to a server error. Please try again later.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: 'Medication schedule ID is required' }, 
      { status: 400 }
    );
  }

  try {
    // Check if the medication schedule exists
    const existingSchedule = await db.query.medicationSchedules.findFirst({
      where: (medicationSchedules, { eq }) => eq(medicationSchedules.id, id)
    });

    if (!existingSchedule) {
      return NextResponse.json(
        { error: 'Medication schedule not found' },
        { status: 404 }
      );
    }

    await (db as any).delete(medicationSchedules)
      .where(eq(medicationSchedules.id, id));

    return NextResponse.json(
      { message: 'Medication schedule deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting medication schedule:', error);
    return NextResponse.json(
      { error: 'Failed to delete medication schedule due to a server error. Please try again later.' },
      { status: 500 }
    );
  }
}
