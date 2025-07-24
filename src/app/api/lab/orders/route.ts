import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { db } from '@/db';
import { labOrders, labOrderTests } from '@/db/schemas/labSchema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const createOrderSchema = z.object({
  petId: z.string().min(1, "Pet ID is required"),
  provider: z.string(),
  status: z.string().default('draft'),
  sampleType: z.string().optional(),
  priority: z.string().default('routine'),
  notes: z.string().optional(),
  isManualEntry: z.boolean().default(false),
  totalPrice: z.string().optional(), // Changed to string to match DB
  externalOrderId: z.string().optional(),
  externalReference: z.string().optional(),
  soapNoteId: z.string().optional(),
  sampleCollectionDate: z.string().optional(),
  tests: z.array(z.number()).default([]),
});

const updateOrderSchema = z.object({
  petId: z.string().optional(),
  provider: z.string().optional(),
  status: z.string().optional(),
  sampleType: z.string().optional(),
  priority: z.string().optional(),
  notes: z.string().optional(),
  isManualEntry: z.boolean().optional(),
  totalPrice: z.string().optional(), // Changed to string to match DB
  externalOrderId: z.string().optional(),
  externalReference: z.string().optional(),
  soapNoteId: z.string().optional(),
  sampleCollectionDate: z.string().optional(),
  tests: z.array(z.number()).optional(),
});

// GET - Fetch all lab orders for the practice
export async function GET(request: NextRequest) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const orders = await db.query.labOrders.findMany({
      where: eq(labOrders.practiceId, userPractice.practiceId),
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching lab orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lab orders' },
      { status: 500 }
    );
  }
}

// POST - Create a new lab order
export async function POST(request: NextRequest) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = createOrderSchema.parse(body);

    // Create the order
    const [order] = await db
      .insert(labOrders)
      .values({
        petId: validated.petId,
        practiceId: userPractice.practiceId,
        orderedById: userPractice.userId,
        provider: validated.provider,
        status: validated.status,
        sampleType: validated.sampleType,
        priority: validated.priority,
        notes: validated.notes,
        isManualEntry: validated.isManualEntry,
        totalPrice: validated.totalPrice,
        externalOrderId: validated.externalOrderId,
        externalReference: validated.externalReference,
        soapNoteId: validated.soapNoteId,
        sampleCollectionDate: validated.sampleCollectionDate ? Date.now() : null,
      })
      .returning();

    // Add tests to the order
    if (validated.tests && validated.tests.length > 0) {
      const orderTests = validated.tests.map((testId: number) => ({
        labOrderId: order.id,
        testCatalogId: testId,
        status: 'ordered' as const,
      }));

      await db.insert(labOrderTests).values(orderTests);
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Error creating lab order:', error);
    return NextResponse.json(
      { error: 'Failed to create lab order' },
      { status: 500 }
    );
  }
}

// PUT - Update multiple lab orders
export async function PUT(request: NextRequest) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { updates } = body;

    if (!Array.isArray(updates)) {
      return NextResponse.json(
        { error: 'Updates must be an array' },
        { status: 400 }
      );
    }

    const results = [];
    for (const update of updates) {
      const { id, ...updateData } = update;
      const validated = updateOrderSchema.parse(updateData);

      const [updatedOrder] = await db
        .update(labOrders)
        .set({
          ...validated,
          sampleCollectionDate: validated.sampleCollectionDate ? Date.now() : undefined,
        })
        .where(eq(labOrders.id, id))
        .returning();

      results.push(updatedOrder);
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error updating lab orders:', error);
    return NextResponse.json(
      { error: 'Failed to update lab orders' },
      { status: 500 }
    );
  }
}

// PATCH - Update a single lab order
export async function PATCH(request: NextRequest) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }
    
    const validated = updateOrderSchema.parse(updateData);

    // Update the order
    const [updatedOrder] = await db
      .update(labOrders)
      .set({
        ...validated,
        sampleCollectionDate: validated.sampleCollectionDate ? Date.now() : undefined,
      })
      .where(and(eq(labOrders.id, id), eq(labOrders.practiceId, userPractice.practiceId)))
      .returning();

    if (!updatedOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Handle test updates if provided
    if (validated.tests) {
      // Remove existing tests
      await db.delete(labOrderTests).where(eq(labOrderTests.labOrderId, id));
      
      // Add new tests
      if (validated.tests.length > 0) {
        const orderTests = validated.tests.map((testId: number) => ({
          labOrderId: id,
          testCatalogId: testId,
          status: 'ordered' as const,
        }));

        await db.insert(labOrderTests).values(orderTests);
      }
    }

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Error updating lab order:', error);
    return NextResponse.json(
      { error: 'Failed to update lab order' },
      { status: 500 }
    );
  }
}
