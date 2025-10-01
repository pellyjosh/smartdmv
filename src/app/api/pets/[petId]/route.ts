import { NextResponse } from "next/server";
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { pets } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { success } from "zod/v4";

export async function GET(request: Request, context: { params: Promise<{ petId: string }> }) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  const params = await context.params;
  const { petId } = params;
  const petIdInt = parseInt(petId, 10);
  if (!Number.isFinite(petIdInt)) {
    return NextResponse.json({ error: 'Invalid pet ID' }, { status: 400 });
  }

  console.log('Fetching pet data for Pet ID:', petId);

  try {
    // Query the database for the pet with the given ID
    // Manual select to avoid typing issues in callback
    const petRows = await tenantDb.select().from(pets).where(eq(pets.id, petIdInt));
    const petData = petRows[0] || null;

    if (!petData) {
      console.log('Pet not found for ID:', petId);
      return NextResponse.json({ error: 'Pet not found. Please ensure the pet ID is correct and data exists in the database.' }, { status: 404 });
    }

    return NextResponse.json(petData, { status: 200 });
  } catch (error) {
    console.error('Error fetching pet data:', error);
    return NextResponse.json({ error: 'Failed to fetch pet data due to a server error. Please try again later.' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ petId: string }> }) {
    const tenantDb = await getCurrentTenantDb();
    const params = await context.params;
    const { petId } = params;
    const petIdInt = parseInt(petId, 10);

    if (!Number.isFinite(petIdInt)) {
        return NextResponse.json({ error: 'Invalid pet ID' }, { status: 400 });
    }

    try {
        const body = await request.json();

        // Exclude fields that should not be updated by the client
        delete body.id;
        delete body.ownerId; // Should not be changed via this endpoint
        delete body.practiceId; // Should not be changed via this endpoint
        delete body.createdAt;
        delete body.updatedAt;

        // Specifically handle dateOfBirth to ensure it's in the correct format
        if (body.dateOfBirth !== undefined) {
            if (body.dateOfBirth) {
                const date = new Date(body.dateOfBirth);
                if (!isNaN(date.getTime())) {
                    body.dateOfBirth = date;
                } else {
                    body.dateOfBirth = null; // Set to null if invalid
                }
            } else {
                body.dateOfBirth = null; // Set to null if falsy (null, empty string)
            }
        }

        if (Object.keys(body).length === 0) {
            return NextResponse.json({ error: 'No update data provided' }, { status: 400 });
        }

        body.updatedAt = new Date();

        console.log('Updating pet with data:', body);

        const updatedPet = await tenantDb.update(pets)
            .set(body)
            .where(eq(pets.id, petIdInt))
            .returning();

        if (!updatedPet || updatedPet.length === 0) {
            return NextResponse.json({ error: 'Pet not found or failed to update' }, { status: 404 });
        }

        return NextResponse.json(updatedPet[0], { status: 200 });
    } catch (error) {
        console.error('Error updating pet:', error);
        return NextResponse.json({ error: 'Failed to update pet due to a server error.' }, { status: 500 });
    }
}

export async function DELETE(request: Request, context: { params: Promise<{ petId: string }> }) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  const params = await context.params;
  const petIdInt = parseInt(params.petId, 10);
  if (!Number.isFinite(petIdInt)) {
    return NextResponse.json({ error: 'Invalid pet ID' }, { status: 400 });
  }
  try {
    const deleted = await tenantDb.delete(pets).where(eq(pets.id, petIdInt as any)).returning();
    if (!deleted || deleted.length === 0) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting pet:', error);
    return NextResponse.json({ error: 'Failed to delete pet' }, { status: 500 });
  }
}
