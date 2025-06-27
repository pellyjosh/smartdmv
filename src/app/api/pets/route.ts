import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { schema } from '@/db/schema';
import { db } from '@/db';
import { User } from '@/context/UserContext'; // Adjust path if needed

const CreatePetSchema = z.object({
  name: z.string().min(1),
  species: z.string().optional(),
  breed: z.string().optional(),
  dateOfBirth: z.string().optional(), // Assuming string format for date
  ownerId: z.string().uuid(),
  practiceId: z.string().uuid(),
});

const UpdatePetSchema = z.object({
  name: z.string().min(1).optional(),
  species: z.string().optional(),
  breed: z.string().optional(),
  dateOfBirth: z.string().optional(),
  ownerId: z.string().uuid().optional(),
  practiceId: z.string().uuid().optional(),
});

// GET all pets or pets for a specific practice
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const practiceId = searchParams.get('practiceId');

    let results;
    if (practiceId) {
      results = await db.select({ ...schema.pets, ownerName: schema.users.name }).from(schema.pets).leftJoin(schema.users, eq(schema.pets.ownerId, schema.users.id)).where(eq(schema.pets.practiceId, practiceId));
    } else {
      results = await db.select().from(schema.pets);
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error fetching pets:', error);
    return NextResponse.json({ error: 'Failed to fetch pets' }, { status: 500 });
  }
}

// POST - Create a new pet
export async function POST(req: Request) {
  console.log("posting a pet")
  try {
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const json = await req.json();
    const validatedData = CreatePetSchema.parse(json);

    const newPet = await db.insert(schema.pets).values(validatedData).returning();

    return NextResponse.json(newPet[0], { status: 201 });
  } catch (error: any) {
    console.error('Error creating pet:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create pet' }, { status: 500 });
  }
}

export async function DELETE(req: Request, res: NextResponse) {
  try {
    const { searchParams } = new URL(req.url);
    const petId = searchParams.get('id');

    await db.delete(schema.pets).where(eq(schema.pets.id, petId));

    return NextResponse.json({ message: 'Pet deleted successfully' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete pet' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const petId = searchParams.get('id');
    if (!petId) {
      return NextResponse.json({ error: "Pet ID is required" }, { status: 400 });
    }

    const json = await req.json();
    const validatedData = UpdatePetSchema.partial().parse(json); // Use .partial() for optional updates

    const updatedPet = await db
      .update(schema.pets)
      .set(validatedData)
      .where(eq(schema.pets.id, petId))
      .returning();

    if (updatedPet.length === 0) {
      return NextResponse.json({ error: "Pet not found" }, { status: 404 });
    }

    return NextResponse.json(updatedPet[0], { status: 200 });
  } catch (error) {
    console.error("Error updating pet:", error);
    return NextResponse.json({ error: "Failed to update pet" }, { status: 500 });
  }
}