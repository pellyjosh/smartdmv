import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { inventory } from '@/db/schema';
import { createAuditLog } from '@/lib/audit-logger';
import { hasPermission } from '@/lib/rbac-helpers';
import { ResourceType, StandardAction } from '@/lib/rbac/types';
import { eq, and } from 'drizzle-orm';

// POST /api/inventory/[id]/adjust - Adjust inventory stock
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

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

    // Parse request body
    const body = await request.json();
    const { quantity, transactionType, notes } = body;

    if (!quantity || !transactionType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // First verify the item belongs to the user's practice
    const item = await tenantDb.query.inventory.findFirst({
      where: and(
        eq(inventory.id, itemId),
        eq(inventory.practiceId, userPractice.practiceId.toString())
      ),
    });

    if (!item) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    // Calculate the quantity change based on transaction type
    // Parse as integer to ensure no decimals
    let quantityChange = parseInt(quantity, 10);
    
    // Validate that quantity is a valid integer
    if (isNaN(quantityChange)) {
      return NextResponse.json({ error: 'Quantity must be a valid whole number' }, { status: 400 });
    }
    
    // For remove, use, expired, and lost transactions, make quantity negative
    if (['remove', 'use', 'expired', 'lost'].includes(transactionType)) {
      quantityChange = -Math.abs(quantityChange);
    }
    // For add transactions, make quantity positive
    else if (transactionType === 'add') {
      quantityChange = Math.abs(quantityChange);
    }
    // For adjustment, use the quantity as-is (can be positive or negative)

    // Calculate the new quantity
    const newQuantity = (item.quantity || 0) + quantityChange;

    // Prevent negative quantities unless it's a specific transaction type
    if (newQuantity < 0 && !['expired', 'lost', 'adjustment'].includes(transactionType)) {
      return NextResponse.json({ error: 'Insufficient stock' }, { status: 400 });
    }

    // Update the inventory item
    const [updatedItem] = await tenantDb
      .update(inventory)
      .set({
        quantity: newQuantity,
        updatedAt: new Date(),
      })
      .where(eq(inventory.id, itemId))
      .returning();

    // Log the audit trail
    await createAuditLog({
      action: 'UPDATE',
      recordType: 'INVENTORY',
      recordId: itemId.toString(),
      userId: userPractice.user.id,
      practiceId: userPractice.practiceId,
      description: `Stock adjustment: ${transactionType} ${quantityChange} units for ${item.name}`,
      metadata: {
        transactionType,
        quantityChange,
        previousQuantity: item.quantity,
        newQuantity,
        notes,
        itemName: item.name,
        endpoint: 'POST /api/inventory/[id]/adjust',
        timestamp: new Date().toISOString()
      }
    });

    return NextResponse.json({
      success: true,
      item: updatedItem,
      transaction: {
        type: transactionType,
        quantity: quantityChange,
        notes,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error adjusting inventory:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
