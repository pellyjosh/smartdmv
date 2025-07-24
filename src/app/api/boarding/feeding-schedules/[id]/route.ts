import { NextResponse, NextRequest } from "next/server";
import { db } from "@/db/index";
import { feedingSchedules } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!id) {
    return NextResponse.json(
      { error: 'Feeding schedule ID is required' }, 
      { status: 400 }
    );
  }

  try {
    const feedingSchedule = await db.query.feedingSchedules.findFirst({
      where: (feedingSchedules, { eq }) => eq(feedingSchedules.id, id),
      with: {
        boardingStay: {
          with: {
            pet: true
          }
        }
      }
    });

    if (!feedingSchedule) {
      return NextResponse.json(
        { error: 'Feeding schedule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(feedingSchedule, { status: 200 });
  } catch (error) {
    console.error('Error fetching feeding schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feeding schedule due to a server error. Please try again later.' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!id) {
    return NextResponse.json(
      { error: 'Feeding schedule ID is required' }, 
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { 
      feedType, 
      amount, 
      unit, 
      instructions, 
      frequency, 
      times, 
      nextFeedingTime, 
      isCompleted 
    } = body;

    // Check if the feeding schedule exists
    const existingSchedule = await db.query.feedingSchedules.findFirst({
      where: (feedingSchedules, { eq }) => eq(feedingSchedules.id, id)
    });

    if (!existingSchedule) {
      return NextResponse.json(
        { error: 'Feeding schedule not found' },
        { status: 404 }
      );
    }

    const updatedSchedule = await (db as any).update(feedingSchedules)
      .set({
        ...(feedType && { feedType }),
        ...(amount !== undefined && { amount }),
        ...(unit !== undefined && { unit }),
        ...(instructions !== undefined && { instructions }),
        ...(frequency && { frequency }),
        ...(times !== undefined && { times }),
        ...(nextFeedingTime !== undefined && { nextFeedingTime: nextFeedingTime ? new Date(nextFeedingTime) : null }),
        ...(isCompleted !== undefined && { isCompleted })
      })
      .where(eq(feedingSchedules.id, id))
      .returning();

    // Fetch the complete updated feeding schedule data with relations
    const completeFeedingSchedule = await db.query.feedingSchedules.findFirst({
      where: (feedingSchedules, { eq }) => eq(feedingSchedules.id, id),
      with: {
        boardingStay: {
          with: {
            pet: true
          }
        }
      }
    });

    return NextResponse.json(completeFeedingSchedule, { status: 200 });
  } catch (error) {
    console.error('Error updating feeding schedule:', error);
    return NextResponse.json(
      { error: 'Failed to update feeding schedule due to a server error. Please try again later.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!id) {
    return NextResponse.json(
      { error: 'Feeding schedule ID is required' }, 
      { status: 400 }
    );
  }

  try {
    // Check if the feeding schedule exists
    const existingSchedule = await db.query.feedingSchedules.findFirst({
      where: (feedingSchedules, { eq }) => eq(feedingSchedules.id, id)
    });

    if (!existingSchedule) {
      return NextResponse.json(
        { error: 'Feeding schedule not found' },
        { status: 404 }
      );
    }

    await (db as any).delete(feedingSchedules)
      .where(eq(feedingSchedules.id, id));

    return NextResponse.json(
      { message: 'Feeding schedule deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting feeding schedule:', error);
    return NextResponse.json(
      { error: 'Failed to delete feeding schedule due to a server error. Please try again later.' },
      { status: 500 }
    );
  }
}
