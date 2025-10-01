import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { workHours } from '@/db/schemas/financeSchema';
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
    const { userId, date, hoursWorked, payRateId, description, isApproved } = body;
    const db = await getCurrentTenantDb();
    const [existing] = await db.select().from(workHours).where(and(eq(workHours.id, id), eq(workHours.practiceId, practiceId)));
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const [updated] = await db.update(workHours).set({
      userId: userId != null ? Number(userId) : existing.userId,
      date: date ? new Date(date) : existing.date,
      hoursWorked: hoursWorked != null ? hoursWorked.toString() : existing.hoursWorked,
      payRateId: payRateId != null ? Number(payRateId) : existing.payRateId,
      description: description !== undefined ? (description || null) : existing.description,
      isApproved: isApproved != null ? !!isApproved : existing.isApproved
    }).where(eq(workHours.id, id)).returning();
    return NextResponse.json(updated);
  } catch (e) {
    console.error('Update work hours error', e);
    return NextResponse.json({ error: 'Failed to update work hours' }, { status: 500 });
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
    const [deleted] = await db.delete(workHours).where(and(eq(workHours.id, id), eq(workHours.practiceId, practiceId))).returning();
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Delete work hours error', e);
    return NextResponse.json({ error: 'Failed to delete work hours' }, { status: 500 });
  }
}
