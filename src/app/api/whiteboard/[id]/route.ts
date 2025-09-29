import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { whiteboardItems } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// PATCH /api/whiteboard/[id] - Update whiteboard item
const updateWhiteboardItemSchema = z.object({
  notes: z.string().optional(),
  urgency: z.enum(['high', 'medium', 'low', 'none']).optional(),
  status: z.enum(['triage', 'active', 'completed', 'pending_pickup', 'in_treatment']).optional(),
  assignedToId: z.number().optional(),
  location: z.string().optional(),
  position: z.number().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const { id } = await params;
    const itemId = parseInt(id);
    
    if (isNaN(itemId)) {
      return NextResponse.json(
        { error: 'Invalid whiteboard item ID' },
        { status: 400 }
      );
    }

    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = updateWhiteboardItemSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check if the whiteboard item exists and belongs to the user's practice
    const existingItem = await (db as any)
      .select()
      .from(whiteboardItems)
      .where(and(
        eq(whiteboardItems.id, itemId),
        eq(whiteboardItems.practiceId, parseInt(userPractice.practiceId))
      ))
      .limit(1);

    if (existingItem.length === 0) {
      return NextResponse.json(
        { error: 'Whiteboard item not found or access denied' },
        { status: 404 }
      );
    }

    // Update the whiteboard item
    const [updatedItem] = await (db as any)
      .update(whiteboardItems)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(whiteboardItems.id, itemId))
      .returning();

    return NextResponse.json(updatedItem, { status: 200 });
  } catch (error) {
    console.error('Error updating whiteboard item:', error);
    return NextResponse.json(
      { error: 'Failed to update whiteboard item' },
      { status: 500 }
    );
  }
}

// DELETE /api/whiteboard/[id] - Delete whiteboard item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const { id } = await params;
    const itemId = parseInt(id);
    
    if (isNaN(itemId)) {
      return NextResponse.json(
        { error: 'Invalid whiteboard item ID' },
        { status: 400 }
      );
    }

    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the whiteboard item exists and belongs to the user's practice
    const existingItem = await (db as any)
      .select()
      .from(whiteboardItems)
      .where(and(
        eq(whiteboardItems.id, itemId),
        eq(whiteboardItems.practiceId, parseInt(userPractice.practiceId))
      ))
      .limit(1);

    if (existingItem.length === 0) {
      return NextResponse.json(
        { error: 'Whiteboard item not found or access denied' },
        { status: 404 }
      );
    }

    // Delete the whiteboard item
    await (db as any)
      .delete(whiteboardItems)
      .where(eq(whiteboardItems.id, itemId));

    return NextResponse.json(
      { message: 'Whiteboard item deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting whiteboard item:', error);
    return NextResponse.json(
      { error: 'Failed to delete whiteboard item' },
      { status: 500 }
    );
  }
}

// GET /api/whiteboard/[id] - Get specific whiteboard item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const { id } = await params;
    const itemId = parseInt(id);
    
    if (isNaN(itemId)) {
      return NextResponse.json(
        { error: 'Invalid whiteboard item ID' },
        { status: 400 }
      );
    }

    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the whiteboard item
    const item = await (db as any)
      .select()
      .from(whiteboardItems)
      .where(and(
        eq(whiteboardItems.id, itemId),
        eq(whiteboardItems.practiceId, parseInt(userPractice.practiceId))
      ))
      .limit(1);

    if (item.length === 0) {
      return NextResponse.json(
        { error: 'Whiteboard item not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json(item[0], { status: 200 });
  } catch (error) {
    console.error('Error fetching whiteboard item:', error);
    return NextResponse.json(
      { error: 'Failed to fetch whiteboard item' },
      { status: 500 }
    );
  }
}
