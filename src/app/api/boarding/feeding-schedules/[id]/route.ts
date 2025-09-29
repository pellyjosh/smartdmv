import { NextResponse, NextRequest } from "next/server";
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { feedingSchedules } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  const { id } = params;

  if (!id) {
    return NextResponse.json(
      { error: 'Feeding schedule ID is required' }, 
      { status: 400 }
    );
  }
  // coerce id to number for integer primary keys
  const idNum = typeof id === 'string' ? parseInt(id, 10) : id;
  if (Number.isNaN(idNum)) {
    return NextResponse.json(
      { error: 'Invalid feeding schedule ID format' },
      { status: 400 }
    );
  }
  try {
    const feedingSchedule = await tenantDb.query.feedingSchedules.findFirst({
      where: (feedingSchedules, { eq }) => eq(feedingSchedules.id, idNum),
      with: {
          stay: {
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
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  const { id } = params;

  if (!id) {
    return NextResponse.json(
      { error: 'Feeding schedule ID is required' }, 
      { status: 400 }
    );
  }

  // coerce id to number for integer primary keys
  const idNum = typeof id === 'string' ? parseInt(id, 10) : id;
  if (Number.isNaN(idNum)) {
    return NextResponse.json(
      { error: 'Invalid feeding schedule ID format' },
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
    const existingSchedule = await tenantDb.query.feedingSchedules.findFirst({
      where: (feedingSchedules, { eq }) => eq(feedingSchedules.id, idNum)
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
  .where(eq(feedingSchedules.id, idNum))
      .returning();

    // Fetch the complete updated feeding schedule data with relations
    const completeFeedingSchedule = await tenantDb.query.feedingSchedules.findFirst({
      where: (feedingSchedules, { eq }) => eq(feedingSchedules.id, idNum),
      with: {
        stay: {
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
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  const { id } = params;

  if (!id) {
    return NextResponse.json(
      { error: 'Feeding schedule ID is required' }, 
      { status: 400 }
    );
  }

  // coerce id to number for integer primary keys
  const idNum = typeof id === 'string' ? parseInt(id, 10) : id;
  if (Number.isNaN(idNum)) {
    return NextResponse.json(
      { error: 'Invalid feeding schedule ID format' },
      { status: 400 }
    );
  }

  try {
    // Check if the feeding schedule exists
    const existingSchedule = await tenantDb.query.feedingSchedules.findFirst({
      where: (feedingSchedules, { eq }) => eq(feedingSchedules.id, idNum)
    });

    if (!existingSchedule) {
      return NextResponse.json(
        { error: 'Feeding schedule not found' },
        { status: 404 }
      );
    }

    await (db as any).delete(feedingSchedules)
  .where(eq(feedingSchedules.id, idNum));

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
