import { NextResponse, NextRequest } from "next/server";
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { boardingStays } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: 'Stay ID is required' }, 
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { checkOutById } = body;

    // Check if the stay exists and is checked in
    const existingStay = await tenantDb.query.boardingStays.findFirst({
      where: (boardingStays, { eq }) => eq(boardingStays.id, id)
    });

    if (!existingStay) {
      return NextResponse.json(
        { error: 'Boarding stay not found' },
        { status: 404 }
      );
    }

    if (existingStay.status !== 'checked_in') {
      return NextResponse.json(
        { error: 'Only checked-in stays can be checked out' },
        { status: 400 }
      );
    }

    // Update the stay to checked_out status
    const updatedStay = await (db as any).update(boardingStays)
      .set({
        status: 'checked_out',
        actualCheckOutDate: new Date(),
        // If you have a checkOutById field in your schema, uncomment the line below
        // checkOutById: checkOutById
      })
      .where(eq(boardingStays.id, id))
      .returning();

    // Fetch the complete updated stay data with relations
    const completeStay = await tenantDb.query.boardingStays.findFirst({
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
    console.error('Error checking out boarding stay:', error);
    return NextResponse.json(
      { error: 'Failed to check out boarding stay due to a server error. Please try again later.' },
      { status: 500 }
    );
  }
}
