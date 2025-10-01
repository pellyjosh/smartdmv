import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { payRates } from '@/db/schemas/financeSchema';
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
    const { userId, rateType, rate, effectiveDate, description } = body;
    const db = await getCurrentTenantDb();
    const [existing] = await db.select().from(payRates).where(and(eq(payRates.id, id), eq(payRates.practiceId, practiceId)));
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const [updated] = await db.update(payRates).set({
      userId: userId != null ? Number(userId) : existing.userId,
      rateType: rateType || existing.rateType,
      rate: rate != null ? rate.toString() : existing.rate,
      effectiveDate: effectiveDate ? new Date(effectiveDate) : existing.effectiveDate,
      description: description !== undefined ? (description || null) : existing.description
    }).where(eq(payRates.id, id)).returning();
    return NextResponse.json(updated);
  } catch (e) {
    console.error('Update pay rate error', e);
    return NextResponse.json({ error: 'Failed to update pay rate' }, { status: 500 });
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
    const db = await getCurrentTenantDb();
    const [deleted] = await db.delete(payRates).where(and(eq(payRates.id, id), eq(payRates.practiceId, practiceId))).returning();
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Delete pay rate error', e);
    return NextResponse.json({ error: 'Failed to delete pay rate' }, { status: 500 });
  }
}
