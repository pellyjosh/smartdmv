import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { pets } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request, context: { params: Promise<{ petId: string }> }) {
  const params = await context.params;
  const { petId } = params;
  const petIdInt = parseInt(petId, 10);
  if (!Number.isFinite(petIdInt)) {
    return NextResponse.json({ error: 'Invalid pet ID' }, { status: 400 });
  }

  console.log('Fetching pet data for Pet ID:', petId);

  try {
    // Query the database for the pet with the given ID
    const petData = await db.query.pets.findFirst({
      where: (pets, { eq }) => eq(pets.id, petIdInt),
      with: {
        owner: true
      }
    });

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
  const params = await context.params;
  const petIdInt = parseInt(params.petId, 10);
  if (!Number.isFinite(petIdInt)) {
    return NextResponse.json({ error: 'Invalid pet ID' }, { status: 400 });
  }
  try {
    const json = await request.json();
    const update: any = { ...json };
    if (update.dateOfBirth) {
      update.dateOfBirth = new Date(update.dateOfBirth);
    }
    const [updated] = await db.update(pets).set(update).where(eq(pets.id, petIdInt as any)).returning();
    if (!updated) return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('Error updating pet:', error);
    return NextResponse.json({ error: 'Failed to update pet' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ petId: string }> }) {
  const params = await context.params;
  const petIdInt = parseInt(params.petId, 10);
  if (!Number.isFinite(petIdInt)) {
    return NextResponse.json({ error: 'Invalid pet ID' }, { status: 400 });
  }
  try {
    const deleted = await db.delete(pets).where(eq(pets.id, petIdInt as any)).returning();
    if (!deleted || deleted.length === 0) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting pet:', error);
    return NextResponse.json({ error: 'Failed to delete pet' }, { status: 500 });
  }
}
