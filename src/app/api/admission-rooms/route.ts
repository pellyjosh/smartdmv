// src/app/api/admission-rooms/route.ts
import { NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { admissions, rooms } from '@/db/schema';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';

// Opt out of caching for this route to ensure fresh data on every request.
export const dynamic = 'force-dynamic';

// Zod schema for creating/updating admission room
// const admissionRoomSchema = z.object({
//   admissionId: z.number().int().positive("Admission ID must be a positive integer."),
//   roomId: z.number().int().positive("Room ID must be a positive integer."),
// });

const createRoomSchema = z.object({
  roomNumber: z.string().min(1, "Room number is required"),
  type: z.string().optional().default("standard"),
  capacity: z.number().int().positive("Capacity must be a positive number"),
  notes: z.string().optional(),
  practiceId: z.string().min(1, "Practice ID is required"),
  status: z.enum(['available', 'occupied', 'maintenance']).default('available'),
});

// Zod schema for updating a room (all fields optional except id in URL)
const updateRoomSchema = z.object({
  roomNumber: z.string().optional(),
  type: z.string().optional(),
  capacity: z.number().int().positive("Capacity must be a positive number").optional(),
  notes: z.string().optional(),
  practiceId: z.string().optional(),
  status: z.enum(['available', 'occupied', 'maintenance']).optional(),
});


// Get all admission rooms
// Get all rooms, with optional filtering for 'available' status
export async function GET(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  const { searchParams } = new URL(request.url);
  const availableOnly = searchParams.get('available') === 'true';

  try {
    if (availableOnly) {
      console.log('[API Rooms GET] Fetching ONLY available rooms.');
      const availableRooms = await tenantDb.query.rooms.findMany({
        where: eq(rooms.status, 'available'),
      });
      console.log(`[API Rooms GET] Found ${availableRooms.length} available rooms.`);
      return NextResponse.json(availableRooms, { status: 200 });
    }

    console.log('[API Rooms GET] Fetching all rooms.');
    const allRooms = await tenantDb.select().from(rooms);
    console.log(`[API Rooms GET] Found ${allRooms.length} rooms.`);
    return NextResponse.json(allRooms, { status: 200 });
  } catch (error) {
    console.error('[API Rooms GET ERROR] Failed to fetch rooms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rooms due to server error.' },
      { status: 500 }
    );
  }
}

// Get admission room by ID
export async function GET_BY_ID(request: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  console.log(`[API Admission Rooms GET BY ID] Fetching admission room with ID: ${id}`);

  if (isNaN(id)) {
    console.error('[API Admission Rooms GET BY ID] Invalid ID provided.');
    return NextResponse.json({ error: 'Invalid admission room ID' }, { status: 400 });
  }

  try {
    // Get the tenant-specific database
    const tenantDb = await getCurrentTenantDb();
    const admissionRoom = await tenantDb.query.admissions.findFirst({
      where: eq(admissions.id, id),
      with: {
        room: true,
        pet: true,
        client: true,
        attendingVet: true,
        practice: true,
      },
    });

    if (!admissionRoom) {
      console.warn(`[API Admission Rooms GET BY ID] Admission room not found for ID: ${id}`);
      return NextResponse.json({ error: 'Admission room not found' }, { status: 404 });
    }

    console.log(`[API Admission Rooms GET BY ID] Admission room ${id} fetched successfully.`);
    return NextResponse.json(admissionRoom, { status: 200 });
  } catch (error) {
    console.error(`[API Admission Rooms GET BY ID CATCH_ERROR] Error fetching admission room ${id}:`, error);
    return NextResponse.json({ error: 'Failed to fetch admission room due to an unexpected server error.' }, { status: 500 });
  }
}

// Create new admission room
export async function POST(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  console.log('[API Rooms POST] Creating new room');
  try {
    const body = await request.json();
    const validation = createRoomSchema.safeParse(body);

    if (!validation.success) {
      console.error('[API Rooms POST] Validation failed:', validation.error.flatten());
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const roomData = validation.data;

    const [newRoom] = await tenantDb.insert(rooms).values(roomData).returning();

    console.log('[API Rooms POST] Room created with ID:', newRoom.id);
    return NextResponse.json(newRoom, { status: 201 });
  } catch (error) {
    console.error('[API Rooms POST] Server error:', error);
    return NextResponse.json({ error: 'Failed to create room due to a server error.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  const id = parseInt(params.id);
  console.log(`[API Rooms PATCH] Updating room with ID: ${id}`);

  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid room ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const validation = updateRoomSchema.safeParse(body);

    if (!validation.success) {
      console.error('[API Rooms PATCH] Validation Error:', validation.error.flatten());
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const updateData = validation.data;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update provided' }, { status: 400 });
    }

    const [updatedRoom] = await tenantDb
      .update(rooms)
      .set({ ...updateData })
      .where(eq(rooms.id, id))
      .returning();

    if (!updatedRoom) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    console.log(`[API Rooms PATCH] Room ${id} updated successfully.`);
    return NextResponse.json(updatedRoom, { status: 200 });
  } catch (error) {
    console.error(`[API Rooms PATCH] Server error updating room ${id}:`, error);
    return NextResponse.json({ error: 'Failed to update room due to a server error.' }, { status: 500 });
  }
}