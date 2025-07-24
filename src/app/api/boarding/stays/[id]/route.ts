import { NextResponse, NextRequest } from "next/server";
import { db } from "@/db/index";
import { boardingStays } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: 'Stay ID is required' }, 
      { status: 400 }
    );
  }

  try {
    const stay = await db.query.boardingStays.findFirst({
      where: (boardingStays, { eq }) => eq(boardingStays.id, id),
      with: {
        pet: {
          with: {
            owner: true
          }
        },
        kennel: true,
        createdBy: true,
        requirements: true,
        feedingSchedules: true,
        medicationSchedules: true,
        activities: {
          with: {
            performedBy: true
          }
        }
      }
    });

    if (!stay) {
      return NextResponse.json(
        { error: 'Boarding stay not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(stay, { status: 200 });
  } catch (error) {
    console.error('Error fetching boarding stay:', error);
    return NextResponse.json(
      { error: 'Failed to fetch boarding stay due to a server error. Please try again later.' },
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
      { error: 'Stay ID is required' }, 
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const {
      checkInDate,
      plannedCheckOutDate,
      actualCheckOutDate,
      status,
      specialInstructions,
      emergencyContactName,
      emergencyContactPhone,
      reservationNotes,
      belongingsDescription,
      dailyRate
    } = body;

    // Update the boarding stay
    const updatedStay = await (db as any).update(boardingStays)
      .set({
        checkInDate: checkInDate ? new Date(checkInDate).toISOString() : undefined,
        plannedCheckOutDate: plannedCheckOutDate ? new Date(plannedCheckOutDate).toISOString() : undefined,
        actualCheckOutDate: actualCheckOutDate ? new Date(actualCheckOutDate).toISOString() : undefined,
        status,
        specialInstructions,
        emergencyContactName,
        emergencyContactPhone,
        reservationNotes,
        belongingsDescription,
        dailyRate
      })
      .where(eq(boardingStays.id, id))
      .returning();

    if (!updatedStay || updatedStay.length === 0) {
      return NextResponse.json(
        { error: 'Boarding stay not found' },
        { status: 404 }
      );
    }

    // Fetch the complete updated stay data with relations
    const completeStay = await db.query.boardingStays.findFirst({
      where: (boardingStays, { eq }) => eq(boardingStays.id, id),
      with: {
        pet: {
          with: {
            owner: true
          }
        },
        kennel: true,
        createdBy: true
      }
    });

    return NextResponse.json(completeStay, { status: 200 });
  } catch (error) {
    console.error('Error updating boarding stay:', error);
    return NextResponse.json(
      { error: 'Failed to update boarding stay due to a server error. Please try again later.' },
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
      { error: 'Stay ID is required' }, 
      { status: 400 }
    );
  }

  try {
    // Check if the stay exists
    const existingStay = await db.query.boardingStays.findFirst({
      where: (boardingStays, { eq }) => eq(boardingStays.id, id)
    });

    if (!existingStay) {
      return NextResponse.json(
        { error: 'Boarding stay not found' },
        { status: 404 }
      );
    }

    // Delete the boarding stay
    await (db as any).delete(boardingStays).where(eq(boardingStays.id, id));

    return NextResponse.json(
      { message: 'Boarding stay deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting boarding stay:', error);
    return NextResponse.json(
      { error: 'Failed to delete boarding stay due to a server error. Please try again later.' },
      { status: 500 }
    );
  }
}
