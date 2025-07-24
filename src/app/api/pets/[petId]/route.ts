import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { pets } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request, context: { params: Promise<{ petId: string }> }) {
  const params = await context.params;
  const { petId } = params;

  console.log('Fetching pet data for Pet ID:', petId);

  try {
    // Query the database for the pet with the given ID
    const petData = await db.query.pets.findFirst({
      where: (pets, { eq }) => eq(pets.id, petId),
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
