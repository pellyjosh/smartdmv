import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { inventory } from '@/db/schema';
import { getUserPractice } from '@/lib/auth-utils';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// GET /api/inventory/[id] - Get a specific inventory item
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    // Fetch inventory item that belongs to the user's practice
    const item = await db.query.inventory.findFirst({
      where: and(
        eq(inventory.id, id),
        eq(inventory.practiceId, userPractice.practiceId)
      ),
    });

    if (!item) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory item' },
      { status: 500 }
    );
  }
}

const updateInventorySchema = z.object({
  item_name: z.string().optional(),
  description: z.string().optional(),
  sku: z.string().optional(),
  category: z.string().optional(),
  unit_cost: z.number().optional(),
  selling_price: z.number().optional(),
  quantity_on_hand: z.number().optional(),
  quantity_available: z.number().optional(),
  reorder_point: z.number().optional(),
  reorder_quantity: z.number().optional(),
  supplier: z.string().optional(),
  location: z.string().optional(),
  expiry_date: z.string().optional(),
  is_active: z.boolean().optional(),
});

// PUT /api/inventory/[id] - Update a specific inventory item
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    const body = await request.json();

    // Validate the request body
    const validatedData = updateInventorySchema.parse(body);

    // Check if the inventory item exists and belongs to the user's practice
    const existingItem = await db.query.inventory.findFirst({
      where: and(
        eq(inventory.id, id),
        eq(inventory.practice_id, parseInt(userPractice.practiceId))
      ),
    });

    if (!existingItem) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    // Update the inventory item
    const updatedItem = await db.update(inventory)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(and(
        eq(inventory.id, id),
        eq(inventory.practice_id, parseInt(userPractice.practiceId))
      ))
      .returning();

    return NextResponse.json(updatedItem[0]);
  } catch (error) {
    console.error('Error updating inventory item:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update inventory item' },
      { status: 500 }
    );
  }
}

// DELETE /api/inventory/[id] - Delete a specific inventory item
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    // Check if the inventory item exists and belongs to the user's practice
    const existingItem = await db.query.inventory.findFirst({
      where: and(
        eq(inventory.id, id),
        eq(inventory.practice_id, parseInt(userPractice.practiceId))
      ),
    });

    if (!existingItem) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    // Delete the inventory item
    await db.delete(inventory).where(and(
      eq(inventory.id, id),
      eq(inventory.practice_id, parseInt(userPractice.practiceId))
    ));

    return NextResponse.json({ message: 'Inventory item deleted successfully' });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    return NextResponse.json(
      { error: 'Failed to delete inventory item' },
      { status: 500 }
    );
  }
}
