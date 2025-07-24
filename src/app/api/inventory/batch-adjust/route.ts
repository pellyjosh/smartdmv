import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { inventory } from '@/db/schema';
import { getUserPractice } from '@/lib/auth-utils';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';

const batchAdjustSchema = z.object({
  itemIds: z.array(z.number().int()),
  quantityChange: z.number().int(),
});

// POST /api/inventory/batch-adjust - Adjust quantities for multiple items
export async function POST(request: NextRequest) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { itemIds, quantityChange } = batchAdjustSchema.parse(body);

    if (itemIds.length === 0) {
      return NextResponse.json({ error: 'No items selected' }, { status: 400 });
    }

    // Update quantities for all selected items one by one to avoid type issues
    let updatedCount = 0;
    for (const itemId of itemIds) {
      try {
        await db
          .update(inventory)
          .set({ 
            quantity: sql`${inventory.quantity} + ${quantityChange}`,
            lastRestockDate: quantityChange > 0 ? new Date() : undefined,
          })
          .where(
            and(
              eq(inventory.id, itemId),
              eq(inventory.practiceId, userPractice.practiceId)
            )
          );
        updatedCount++;
      } catch (error) {
        console.error(`Error updating item ${itemId}:`, error);
      }
    }

    return NextResponse.json({
      message: `Successfully updated ${updatedCount} items`,
      updatedCount
    });
  } catch (error) {
    console.error('Error batch adjusting inventory:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to adjust inventory items' },
      { status: 500 }
    );
  }
}
