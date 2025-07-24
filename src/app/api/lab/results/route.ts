import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { db } from '@/db';
import { labResults, labOrders, labTestCatalog, labProviderSettings } from '@/db/schemas/labSchema';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema for lab result
const labResultSchema = z.object({
  labOrderId: z.number().min(1, 'Order ID is required'),
  testCatalogId: z.number().optional(),
  results: z.string().min(1, 'Results data is required'),
  interpretation: z.string().optional(),
  status: z.enum(['normal', 'abnormal', 'critical', 'pending', 'inconclusive']).default('pending'),
  referenceRange: z.record(z.any()).optional(),
  previousValue: z.record(z.any()).optional(),
  previousDate: z.string().datetime().optional(),
  trendDirection: z.enum(['increasing', 'decreasing', 'stable', 'fluctuating', 'none']).optional(),
  abnormalFlags: z.array(z.string()).optional(),
  reviewedBy: z.string().optional(),
  notes: z.string().optional(),
  filePath: z.string().optional(),
});

// GET /api/lab/results - Get all lab results
export async function GET(request: NextRequest) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const orderId = searchParams.get('orderId');
    const testId = searchParams.get('testId');
    const status = searchParams.get('status');
    const petId = searchParams.get('petId');

    // Join with orders to filter by practice
    let whereConditions = [eq(labOrders.practiceId, userPractice.practiceId)];

    if (orderId) {
      whereConditions.push(eq(labResults.labOrderId, parseInt(orderId)));
    }
    if (testId) {
      whereConditions.push(eq(labResults.testCatalogId, parseInt(testId)));
    }
    if (status) {
      whereConditions.push(eq(labResults.status, status as any));
    }

    const results = await db
      .select({
        id: labResults.id,
        labOrderId: labResults.labOrderId,
        testCatalogId: labResults.testCatalogId,
        resultDate: labResults.resultDate,
        results: labResults.results,
        interpretation: labResults.interpretation,
        status: labResults.status,
        referenceRange: labResults.referenceRange,
        previousValue: labResults.previousValue,
        previousDate: labResults.previousDate,
        trendDirection: labResults.trendDirection,
        abnormalFlags: labResults.abnormalFlags,
        reviewedBy: labResults.reviewedBy,
        reviewedAt: labResults.reviewedAt,
        notes: labResults.notes,
        filePath: labResults.filePath,
        createdAt: labResults.createdAt,
        order: {
          id: labOrders.id,
          petId: labOrders.petId,
          status: labOrders.status,
          orderDate: labOrders.orderDate,
        },
        test: {
          id: labTestCatalog.id,
          testName: labTestCatalog.testName,
          testCode: labTestCatalog.testCode,
          category: labTestCatalog.category,
        },
      })
      .from(labResults)
      .innerJoin(labOrders, eq(labResults.labOrderId, labOrders.id))
      .leftJoin(labTestCatalog, eq(labResults.testCatalogId, labTestCatalog.id))
      .where(and(...whereConditions))
      .orderBy(desc(labResults.resultDate));

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error fetching lab results:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/lab/results - Create a new lab result
export async function POST(request: NextRequest) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = labResultSchema.parse(body);

    const [result] = await db
      .insert(labResults)
      .values({
        ...validated,
        referenceRange: validated.referenceRange ? JSON.stringify(validated.referenceRange) : null,
        previousValue: validated.previousValue ? JSON.stringify(validated.previousValue) : null,
        abnormalFlags: validated.abnormalFlags ? JSON.stringify(validated.abnormalFlags) : null,
        previousDate: validated.previousDate ? new Date(validated.previousDate) : null,
      })
      .returning();

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating lab result:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/lab/results - Update a lab result
export async function PUT(request: NextRequest) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'Result ID is required' }, { status: 400 });
    }

    const validated = labResultSchema.partial().parse(updateData);

    // Verify the result belongs to this practice through the order
    const existingResult = await db
      .select({ id: labResults.id })
      .from(labResults)
      .innerJoin(labOrders, eq(labResults.labOrderId, labOrders.id))
      .where(
        and(
          eq(labResults.id, id),
          eq(labOrders.practiceId, userPractice.practiceId)
        )
      )
      .limit(1);

    if (!existingResult.length) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 });
    }

    const [updatedResult] = await db
      .update(labResults)
      .set({
        ...validated,
        referenceRange: validated.referenceRange ? JSON.stringify(validated.referenceRange) : undefined,
        previousValue: validated.previousValue ? JSON.stringify(validated.previousValue) : undefined,
        abnormalFlags: validated.abnormalFlags ? JSON.stringify(validated.abnormalFlags) : undefined,
        previousDate: validated.previousDate ? new Date(validated.previousDate) : undefined,
        reviewedAt: validated.reviewedBy ? new Date() : undefined,
      })
      .where(eq(labResults.id, id))
      .returning();

    return NextResponse.json(updatedResult);
  } catch (error) {
    console.error('Error updating lab result:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
