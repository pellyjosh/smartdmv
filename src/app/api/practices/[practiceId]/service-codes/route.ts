import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { serviceCodes } from '@/db/schemas/billingSchema';
import { eq, and, desc } from 'drizzle-orm';

// GET /api/practices/[practiceId]/service-codes - Get service codes for a practice
export async function GET(request: NextRequest, { params }: { params: Promise<{ practiceId: string }> }) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { practiceId: practiceIdString } = await params;
    const practiceId = parseInt(practiceIdString);
    
    // Verify user has access to this practice
    if (practiceId !== parseInt(userPractice.practiceId)) {
      return NextResponse.json({ error: 'Access denied to this practice' }, { status: 403 });
    }

    const tenantDb = await getCurrentTenantDb();
    const list = await tenantDb
      .select()
      .from(serviceCodes)
      .where(eq(serviceCodes.practiceId, practiceId))
      .orderBy(desc(serviceCodes.createdAt));
    return NextResponse.json(list);
  } catch (error) {
    console.error('Error fetching service codes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service codes' },
      { status: 500 }
    );
  }
}

// POST /api/practices/[practiceId]/service-codes - Create a service code (temporary in-memory)
export async function POST(request: NextRequest, { params }: { params: Promise<{ practiceId: string }> }) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { practiceId: practiceIdString } = await params;
    const practiceId = parseInt(practiceIdString);
    if (practiceId !== parseInt(userPractice.practiceId)) {
      return NextResponse.json({ error: 'Access denied to this practice' }, { status: 403 });
    }

    const body = await request.json();
    const { code, description, defaultPrice, category, taxable, taxRateId, active } = body || {};
    if (!code || !description || !defaultPrice || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const tenantDb = await getCurrentTenantDb();
    // Check for existing code
    const existing = await tenantDb
      .select({ id: serviceCodes.id })
      .from(serviceCodes)
      .where(and(eq(serviceCodes.practiceId, practiceId), eq(serviceCodes.code, code)))
      .limit(1);
    if (existing.length) {
      return NextResponse.json({ error: 'Service code already exists' }, { status: 409 });
    }
    const [created] = await tenantDb
      .insert(serviceCodes)
      .values({
        practiceId,
        code,
        description,
        category,
        defaultPrice: defaultPrice.toString(),
        taxable: taxable ? 'yes' : 'no',
        taxRateId: taxRateId ?? null,
        active: active ? 'yes' : 'no',
      })
      .returning();
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Error creating service code:', error);
    return NextResponse.json({ error: 'Failed to create service code' }, { status: 500 });
  }
}
