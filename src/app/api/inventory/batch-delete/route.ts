import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { inventory } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { z } from 'zod';

const batchDeleteSchema = z.object({
  itemIds: z.array(z.number().int()),
});

// DELETE /api/inventory/batch-delete - Delete multiple inventory items
export async function DELETE(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { itemIds } = batchDeleteSchema.parse(body);

    if (itemIds.length === 0) {
      return NextResponse.json({ error: 'No items selected' }, { status: 400 });
    }

    // Delete selected items
    const deletedItems = await tenantDb
      .delete(inventory)
      .where(
        and(
          inArray(inventory.id, itemIds),
          eq(inventory.practiceId, userPractice.practiceId)
        )
      );

    return NextResponse.json({
      message: `Successfully deleted ${itemIds.length} items`,
      deletedCount: itemIds.length
    });
  } catch (error) {
    console.error('Error batch deleting inventory:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete inventory items' },
      { status: 500 }
    );
  }
}
