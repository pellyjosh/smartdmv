import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { inventory } from '@/db/schema';
import { getUserPractice } from '@/lib/auth-utils';
import { hasPermission } from '@/lib/rbac-helpers';
import { ResourceType, StandardAction } from '@/lib/rbac/types';
import { eq, and } from 'drizzle-orm';

// GET /api/inventory/[id]/transactions - Get transaction history for an inventory item
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC permissions
    const hasReadPermission = hasPermission(userPractice.user, StandardAction.READ, ResourceType.INVENTORY);
    const isAdministrator = userPractice.user.role === 'ADMINISTRATOR' || userPractice.user.role === 'SUPER_ADMIN' || userPractice.user.role === 'PRACTICE_ADMINISTRATOR';
    
    if (!hasReadPermission && !isAdministrator) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const resolvedParams = await params;
    const itemId = parseInt(resolvedParams.id);

    // First verify the item belongs to the user's practice
    const item = await db.query.inventory.findFirst({
      where: and(
        eq(inventory.id, itemId),
        eq(inventory.practiceId, userPractice.practiceId.toString())
      ),
    });

    if (!item) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    // For now, return mock transaction data
    // In a real implementation, this would fetch from a transactions table
    const mockTransactions = [
      {
        id: 1,
        transactionType: 'add',
        quantity: 10,
        notes: 'Initial stock',
        performedByName: 'System',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        referenceType: null,
        referenceId: null,
        referenceData: null
      },
      {
        id: 2,
        transactionType: 'use',
        quantity: -2,
        notes: 'Used in treatment',
        performedByName: userPractice.user.email,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        referenceType: null,
        referenceId: null,
        referenceData: null
      }
    ];

    return NextResponse.json(mockTransactions);
  } catch (error) {
    console.error('Error fetching inventory transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction history' },
      { status: 500 }
    );
  }
}
