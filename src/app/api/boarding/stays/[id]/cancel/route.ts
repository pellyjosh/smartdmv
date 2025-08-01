import { NextResponse, NextRequest } from "next/server";
import { db } from "@/db/index";
import { boardingStays } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
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
    const { cancelledById } = body;

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

    if (existingStay.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Stay is already cancelled' },
        { status: 400 }
      );
    }

    if (existingStay.status === 'checked_out') {
      return NextResponse.json(
        { error: 'Cannot cancel a completed stay' },
        { status: 400 }
      );
    }

    // Update the stay to cancelled status
    const updatedStay = await (db as any).update(boardingStays)
      .set({
        status: 'cancelled',
        // If you have a cancelledById field in your schema, uncomment the line below
        // cancelledById: cancelledById
      })
      .where(eq(boardingStays.id, id))
      .returning();

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
    console.error('Error cancelling boarding stay:', error);
    return NextResponse.json(
      { error: 'Failed to cancel boarding stay due to a server error. Please try again later.' },
      { status: 500 }
    );
  }
}
