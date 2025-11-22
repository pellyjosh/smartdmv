// src/app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
// NOTE: avoid using the global `pgPool` here because this route should operate
// on the tenant-specific database. Use the tenant `tenantDb` (Drizzle instance)
// returned by `getCurrentTenantDb()` for any raw SQL execution.
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// GET a specific user by ID
export async function GET(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  const pathname = request.nextUrl.pathname;
  const idStr = pathname.split('/').pop(); // Extract user ID from the URL path
  const userId = idStr ? parseInt(idStr, 10) : NaN;

  console.log('Pathname:', pathname);
  console.log('Extracted User ID:', userId);

  try {
    if (Number.isFinite(userId)) {
      const userData = await tenantDb.select({
        id: users.id,
        name: users.name,
        email: users.email,
        username: users.username,
        role: users.role,
        practiceId: users.practiceId,
        phone: users.phone,
        address: users.address,
        city: users.city,
        state: users.state,
        zipCode: users.zipCode,
        country: users.country,
        emergencyContactName: users.emergencyContactName,
        emergencyContactPhone: users.emergencyContactPhone,
        emergencyContactRelationship: users.emergencyContactRelationship,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      }).from(users).where(eq(users.id, userId)).limit(1);
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
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

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

    // Prepare update data with updatedAt timestamp
    const updateData = {
      ...parsed,
      updatedAt: new Date(),
    };

    // Convert practiceId to number if provided
    if (parsed.practiceId !== undefined) {
      updateData.practiceId = typeof parsed.practiceId === 'string'
        ? parseInt(parsed.practiceId, 10)
        : parsed.practiceId;
    }

    const [updatedUser] = await tenantDb
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { password: _pw, ...safeUser } = updatedUser as any;
    return NextResponse.json(safeUser, { status: 200 });
  } catch (error) {
    console.error('Error updating user:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// PUT: Update a user by ID (alias for PATCH for compatibility)
export async function PUT(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  return PATCH(request);
}

// DELETE: Remove a user by ID
export async function DELETE(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  const pathname = request.nextUrl.pathname;
  const idStr = pathname.split('/').pop();
  const userId = idStr ? parseInt(idStr, 10) : NaN;

  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
  }

  try {
    const [deleted] = await tenantDb
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
