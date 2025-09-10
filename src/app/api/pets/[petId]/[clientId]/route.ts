import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { schema } from '@/db/schema';
import { db } from '@/db';
import { User } from '@/context/UserContext'; // Adjust path if needed

const CreatePetSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  species: z.string().min(1, { message: "Species is required." }),
  breed: z.string().optional(),
  dateOfBirth: z.string().optional(),
  weight: z.string().optional(),
  allergies: z.string().optional(),
  color: z.string().optional(),
  gender: z.string().optional(),
  microchipNumber: z.string().optional(),
  ownerId: z.string().uuid({ message: "Invalid owner ID format." }),
  practiceId: z.string().min(1, { message: "Practice ID is required." }), // Changed to min(1) if not strictly UUID
  photoPath: z.string().url("Must be a valid URL").nullable().optional(),
});

const UpdatePetSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).optional(),
  species: z.string().min(1, { message: "Species is required." }).optional(),
  breed: z.string().optional(),
  dateOfBirth: z.string().optional(),
  weight: z.string().optional(),
  allergies: z.string().optional(),
  color: z.string().optional(),
  gender: z.string().optional(),
  microchipNumber: z.string().optional(),
  ownerId: z.string().uuid({ message: "Invalid owner ID format." }).optional(),
  practiceId: z.string().min(1, { message: "Practice ID is required." }).optional(), // Changed to min(1) if not strictly UUID
  photoPath: z.string().url("Must be a valid URL").nullable().optional(),
});

// GET all pets or pets for a specific practice
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const practiceId = searchParams.get('practiceId');

    let results;
    if (practiceId) {
      const practiceIdNum = parseInt(practiceId, 10);
      results = await db
        .select({ ...schema.pets, ownerName: schema.users.name })
        .from(schema.pets)
        .leftJoin(schema.users, eq(schema.pets.ownerId, schema.users.id))
        .where(eq(schema.pets.practiceId, practiceIdNum));
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
  const body = await req.json();

  try {

    console.log('Posting a pet request:', await body);
    
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const validatedResult = CreatePetSchema.safeParse(body);

  if (!validatedResult.success) {
    console.error('Invalid data for pet creation:', validatedResult.error.errors);
    return NextResponse.json({ 
      error: 'Invalid data', 
      details: validatedResult.error.errors 
    }, { status: 400 });
  }

  // THIS IS THE CRITICAL CHANGE: Access the 'data' property
  const petDataToInsert = validatedResult.data;

  // Normalize numeric fields expected by the DB
  const insertData: any = { ...petDataToInsert };
  if (typeof insertData.practiceId === 'string') {
    const parsed = parseInt(insertData.practiceId, 10);
    insertData.practiceId = Number.isNaN(parsed) ? insertData.practiceId : parsed;
  }
  if (typeof insertData.ownerId === 'string') {
    const parsed = parseInt(insertData.ownerId, 10);
    insertData.ownerId = Number.isNaN(parsed) ? insertData.ownerId : parsed;
  }

  // Log the data that will actually be inserted into the database
  console.log('Inserting pet data into DB:', insertData);

  const newPet = await db.insert(schema.pets).values(insertData as any).returning();

  // Drizzle's .returning() usually returns an array of the inserted row(s)
  if (newPet.length === 0) {
      throw new Error("Failed to insert pet, no data returned after insertion.");
  }

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
    if (!petId) {
      return NextResponse.json({ error: 'Pet id required' }, { status: 400 });
    }
    const petIdNum = parseInt(petId, 10);

    await db.delete(schema.pets).where(eq(schema.pets.id, petIdNum));

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
    const petIdNum = parseInt(petId, 10);

    const json = await req.json();
    const validatedData = UpdatePetSchema.partial().parse(json); // Use .partial() for optional updates

    const setData: any = { ...validatedData };
    if (typeof setData.practiceId === 'string') {
      const parsed = parseInt(setData.practiceId, 10);
      setData.practiceId = Number.isNaN(parsed) ? setData.practiceId : parsed;
    }
    if (typeof setData.ownerId === 'string') {
      const parsed = parseInt(setData.ownerId, 10);
      setData.ownerId = Number.isNaN(parsed) ? setData.ownerId : parsed;
    }

    const updatedPet = await db
      .update(schema.pets)
      .set(setData as any)
      .where(eq(schema.pets.id, petIdNum))
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