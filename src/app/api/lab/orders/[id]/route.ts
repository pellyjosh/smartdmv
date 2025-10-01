import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { labOrders, labOrderTests, labTestCatalog } from '@/db/schemas/labSchema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema for lab order updates
const labOrderUpdateSchema = z.object({
  petId: z.string().optional(),
  soapNoteId: z.string().optional(),
  provider: z.enum(['idexx', 'antech', 'zoetis', 'heska', 'in_house', 'other']).optional(),
  status: z.enum(['draft', 'ordered', 'submitted', 'in_progress', 'completed', 'cancelled']).optional(),
  externalOrderId: z.string().optional(),
  externalReference: z.string().optional(),
  sampleCollectionDate: z.string().datetime().optional(),
  sampleType: z.string().optional(),
  priority: z.enum(['routine', 'urgent', 'stat']).optional(),
  notes: z.string().optional(),
  isManualEntry: z.boolean().optional(),
  totalPrice: z.string().optional(),
  tests: z.array(z.object({
    testCatalogId: z.number().min(1, 'Test ID is required'),
    price: z.string().optional(),
  })).optional(),
});

// GET /api/lab/orders/[id] - Get a specific lab order
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const orderId = parseInt(id);

    if (isNaN(orderId)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    // Get the order with its tests
    const order = await tenantDb.query.labOrders.findFirst({
      where: and(
        eq(labOrders.id, orderId),
        eq(labOrders.practiceId, parseInt(userPractice.practiceId))
      ),
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Get the tests for this order using query API
    const orderTests = await tenantDb.query.labOrderTests.findMany({
      where: eq(labOrderTests.labOrderId, orderId),
      with: {
        testCatalog: true,
      },
    });

    const orderWithTests = {
      ...order,
      tests: orderTests.map((ot: any) => ({
        id: ot.id,
        testCatalogId: ot.testCatalogId,
        status: ot.status,
        price: ot.price,
        testName: ot.testCatalog?.name,
        testCode: ot.testCatalog?.testCode,
        category: ot.testCatalog?.category,
      })),
    };

    return NextResponse.json(orderWithTests);
  } catch (error) {
    console.error('Error fetching lab order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/lab/orders/[id] - Update a specific lab order
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const orderId = parseInt(id);

    if (isNaN(orderId)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    const body = await request.json();
    const validated = labOrderUpdateSchema.parse(body);

    // Check if order exists and belongs to the practice using query API
    const existingOrder = await tenantDb.query.labOrders.findFirst({
      where: and(
        eq(labOrders.id, orderId),
        eq(labOrders.practiceId, parseInt(userPractice.practiceId))
      ),
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Update the order
    const updateData: any = {
      ...validated,
      updatedAt: Date.now(),
    };

    if (validated.sampleCollectionDate) {
      updateData.sampleCollectionDate = Date.now();
    }

    // Remove tests from update data as they're handled separately
    delete updateData.tests;

    const [updatedOrder] = await tenantDb
      .update(labOrders)
      .set(updateData)
      .where(
        and(
          eq(labOrders.id, orderId),
          eq(labOrders.practiceId, parseInt(userPractice.practiceId))
        )
      )
      .returning();

    // Update tests if provided
    if (validated.tests) {
      // Delete existing tests
      await tenantDb
        .delete(labOrderTests)
        .where(eq(labOrderTests.labOrderId, orderId));

      // Add new tests
      if (validated.tests.length > 0) {
        const orderTests = validated.tests.map(test => ({
          labOrderId: orderId,
          testCatalogId: test.testCatalogId,
          price: test.price,
          status: 'ordered' as const,
        }));

        await tenantDb.insert(labOrderTests).values(orderTests);
      }
    }

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Error updating lab order:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/lab/orders/[id] - Delete a specific lab order
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const orderId = parseInt(id);

    if (isNaN(orderId)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    // Check if order exists and belongs to the practice using query API
    const existingOrder = await tenantDb.query.labOrders.findFirst({
      where: and(
        eq(labOrders.id, orderId),
        eq(labOrders.practiceId, parseInt(userPractice.practiceId))
      ),
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Delete the order (tests will be cascade deleted)
    await tenantDb
      .delete(labOrders)
      .where(
        and(
          eq(labOrders.id, orderId),
          eq(labOrders.practiceId, parseInt(userPractice.practiceId))
        )
      );

    return NextResponse.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting lab order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
