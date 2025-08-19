// src/app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// GET a specific user by ID
export async function GET(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const idStr = pathname.split('/').pop(); // Extract user ID from the URL path
  const userId = idStr ? parseInt(idStr, 10) : NaN;

  console.log('Pathname:', pathname);
  console.log('Extracted User ID:', userId);

  try {
    if (Number.isFinite(userId)) {
      const userData = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (userData.length === 0) {
        console.log('User not found for ID:', idStr);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      return NextResponse.json(userData[0], { status: 200 });
    } else {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

// PATCH: Update a user by ID
export async function PATCH(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const idStr = pathname.split('/').pop();
  const userId = idStr ? parseInt(idStr, 10) : NaN;

  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const updateSchema = z.object({
      name: z.string().min(2).optional(),
      email: z.string().email().optional(),
      username: z.string().min(3).optional(),
      // password updates not supported here
      phone: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      city: z.string().optional().nullable(),
      state: z.string().optional().nullable(),
      zipCode: z.string().optional().nullable(),
      country: z.string().optional().nullable(),
      emergencyContactName: z.string().optional().nullable(),
      emergencyContactPhone: z.string().optional().nullable(),
      emergencyContactRelationship: z.string().optional().nullable(),
      role: z.string().optional(),
      practiceId: z.union([z.string(), z.number()]).optional(),
    });

    const parsed = updateSchema.parse(body);

    // Normalize practiceId -> number if provided
    const updateData: Record<string, any> = { ...parsed };
    if (parsed.practiceId !== undefined) {
      const practiceIdInt = typeof parsed.practiceId === 'string' ? parseInt(parsed.practiceId, 10) : parsed.practiceId;
      if (!Number.isFinite(practiceIdInt as number)) {
        return NextResponse.json({ error: 'Invalid practiceId. Must be a valid number.' }, { status: 400 });
      }
      updateData.practiceId = practiceIdInt as number;
    }

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('Error updating user:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE: Remove a user by ID
export async function DELETE(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const idStr = pathname.split('/').pop();
  const userId = idStr ? parseInt(idStr, 10) : NaN;

  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
  }

  try {
    const [deleted] = await db
      .delete(users)
      .where(eq(users.id, userId))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
