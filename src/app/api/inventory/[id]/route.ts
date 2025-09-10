import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { inventory } from '@/db/schema';
import { getUserPractice } from '@/lib/auth-utils';
import { createAuditLog } from '@/lib/audit-logger';
import { hasPermission } from '@/lib/rbac-helpers';
import { ResourceType, StandardAction } from '@/lib/rbac/types';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// GET /api/inventory/[id] - Get specific inventory item
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC permissions
    const hasReadPermission = hasPermission(userPractice.user, StandardAction.READ, ResourceType.INVENTORY);
    
    // Temporary bypass for ADMINISTRATOR role for testing
    const isAdministrator = userPractice.user.role === 'ADMINISTRATOR' || userPractice.user.role === 'SUPER_ADMIN' || userPractice.user.role === 'PRACTICE_ADMINISTRATOR';
    
    if (!hasReadPermission && !isAdministrator) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const resolvedParams = await params;
    const itemId = parseInt(resolvedParams.id);

    const item = await db.query.inventory.findFirst({
      where: and(
        eq(inventory.id, itemId),
        eq(inventory.practiceId, userPractice.practiceId.toString())
      ),
    });

    if (!item) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/inventory/[id] - Update inventory item
const updateInventorySchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['medication', 'supply', 'equipment']).optional(),
  description: z.string().optional(),
  sku: z.string().optional(),
  quantity: z.number().int().min(0).optional(),
  unit: z.string().optional(),
  minQuantity: z.number().int().min(0).optional(),
  cost: z.string().optional(),
  price: z.string().optional(),
  location: z.string().optional(),
  supplier: z.string().optional(),
  expiryDate: z.string().optional(),
  deaSchedule: z.enum(['none', 'schedule_i', 'schedule_ii', 'schedule_iii', 'schedule_iv', 'schedule_v']).optional(),
  requiresSpecialAuth: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC permissions
    const hasUpdatePermission = hasPermission(userPractice.user, StandardAction.UPDATE, ResourceType.INVENTORY);
    const isAdministrator = userPractice.user.role === 'ADMINISTRATOR' || userPractice.user.role === 'SUPER_ADMIN' || userPractice.user.role === 'PRACTICE_ADMINISTRATOR';
    
    if (!hasUpdatePermission && !isAdministrator) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const resolvedParams = await params;
    const itemId = parseInt(resolvedParams.id);

    // First verify the item exists and belongs to the user's practice
    const currentItem = await db.query.inventory.findFirst({
      where: and(
        eq(inventory.id, itemId),
        eq(inventory.practiceId, userPractice.practiceId.toString())
      ),
    });

    if (!currentItem) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = updateInventorySchema.parse(body);

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Only include fields that are being updated
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.type !== undefined) updateData.type = validatedData.type;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.sku !== undefined) updateData.sku = validatedData.sku;
    if (validatedData.quantity !== undefined) updateData.quantity = validatedData.quantity;
    if (validatedData.unit !== undefined) updateData.unit = validatedData.unit;
    if (validatedData.minQuantity !== undefined) updateData.minQuantity = validatedData.minQuantity;
    if (validatedData.cost !== undefined) updateData.cost = validatedData.cost;
    if (validatedData.price !== undefined) updateData.price = validatedData.price;
    if (validatedData.location !== undefined) updateData.location = validatedData.location;
    if (validatedData.supplier !== undefined) updateData.supplier = validatedData.supplier;
    if (validatedData.deaSchedule !== undefined) updateData.deaSchedule = validatedData.deaSchedule;
    if (validatedData.requiresSpecialAuth !== undefined) updateData.requiresSpecialAuth = validatedData.requiresSpecialAuth;

    // Handle expiry date
    if (validatedData.expiryDate !== undefined) {
      const isSqlite = process.env.DB_TYPE === 'sqlite';
      updateData.expiryDate = validatedData.expiryDate 
        ? (isSqlite ? new Date(validatedData.expiryDate as string).getTime() : new Date(validatedData.expiryDate as string))
        : null;
    }

    // Update the inventory item
    const [updatedItem] = await db
      .update(inventory)
      .set(updateData)
      .where(eq(inventory.id, itemId))
      .returning();

    // Log the audit trail
    await createAuditLog({
      action: 'UPDATE',
      recordType: 'INVENTORY',
      recordId: itemId.toString(),
      userId: userPractice.user.id,
      practiceId: userPractice.practiceId,
      description: `Updated inventory item: ${updatedItem.name}`,
      metadata: {
        previousData: currentItem,
        newData: updatedItem,
        endpoint: 'PATCH /api/inventory/[id]',
        timestamp: new Date().toISOString()
      }
    });

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('Error updating inventory item:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/inventory/[id] - Delete inventory item
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC permissions
    const hasDeletePermission = hasPermission(userPractice.user, StandardAction.DELETE, ResourceType.INVENTORY);
    const isAdministrator = userPractice.user.role === 'ADMINISTRATOR' || userPractice.user.role === 'SUPER_ADMIN' || userPractice.user.role === 'PRACTICE_ADMINISTRATOR';
    
    if (!hasDeletePermission && !isAdministrator) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const resolvedParams = await params;
    const itemId = parseInt(resolvedParams.id);

    // First verify the item exists and belongs to the user's practice
    const currentItem = await db.query.inventory.findFirst({
      where: and(
        eq(inventory.id, itemId),
        eq(inventory.practiceId, userPractice.practiceId.toString())
      ),
    });

    if (!currentItem) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    // Delete the inventory item
    await db.delete(inventory).where(eq(inventory.id, itemId));

    // Log the audit trail
    await createAuditLog({
      action: 'DELETE',
      recordType: 'INVENTORY',
      recordId: itemId.toString(),
      userId: userPractice.user.id,
      practiceId: userPractice.practiceId,
      description: `Deleted inventory item: ${currentItem.name}`,
      metadata: {
        deletedData: currentItem,
        endpoint: 'DELETE /api/inventory/[id]',
        timestamp: new Date().toISOString()
      }
    });

    return NextResponse.json({ success: true, message: 'Inventory item deleted successfully' });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
