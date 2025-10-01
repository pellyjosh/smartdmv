import { NextResponse, NextRequest } from "next/server";
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { kennels, boardingStays } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { retryWithBackoff, analyzeError } from '@/lib/network-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  const { id: idParam } = await params;

  if (!idParam) {
    return NextResponse.json(
      { error: 'Kennel ID is required' }, 
      { status: 400 }
    );
  }

  // Convert ID to integer since the database uses serial (integer) for id
  const id = parseInt(idParam, 10);
  if (isNaN(id)) {
    return NextResponse.json(
      { error: 'Invalid Kennel ID format' }, 
      { status: 400 }
    );
  }

  try {
    const kennel = await retryWithBackoff(async () => {
      return await tenantDb.query.kennels.findFirst({
        where: eq(kennels.id, id),
        with: {
          boardingStays: {
            with: {
              pet: {
                with: {
                  owner: true
                }
              }
            }
          }
        }
      });
    }, 2, 1000);

    if (!kennel) {
      return NextResponse.json(
        { error: 'Kennel not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(kennel, { status: 200 });
  } catch (error) {
    const networkError = analyzeError(error);
    console.error('Error fetching kennel:', {
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
      { error: 'Failed to fetch kennel due to a server error. Please try again later.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  const { id: idParam } = await params;

  if (!idParam) {
    return NextResponse.json(
      { error: 'Kennel ID is required' }, 
      { status: 400 }
    );
  }

  // Convert ID to integer since the database uses serial (integer) for id
  const id = parseInt(idParam, 10);
  if (isNaN(id)) {
    return NextResponse.json(
      { error: 'Invalid Kennel ID format' }, 
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const {
      name,
      type,
      size,
      location,
      description,
      isActive
    } = body;

    // Update the kennel
    const updatedKennel = await retryWithBackoff(async () => {
      return await tenantDb.update(kennels)
        .set({
          name,
          type,
          size,
          location,
          description,
          isActive,
          updatedAt: new Date()
        })
        .where(eq(kennels.id, id))
        .returning();
    }, 2, 1000);

    if (!updatedKennel || updatedKennel.length === 0) {
      return NextResponse.json(
        { error: 'Kennel not found' },
        { status: 404 }
      );
    }

    // Fetch the complete updated kennel data with relations
    const completeKennel = await retryWithBackoff(async () => {
      return await tenantDb.query.kennels.findFirst({
        where: eq(kennels.id, id),
        with: {
          boardingStays: {
            with: {
              pet: {
                with: {
                  owner: true
                }
              }
            }
          }
        }
      });
    }, 2, 1000);

    return NextResponse.json(completeKennel, { status: 200 });
  } catch (error) {
    const networkError = analyzeError(error);
    console.error('Error updating kennel:', {
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
      { error: 'Failed to update kennel due to a server error. Please try again later.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  const { id: idParam } = await params;

  if (!idParam) {
    return NextResponse.json(
      { error: 'Kennel ID is required' }, 
      { status: 400 }
    );
  }

  // Convert ID to integer since the database uses serial (integer) for id
  const id = parseInt(idParam, 10);
  if (isNaN(id)) {
    return NextResponse.json(
      { error: 'Invalid Kennel ID format' }, 
      { status: 400 }
    );
  }

  try {
    // Check if the kennel exists and has any active boarding stays
    const existingKennel = await retryWithBackoff(async () => {
      return await tenantDb.query.kennels.findFirst({
        where: eq(kennels.id, id),
        with: {
          boardingStays: {
            where: and(
              eq(boardingStays.kennelId, id),
              eq(boardingStays.status, 'checked_in')
            )
          }
        }
      });
    }, 2, 1000);

    if (!existingKennel) {
      return NextResponse.json(
        { error: 'Kennel not found' },
        { status: 404 }
      );
    }

    // Check if there are any active boarding stays
    if (existingKennel.boardingStays && existingKennel.boardingStays.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete kennel with active boarding stays. Please check out all pets first.' },
        { status: 409 } // Conflict
      );
    }

    // Soft delete by setting isActive to false instead of hard delete
    await retryWithBackoff(async () => {
      return await tenantDb.update(kennels)
        .set({ 
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(kennels.id, id));
    }, 2, 1000);

    return NextResponse.json(
      { message: 'Kennel deactivated successfully' },
      { status: 200 }
    );
  } catch (error) {
    const networkError = analyzeError(error);
    console.error('Error deleting kennel:', {
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
      { error: 'Failed to delete kennel due to a server error. Please try again later.' },
      { status: 500 }
    );
  }
}
