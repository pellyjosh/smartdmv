import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
;
import { labOrders, labOrderTests } from '@/db/schemas/labSchema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// Helpers
const parseDateInput = (input: unknown): Date | null => {
  // Tolerant date parsing: accept Date, string, number (ms or ISO), and several common object shapes.
  if (input === undefined || input === null) return null;

  // Already a Date
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;

  // Number (timestamp in ms or seconds)
  if (typeof input === 'number' && !isNaN(input)) {
    // if it's likely seconds (10 digits), convert to ms
    const maybeMs = input < 1e12 ? input * 1000 : input;
    const d = new Date(maybeMs);
    return isNaN(d.getTime()) ? null : d;
  }

  // String
  if (typeof input === 'string') {
    const s = input.trim();
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  // Objects: try common shapes
  if (typeof input === 'object') {
    try {
      const anyInput: any = input;
      // If it's a luxon/moment-like object with toISOString
      if (typeof anyInput.toISOString === 'function') {
        const d = new Date(anyInput.toISOString());
        if (!isNaN(d.getTime())) return d;
      }

      // If it has epochMillis / epoch / value / valueOf
      if (typeof anyInput.epochMillis === 'number') {
        const d = new Date(anyInput.epochMillis);
        if (!isNaN(d.getTime())) return d;
      }
      if (typeof anyInput.epoch === 'number') {
        const maybeMs = anyInput.epoch < 1e12 ? anyInput.epoch * 1000 : anyInput.epoch;
        const d = new Date(maybeMs);
        if (!isNaN(d.getTime())) return d;
      }
      if (typeof anyInput.valueOf === 'function') {
        const v = anyInput.valueOf();
        if (typeof v === 'number' && !isNaN(v)) {
          const d = new Date(v < 1e12 ? v * 1000 : v);
          if (!isNaN(d.getTime())) return d;
        }
      }

      // If it looks like { year, month, day }
      if (
        typeof anyInput.year === 'number' &&
        typeof anyInput.month === 'number' &&
        typeof anyInput.day === 'number'
      ) {
        // month in JS Date is 0-indexed
        const d = new Date(anyInput.year, anyInput.month - 1, anyInput.day);
        if (!isNaN(d.getTime())) return d;
      }

      // Fallback: stringify and try
      const str = JSON.stringify(anyInput);
      const d = new Date(str);
      return isNaN(d.getTime()) ? null : d;
    } catch (e) {
      return null;
    }
  }

  return null;
};

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
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
  const orders = await (db as any).query.labOrders.findMany({
      where: eq(labOrders.practiceId, Number(userPractice.practiceId)),
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
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

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
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

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
  // Normalize sampleCollectionDate safely
  const rawSample = validated.sampleCollectionDate as any;
  let sampleDate: Date | null | undefined;
  if (rawSample === undefined) {
    sampleDate = undefined;
  } else if (rawSample === null) {
    sampleDate = null;
  } else if (Array.isArray(rawSample) && rawSample.length > 0) {
    sampleDate = parseDateInput(rawSample[0]);
  } else {
    sampleDate = parseDateInput(rawSample);
  }

  if (rawSample !== undefined && rawSample !== null && sampleDate === null) {
    // Don't fail the entire batch for a malformed date. Log and ignore the sample date for this update.
    console.warn(`PUT /api/lab/orders - invalid sampleCollectionDate for id=${id}; ignoring value.`, { rawSample });
    sampleDate = undefined;
  }

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

  try {
    console.debug('PUT /api/lab/orders - performing update', { id: idNum, updatePayload });
    const [updatedOrder] = await (db as any)
      .update(labOrders)
      .set(updatePayload)
      .where(eq(labOrders.id, idNum))
      .returning();

    results.push(updatedOrder);
  } catch (e) {
    console.error('DB error updating lab order (PUT) for id=' + idNum + ':', e, { updatePayload });
    throw e;
  }
    }

  return NextResponse.json(results);
  } catch (error) {
    console.error('Error updatinggg lab orders:', error);
    return NextResponse.json(
      { error: 'Failed to update lab orders' },
      { status: 500 }
    );
  }
}

// PATCH - Update a single lab order
export async function PATCH(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

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

    // Normalize sampleCollectionDate safely (handle strings, Date, arrays, objects)
    const rawSample = validated.sampleCollectionDate as any;
    let sampleDateNormalized: Date | null | undefined;
    if (rawSample === undefined) {
      sampleDateNormalized = undefined;
    } else if (rawSample === null) {
      sampleDateNormalized = null;
    } else if (Array.isArray(rawSample) && rawSample.length > 0) {
      // if an array was sent accidentally, try the first element
      sampleDateNormalized = parseDateInput(rawSample[0]);
    } else {
      sampleDateNormalized = parseDateInput(rawSample);
    }

    // If the caller provided a value but we couldn't parse it, log and ignore it rather than failing
    if (rawSample !== undefined && rawSample !== null && sampleDateNormalized === null) {
      console.warn('PATCH /api/lab/orders - invalid sampleCollectionDate; ignoring value.', { id: idNum, rawSample });
      sampleDateNormalized = undefined;
    }

    // Small diagnostic log if input types are unexpected (helps trace toISOString issues)
    console.debug('PATCH /api/lab/orders - date-normalization', {
      id: idNum,
      rawSampleType: Array.isArray(rawSample) ? 'array' : typeof rawSample,
      rawSampleValue: Array.isArray(rawSample) ? rawSample.slice(0,3) : rawSample,
      sampleDateNormalized
    });

    // Update the order
    if (!id || isNaN(idNum)) {
      return NextResponse.json({ error: 'Order ID must be a valid number' }, { status: 400 });
    }

    let updatedOrder: any;
    const changesToApply: any = {
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
      sampleCollectionDate: sampleDateNormalized === undefined ? undefined : sampleDateNormalized,
    };

    try {
      console.debug('PATCH /api/lab/orders - applying update', { id: idNum, changesToApply });
      const [res] = await (db as any)
        .update(labOrders)
        .set(changesToApply)
        .where(and(eq(labOrders.id, idNum), eq(labOrders.practiceId, Number(userPractice.practiceId))))
        .returning();
      updatedOrder = res;
    } catch (err) {
      console.error('DB error updating lab order (PATCH):', err, { id: idNum, changesToApply });
      return new Response(JSON.stringify({ error: 'partial_failure', id: idNum, message: 'Failed to apply some changes; see server logs' }), { status: 207 });
    }

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

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Error updatinggggg lab order:', error);
    return NextResponse.json(
      { error: 'Failed to update lab order' },
      { status: 500 }
    );
  }
}
