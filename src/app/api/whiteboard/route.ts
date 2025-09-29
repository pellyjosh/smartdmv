import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { whiteboardItems, pets, users } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';

// GET /api/whiteboard - Get all whiteboard items for user's practice
export async function GET(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get whiteboard items with pet and assignedTo information
    const items = await (db as any)
      .select({
        id: whiteboardItems.id,
        petId: whiteboardItems.petId,
        practiceId: whiteboardItems.practiceId,
        notes: whiteboardItems.notes,
        urgency: whiteboardItems.urgency,
        status: whiteboardItems.status,
        assignedToId: whiteboardItems.assignedToId,
        location: whiteboardItems.location,
        position: whiteboardItems.position,
        appointmentId: whiteboardItems.appointmentId,
        createdAt: whiteboardItems.createdAt,
        updatedAt: whiteboardItems.updatedAt,
        // Pet information
        petName: pets.name,
        petSpecies: pets.species,
        petBreed: pets.breed,
        // Assigned staff information
        assignedToName: users.name,
      })
      .from(whiteboardItems)
      .leftJoin(pets, eq(whiteboardItems.petId, pets.id))
      .leftJoin(users, eq(whiteboardItems.assignedToId, users.id))
      .where(eq(whiteboardItems.practiceId, parseInt(userPractice.practiceId)))
      .orderBy(desc(whiteboardItems.createdAt));

    return NextResponse.json(items, { status: 200 });
  } catch (error) {
    console.error('Error fetching whiteboard items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch whiteboard items' },
      { status: 500 }
    );
  }
}

// POST /api/whiteboard - Create new whiteboard item
const createWhiteboardItemSchema = z.object({
  petId: z.number().min(1, 'Pet ID is required'),
  notes: z.string().optional(),
  urgency: z.enum(['high', 'medium', 'low', 'none']).optional().default('none'),
  status: z.enum(['triage', 'active', 'completed', 'pending_pickup', 'in_treatment']).default('triage'),
  assignedToId: z.number().optional(),
  location: z.string().optional(),
  appointmentId: z.number().optional(),
  position: z.number().default(0),
});

export async function POST(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = createWhiteboardItemSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check if pet exists and belongs to the practice
    const pet = await (db as any)
      .select()
      .from(pets)
      .where(and(
        eq(pets.id, data.petId as number),
        eq(pets.practiceId, parseInt(userPractice.practiceId))
      ))
      .limit(1);

    if (pet.length === 0) {
      return NextResponse.json(
        { error: 'Pet not found or does not belong to your practice' },
        { status: 404 }
      );
    }

    // Create the whiteboard item
    const [newItem] = await (db as any)
      .insert(whiteboardItems)
      .values({
        petId: data.petId,
        practiceId: parseInt(userPractice.practiceId),
        notes: data.notes,
        urgency: data.urgency,
        status: data.status,
        assignedToId: data.assignedToId,
        location: data.location,
        appointmentId: data.appointmentId,
        position: data.position,
      })
      .returning();

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error('Error creating whiteboard item:', error);
    return NextResponse.json(
      { error: 'Failed to create whiteboard item' },
      { status: 500 }
    );
  }
}
