import { NextResponse, NextRequest } from "next/server";
import { db } from "@/db/index";
import { boardingStays } from "@/db/schema";
import { eq } from "drizzle-orm";
import { retryWithBackoff, analyzeError } from '@/lib/network-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idParam } = await params;

  if (!idParam) {
    return NextResponse.json(
      { error: 'Stay ID is required' }, 
      { status: 400 }
    );
  }

  // Convert ID to integer since the database uses serial (integer) for id
  const id = parseInt(idParam, 10);
  if (isNaN(id)) {
    return NextResponse.json(
      { error: 'Invalid Stay ID format' }, 
      { status: 400 }
    );
  }

  try {
    const stay = await retryWithBackoff(async () => {
      return await db.query.boardingStays.findFirst({
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
    }, 2, 1000);

    if (!stay) {
      return NextResponse.json(
        { error: 'Boarding stay not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(stay, { status: 200 });
  } catch (error) {
    const networkError = analyzeError(error);
    console.error('Error fetching boarding stay:', {
      id: idParam,
      isNetworkError: networkError.isNetworkError,
      isDatabaseError: networkError.isDatabaseError,
      userMessage: networkError.userMessage,
      technicalMessage: networkError.technicalMessage,
      originalError: error
    });

    // For network/database errors, return a more informative error message
    if (networkError.isNetworkError || networkError.isDatabaseError) {
      return NextResponse.json({ 
        error: networkError.userMessage,
        isNetworkError: networkError.isNetworkError 
      }, { status: 503 }); // Service Unavailable
    }

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
  const { id: idParam } = await params;

  if (!idParam) {
    return NextResponse.json(
      { error: 'Stay ID is required' }, 
      { status: 400 }
    );
  }

  // Convert ID to integer since the database uses serial (integer) for id
  const id = parseInt(idParam, 10);
  if (isNaN(id)) {
    return NextResponse.json(
      { error: 'Invalid Stay ID format' }, 
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
        checkInDate: checkInDate ? new Date(checkInDate) : undefined,
        plannedCheckOutDate: plannedCheckOutDate ? new Date(plannedCheckOutDate) : undefined,
        actualCheckOutDate: actualCheckOutDate ? new Date(actualCheckOutDate) : undefined,
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
    const networkError = analyzeError(error);
    console.error('Error updating boarding stay:', {
      id: idParam,
      isNetworkError: networkError.isNetworkError,
      isDatabaseError: networkError.isDatabaseError,
      userMessage: networkError.userMessage,
      technicalMessage: networkError.technicalMessage,
      originalError: error
    });

    // For network/database errors, return a more informative error message
    if (networkError.isNetworkError || networkError.isDatabaseError) {
      return NextResponse.json({ 
        error: networkError.userMessage,
        isNetworkError: networkError.isNetworkError 
      }, { status: 503 }); // Service Unavailable
    }

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
  const { id: idParam } = await params;

  if (!idParam) {
    return NextResponse.json(
      { error: 'Stay ID is required' }, 
      { status: 400 }
    );
  }

  // Convert ID to integer since the database uses serial (integer) for id
  const id = parseInt(idParam, 10);
  if (isNaN(id)) {
    return NextResponse.json(
      { error: 'Invalid Stay ID format' }, 
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
    const networkError = analyzeError(error);
    console.error('Error deleting boarding stay:', {
      id: idParam,
      isNetworkError: networkError.isNetworkError,
      isDatabaseError: networkError.isDatabaseError,
      userMessage: networkError.userMessage,
      technicalMessage: networkError.technicalMessage,
      originalError: error
    });

    // For network/database errors, return a more informative error message
    if (networkError.isNetworkError || networkError.isDatabaseError) {
      return NextResponse.json({ 
        error: networkError.userMessage,
        isNetworkError: networkError.isNetworkError 
      }, { status: 503 }); // Service Unavailable
    }

    return NextResponse.json(
      { error: 'Failed to delete boarding stay due to a server error. Please try again later.' },
      { status: 500 }
    );
  }
}
