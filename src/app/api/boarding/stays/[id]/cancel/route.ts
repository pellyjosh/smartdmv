import { NextResponse, NextRequest } from "next/server";
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { boardingStays } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  const { id: idParam } = await params;

  if (!idParam) {
    return NextResponse.json(
      { error: 'Stay ID is required' }, 
      { status: 400 }
    );
  }

  const id = parseInt(idParam, 10);
  if (isNaN(id)) {
    return NextResponse.json(
      { error: 'Invalid Stay ID format' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { cancelledById } = body;

    // Check if the stay exists
    const existingStay = await tenantDb.query.boardingStays.findFirst({
      where: eq(boardingStays.id, id)
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

    // Update the stay to cancelled status using tenantDb
    await tenantDb.update(boardingStays)
      .set({
        status: 'cancelled',
        // If you have a cancelledById field in your schema, uncomment the line below
        // cancelledById: cancelledById
      })
      .where(eq(boardingStays.id, id))
      .returning();

    // Fetch the complete updated stay data with relations
    const completeStay = await tenantDb.query.boardingStays.findFirst({
      where: eq(boardingStays.id, id),
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
