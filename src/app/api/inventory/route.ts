import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { inventory } from '@/db/schema';
import { getUserPractice } from '@/lib/auth-utils';
import { eq, desc, and } from 'drizzle-orm';
import { z } from 'zod';

// GET /api/inventory - Get all inventory items for user's practice
export async function GET(request: NextRequest) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const inventoryItems = await db.query.inventory.findMany({
      where: eq(inventory.practiceId, userPractice.practiceId),
      orderBy: desc(inventory.createdAt),
    });

    return NextResponse.json(inventoryItems);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}

// POST /api/inventory - Create new inventory item
const createInventorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['medication', 'supply', 'equipment']),
  description: z.string().optional(),
  sku: z.string().optional(),
  quantity: z.number().int().min(0),
  unit: z.string().optional(),
  minQuantity: z.number().int().min(0).optional(),
  cost: z.string().optional(),
  price: z.string().optional(),
  location: z.string().optional(),
  supplier: z.string().optional(),
  expiryDate: z.string().optional(),
  deaSchedule: z.enum(['none', 'schedule_i', 'schedule_ii', 'schedule_iii', 'schedule_iv', 'schedule_v']).default('none'),
  requiresSpecialAuth: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createInventorySchema.parse(body);

    // Prepare data for SQLite insertion with proper type conversion
    const insertData = {
      practiceId: userPractice.practiceId,
      name: validatedData.name,
      type: validatedData.type,
      description: validatedData.description || null,
      sku: validatedData.sku || null,
      quantity: validatedData.quantity,
      unit: validatedData.unit || null,
      minQuantity: validatedData.minQuantity || null,
      cost: validatedData.cost || null,
      price: validatedData.price || null,
      location: validatedData.location || null,
      supplier: validatedData.supplier || null,
      // Convert dates to millisecond timestamps for SQLite timestamp_ms mode
      expiryDate: validatedData.expiryDate ? new Date(validatedData.expiryDate as string).getTime() : null,
      lastRestockDate: new Date().getTime(),
      batchTracking: false, // Default value
      deaSchedule: validatedData.deaSchedule,
      requiresSpecialAuth: validatedData.requiresSpecialAuth,
    };

    // Insert new inventory item
    const insertedItems = await (db as any).insert(inventory).values(insertData).returning();
    
    const newInventoryItem = insertedItems[0];

    return NextResponse.json(newInventoryItem, { status: 201 });
  } catch (error) {
    console.error('Error creating inventory item:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create inventory item' },
      { status: 500 }
    );
  }
}
