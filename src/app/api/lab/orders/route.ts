import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { db } from '@/db';
import { labOrders, labOrderTests } from '@/db/schemas/labSchema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// Helpers
const parseDateInput = (input: unknown): Date | null => {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  if (typeof input === 'string') {
    const s = input.trim();
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};

const toIsoOrNull = (d: unknown): string | null => {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d as any);
  return isNaN(date.getTime()) ? null : date.toISOString();
};

const serializeOrder = (order: any) => ({
  ...order,
  orderDate: toIsoOrNull(order.orderDate),
  sampleCollectionDate: toIsoOrNull(order.sampleCollectionDate),
  createdAt: toIsoOrNull(order.createdAt),
  updatedAt: toIsoOrNull(order.updatedAt),
});

const toNumberOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string' && v.trim() === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
};

const toNumberOrUndefined = (v: unknown): number | undefined => {
  if (v === undefined) return undefined;
  if (v === null) return undefined;
  if (typeof v === 'string' && v.trim() === '') return undefined;
  const n = Number(v);
  return isNaN(n) ? undefined : n;
};

const createOrderSchema = z.object({
  petId: z.union([z.string().min(1, "Pet ID is required"), z.number()]),
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
  sampleCollectionDate: z.union([z.string(), z.date()]).optional(),
  tests: z.array(z.coerce.number()).default([]),
});

const updateOrderSchema = z.object({
  petId: z.union([z.string(), z.number()]).optional(),
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
  sampleCollectionDate: z.union([z.string(), z.date()]).optional(),
  tests: z.array(z.coerce.number()).optional(),
});

type CreateOrderInput = z.infer<typeof createOrderSchema>;
type UpdateOrderInput = z.infer<typeof updateOrderSchema>;

// GET - Fetch all lab orders for the practice
export async function GET(request: NextRequest) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
  const orders = await (db as any).query.labOrders.findMany({
      where: eq(labOrders.practiceId, Number(userPractice.practiceId)),
    });

  return NextResponse.json(orders.map(serializeOrder));
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
  const validated: CreateOrderInput = createOrderSchema.parse(body);
  const petIdNum = Number(validated.petId);
  const sampleDate = parseDateInput(validated.sampleCollectionDate);

    // Create the order
    const insertData: typeof labOrders.$inferInsert = {
      petId: petIdNum,
      practiceId: Number(userPractice.practiceId),
      orderedById: Number(userPractice.userId),
  provider: validated.provider as any,
  status: validated.status as any,
  sampleType: (validated.sampleType ?? null) as any,
  priority: validated.priority as any,
  notes: (validated.notes ?? null) as any,
  isManualEntry: validated.isManualEntry as any,
  totalPrice: (validated.totalPrice ?? null) as any,
  externalOrderId: (validated.externalOrderId ?? null) as any,
  externalReference: (validated.externalReference ?? null) as any,
      soapNoteId: toNumberOrNull(validated.soapNoteId),
      sampleCollectionDate: sampleDate,
    };

    const [order] = await (db as any)
      .insert(labOrders)
      .values(insertData)
      .returning();

    // Add tests to the order
    const testsArr = Array.isArray(validated.tests) ? (validated.tests as number[]) : [];
    if (testsArr.length > 0) {
      const orderTests = testsArr.map((testId: number) => ({
        labOrderId: order.id,
        testCatalogId: testId,
        status: 'ordered' as const,
      }));

      await (db as any).insert(labOrderTests).values(orderTests);
    }

  return NextResponse.json(serializeOrder(order), { status: 201 });
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

  const results = [] as any[];
    for (const update of updates) {
  const { id, ...updateData } = update;
  const validated: UpdateOrderInput = updateOrderSchema.parse(updateData);
  const idNum = Number(id);
  if (!id || isNaN(idNum)) {
        return NextResponse.json({ error: 'Each update must include a valid numeric id' }, { status: 400 });
      }
  const sampleDate = validated.sampleCollectionDate === undefined ? undefined : parseDateInput(validated.sampleCollectionDate);

      // Build update payload with only valid labOrders columns
      const updatePayload: any = {
        provider: validated.provider,
        status: validated.status,
        sampleType: validated.sampleType,
        priority: validated.priority,
        notes: validated.notes,
        isManualEntry: validated.isManualEntry,
        totalPrice: validated.totalPrice,
        externalOrderId: validated.externalOrderId,
        externalReference: validated.externalReference,
        petId: toNumberOrUndefined(validated.petId),
        soapNoteId: toNumberOrUndefined(validated.soapNoteId),
        sampleCollectionDate: sampleDate,
      };

  const [updatedOrder] = await (db as any)
        .update(labOrders)
        .set(updatePayload)
        .where(eq(labOrders.id, idNum))
        .returning();

      results.push(updatedOrder);
    }

  return NextResponse.json(results.map(serializeOrder));
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
  const idNum = Number(id);
    
    if (!id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }
    
  const validated: UpdateOrderInput = updateOrderSchema.parse(updateData);

    // Update the order
    if (!id || isNaN(idNum)) {
      return NextResponse.json({ error: 'Order ID must be a valid number' }, { status: 400 });
    }

    const [updatedOrder] = await (db as any)
      .update(labOrders)
      .set({
        provider: validated.provider,
        status: validated.status,
        sampleType: validated.sampleType,
        priority: validated.priority,
        notes: validated.notes,
        isManualEntry: validated.isManualEntry,
        totalPrice: validated.totalPrice,
        externalOrderId: validated.externalOrderId,
        externalReference: validated.externalReference,
        petId: toNumberOrUndefined(validated.petId),
        soapNoteId: toNumberOrUndefined(validated.soapNoteId),
        sampleCollectionDate: validated.sampleCollectionDate === undefined ? undefined : parseDateInput(validated.sampleCollectionDate),
      })
      .where(and(eq(labOrders.id, idNum), eq(labOrders.practiceId, Number(userPractice.practiceId))))
      .returning();

    if (!updatedOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Handle test updates if provided
    if (Array.isArray(validated.tests)) {
      // Remove existing tests
  await (db as any).delete(labOrderTests).where(eq(labOrderTests.labOrderId, idNum));
      
      // Add new tests
      if (validated.tests.length > 0) {
        const orderTests = (validated.tests as number[]).map((testId: number) => ({
          labOrderId: idNum,
          testCatalogId: testId,
          status: 'ordered' as const,
        }));

  await (db as any).insert(labOrderTests).values(orderTests);
      }
    }

  return NextResponse.json(serializeOrder(updatedOrder));
  } catch (error) {
    console.error('Error updating lab order:', error);
    return NextResponse.json(
      { error: 'Failed to update lab order' },
      { status: 500 }
    );
  }
}
