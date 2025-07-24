import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { inventory } from '@/db/schema';
import { getUserPractice } from '@/lib/auth-utils';
import { eq, and, lte, or } from 'drizzle-orm';

// GET /api/inventory/reports/low-stock - Get low stock and expiring items
export async function GET(request: NextRequest) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all inventory items for the practice
    const allItems = await db.query.inventory.findMany({
      where: eq(inventory.practiceId, userPractice.practiceId),
    });

    // Filter items that are low stock or expiring
    const lowStockItems = allItems.filter(item => {
      // Check if item is expired
      if (item.expiryDate && new Date(item.expiryDate) < new Date()) {
        return true;
      }

      // Check if item is expiring within 30 days
      if (item.expiryDate) {
        const expiryDate = new Date(item.expiryDate);
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        
        if (expiryDate <= thirtyDaysFromNow) {
          return true;
        }
      }

      // Check if item is at or below minimum quantity
      if (item.minQuantity && item.quantity <= item.minQuantity) {
        return true;
      }

      return false;
    });

    return NextResponse.json(lowStockItems);
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch low stock items' },
      { status: 500 }
    );
  }
}
