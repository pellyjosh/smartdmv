import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { serviceCodes } from '@/db/schemas/billingSchema';
import { eq } from 'drizzle-orm';

// GET /api/practices/[practiceId]/service-codes/[id]
export async function GET(request: NextRequest, { params }: { params: Promise<{ practiceId: string; id: string }> }) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { practiceId: practiceIdString, id: idString } = await params;
    const practiceId = parseInt(practiceIdString);
    const id = parseInt(idString);
    if (practiceId !== parseInt(userPractice.practiceId)) {
      return NextResponse.json({ error: 'Access denied to this practice' }, { status: 403 });
    }
    const tenantDb = await getCurrentTenantDb();
    const [row] = await tenantDb.select().from(serviceCodes).where(eq(serviceCodes.id, id)).limit(1);
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(row);
  } catch (error) {
    console.error('Error fetching service code:', error);
    return NextResponse.json({ error: 'Failed to fetch service code' }, { status: 500 });
  }
}

// PUT /api/practices/[practiceId]/service-codes/[id]
export async function PUT(request: NextRequest, { params }: { params: Promise<{ practiceId: string; id: string }> }) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { practiceId: practiceIdString, id: idString } = await params;
    const practiceId = parseInt(practiceIdString);
    const id = parseInt(idString);
    if (practiceId !== parseInt(userPractice.practiceId)) {
      return NextResponse.json({ error: 'Access denied to this practice' }, { status: 403 });
    }
    const body = await request.json();
    const { code, description, defaultPrice, category, taxable, taxRateId, active } = body || {};
    if (!code || !description || !defaultPrice || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const tenantDb = await getCurrentTenantDb();
    await tenantDb
      .update(serviceCodes)
      .set({
        code,
        description,
        defaultPrice: defaultPrice.toString(),
        category,
        taxable: taxable ? 'yes' : 'no',
        taxRateId: taxRateId ?? null,
        active: active ? 'yes' : 'no',
        updatedAt: new Date(),
      })
      .where(eq(serviceCodes.id, id));
    const [updated] = await tenantDb.select().from(serviceCodes).where(eq(serviceCodes.id, id)).limit(1);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating service code:', error);
    return NextResponse.json({ error: 'Failed to update service code' }, { status: 500 });
  }
}

// DELETE /api/practices/[practiceId]/service-codes/[id]
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ practiceId: string; id: string }> }) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { practiceId: practiceIdString, id: idString } = await params;
    const practiceId = parseInt(practiceIdString);
    const id = parseInt(idString);
    if (practiceId !== parseInt(userPractice.practiceId)) {
      return NextResponse.json({ error: 'Access denied to this practice' }, { status: 403 });
    }
    const tenantDb = await getCurrentTenantDb();
    await tenantDb.delete(serviceCodes).where(eq(serviceCodes.id, id));
    return NextResponse.json({ success: true }, { status: 204 });
  } catch (error) {
    console.error('Error deleting service code:', error);
    return NextResponse.json({ error: 'Failed to delete service code' }, { status: 500 });
  }
}
