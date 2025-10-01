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
    const rawItems = await tenantDb
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
  const items = rawItems.map((i: typeof rawItems[number]) => ({
      ...i,
      pet: {
        id: i.petId,
        name: i.petName ?? `Pet #${i.petId}`,
        species: i.petSpecies || null,
        breed: i.petBreed || null,
      }
    }));
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
// More permissive schema: accept string or number for numeric fields and coerce.
const numeric = (label: string) => z.union([z.string(), z.number()])
  .transform(v => {
    if (v === '' || v === null || v === undefined) return undefined;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isNaN(n) ? NaN : n;
  })
  .refine(v => v === undefined || (!Number.isNaN(v) && v >= 0), `${label} must be a valid number`);

const createWhiteboardItemSchema = z.object({
  petId: numeric('Pet ID').refine(v => typeof v === 'number' && v > 0, 'Pet ID is required'),
  notes: z.string().optional(),
  urgency: z.enum(['high', 'medium', 'low', 'none']).optional().default('none'),
  status: z.enum(['triage', 'active', 'completed', 'pending_pickup', 'in_treatment']).default('triage'),
  assignedToId: numeric('Assigned To').optional(),
  location: z.string().optional(),
  appointmentId: numeric('Appointment ID').optional(),
  position: numeric('Position').default(0).transform(v => (v === undefined ? 0 : v)),
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
    // Debug: log incoming body shape (omit potentially large/nested data)
    console.log('[WHITEBOARD_POST] Incoming payload keys:', Object.keys(body || {}));
    const validation = createWhiteboardItemSchema.safeParse(body);

    if (!validation.success) {
      console.warn('[WHITEBOARD_POST] Validation failed:', validation.error.flatten());
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check if pet exists and belongs to the practice
    const pet = await tenantDb
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
    const [newItem] = await tenantDb
      .insert(whiteboardItems)
      .values({
        petId: data.petId,
        practiceId: parseInt(userPractice.practiceId),
        notes: data.notes,
        urgency: data.urgency,
        status: data.status,
        assignedToId: data.assignedToId === undefined ? null : data.assignedToId,
        location: data.location,
        appointmentId: data.appointmentId === undefined ? null : data.appointmentId,
        position: data.position ?? 0,
      })
      .returning();
    // Enrich response with pet details + unified pet object for FE simplicity
    const petRow: any = pet[0];
    const responsePayload = {
      ...newItem,
      petName: petRow?.name ?? null,
      petSpecies: petRow?.species ?? null,
      petBreed: petRow?.breed ?? null,
      pet: {
        id: newItem.petId,
        name: petRow?.name ?? `Pet #${newItem.petId}`,
        species: petRow?.species ?? null,
        breed: petRow?.breed ?? null,
      }
    };
    return NextResponse.json(responsePayload, { status: 201 });
  } catch (error) {
    console.error('Error creating whiteboard item:', error);
    return NextResponse.json(
      { error: 'Failed to create whiteboard item' },
      { status: 500 }
    );
  }
}
