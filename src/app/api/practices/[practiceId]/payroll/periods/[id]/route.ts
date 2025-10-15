import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { payPeriods } from '@/db/schemas/financeSchema';
import { eq, and } from 'drizzle-orm';

export async function PATCH(req: NextRequest, context: { params: Promise<{ practiceId: string; id: string }> | { practiceId: string; id: string } }) {
  try {
    const resolvedParams = await context.params as { practiceId: string; id: string };
    const userPractice = await getUserPractice(req);
    if (!userPractice) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const practiceId = Number(resolvedParams.practiceId);
    if (practiceId !== parseInt(userPractice.practiceId)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    const id = Number(resolvedParams.id);
    const body = await req.json();
    const { name, startDate, endDate, payDate, status, description } = body;
    const tenantDb = await getCurrentTenantDb();
    const [existing] = await tenantDb.select().from(payPeriods).where(and(eq(payPeriods.id, id), eq(payPeriods.practiceId, practiceId)));
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const [updated] = await tenantDb.update(payPeriods).set({
      name: name || existing.name,
      startDate: startDate ? new Date(startDate) : existing.startDate,
      endDate: endDate ? new Date(endDate) : existing.endDate,
      payDate: payDate ? new Date(payDate) : existing.payDate,
      status: status || existing.status,
      description: description !== undefined ? (description || null) : existing.description,
      updatedAt: new Date()
    }).where(and(eq(payPeriods.id, id), eq(payPeriods.practiceId, practiceId))).returning();
    return NextResponse.json(updated);
  } catch (e) {
    console.error('Update pay period error', e);
    return NextResponse.json({ error: 'Failed to update pay period' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ practiceId: string; id: string }> | { practiceId: string; id: string } }) {
  try {
    const resolvedParams = await context.params as { practiceId: string; id: string };
    const userPractice = await getUserPractice(req);
    if (!userPractice) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const practiceId = Number(resolvedParams.practiceId);
    if (practiceId !== parseInt(userPractice.practiceId)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    const id = Number(resolvedParams.id);
  const tenantDb = await getCurrentTenantDb();
  const [deleted] = await tenantDb.delete(payPeriods).where(and(eq(payPeriods.id, id), eq(payPeriods.practiceId, practiceId))).returning();
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Delete pay period error', e);
    return NextResponse.json({ error: 'Failed to delete pay period' }, { status: 500 });
  }
}
