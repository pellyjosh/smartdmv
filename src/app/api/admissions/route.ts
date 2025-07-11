// src/app/api/admissions/routes.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { admissions, pets, users, rooms } from '@/db/schema';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

// Opt out of caching for this route to ensure fresh data on every request.
export const dynamic = 'force-dynamic';

// Get all admissions
export async function GET() {
  try {
    const admissionsData = await db.query.admissions.findMany({
      with: {
        pet: true,
        client: true,
        attendingVet: true,
        practice: true,
        room: true,
      },
    });
    return NextResponse.json(admissionsData, { status: 200 });
  } catch (error) {
    console.error('Error fetching admissions:', error);
    return NextResponse.json({ error: 'Failed to fetch admissions' }, { status: 500 });
  }
}

// Get admission by ID
export async function GET_BY_ID(request: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid Admission ID' }, { status: 400 });
  }

  try {
    const admissionData = await db.query.admissions.findFirst({
      where: eq(admissions.id, id),
      with: {
        pet: true,
        client: true,
        attendingVet: true,
        practice: true,
        room: true,
      },
    });
    if (!admissionData) {
      return NextResponse.json({ error: 'Admission not found' }, { status: 404 });
    }
    return NextResponse.json(admissionData, { status: 200 });
  } catch (error) {
    console.error(`Error fetching admission with ID ${id}:`, error);
    return NextResponse.json({ error: 'Failed to fetch admission' }, { status: 500 });
  }
}

// Create new admission
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const createAdmissionSchema = z.object({
      petId: z.string().min(1, { message: 'Pet ID is required' }),
      clientId: z.string().min(1, { message: 'Client ID is required' }),
      attendingVetId: z.string().min(1, { message: 'Attending Vet ID is required' }),
      practiceId: z.string().min(1, { message: 'Practice ID is required' }), // Assuming practiceId is passed
      reason: z.string().min(1, { message: 'Reason is required' }),
      notes: z.string().optional(),
      roomId: z.string().optional(),
      status: z.enum(['pending', 'admitted', 'hold', 'isolation', 'discharged']).default('pending'),
      // admissionDate and dischargeDate will be set by the database or derived
    });

    const validatedResult = createAdmissionSchema.safeParse(body);

     if (!validatedResult.success) {
        console.error('Invalid data for admission creation:', validatedResult.error.errors);
        return NextResponse.json({ 
          error: 'Invalid data', 
          details: validatedResult.error.errors 
        }, { status: 400 });
      }
      const admissionDataToInsert = validatedResult.data; 

    const [newAdmission] = await db.insert(admissions).values({
      ...admissionDataToInsert,
      admissionDate: new Date().toISOString(), // Set admission date to now
      dischargeDate: new Date().toISOString(), // Placeholder, will be updated on discharge
      // Drizzle will handle createdAt and updatedAt defaults
    }).returning();

    if (!newAdmission) {
      throw new Error('Failed to create admission');
    }

    return NextResponse.json(newAdmission, { status: 201 });
  } catch (error) {
    console.error('Error creating admission:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create admission' }, { status: 500 });
  }
}

// Update admission
export async function PATCH(request: NextRequest) {
  // This route handler is typically for a specific admission, e.g., /api/admissions/[id]
  // The original code had `request.query` which is not standard for Next.js App Router.
  // Assuming this PATCH is for a specific admission ID passed in the URL.
  return NextResponse.json({ error: 'PATCH not implemented for general admissions route. Use /api/admissions/[id] for specific updates.' }, { status: 405 });
}

// Delete admission
export async function DELETE(request: NextRequest) {
  // Similar to PATCH, DELETE usually targets a specific resource.
  // The original code had `request.query` which is not standard for Next.js App Router.
  // Assuming this DELETE is for a specific admission ID passed in the URL.
  return NextResponse.json({ error: 'DELETE not implemented for general admissions route. Use /api/admissions/[id] for specific deletions.' }, { status: 405 });
}

// --- Specific routes for sub-resources (e.g., notes, medications, discharge) would go in separate files like /api/admissions/[id]/notes/route.ts ---
// Example for discharge (would be in /api/admissions/[id]/discharge/route.ts)
/*
export async function POST_DISCHARGE(request: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid Admission ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const dischargeSchema = z.object({
      notes: z.string().optional(),
    });
    const validatedData = dischargeSchema.parse(body);

    const [updatedAdmission] = await db.update(admissions)
      .set({
        status: 'discharged',
        dischargeDate: new Date(),
        notes: validatedData.notes ? `${admissions.notes} \n Discharge Notes: ${validatedData.notes}` : admissions.notes, // Append discharge notes
      })
      .where(eq(admissions.id, id))
      .returning();

    if (!updatedAdmission) {
      return NextResponse.json({ error: 'Admission not found or already discharged' }, { status: 404 });
    }

    // Optionally, update room availability if a room was assigned
    if (updatedAdmission.roomId) {
      await db.update(rooms)
        .set({ isAvailable: 1 }) // Assuming 1 means available
        .where(eq(rooms.id, updatedAdmission.roomId));
    }

    return NextResponse.json(updatedAdmission, { status: 200 });
  } catch (error) {
    console.error(`Error discharging admission with ID ${id}:`, error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to discharge admission' }, { status: 500 });
  }
}
*/