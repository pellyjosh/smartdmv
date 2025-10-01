import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { expenses } from '@/db/schemas/financeSchema';
import { and, eq } from 'drizzle-orm';

// DELETE /api/practices/[practiceId]/expenses/[expenseId]
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ practiceId: string; expenseId: string }> }) {
  try {
    const userPractice = await getUserPractice(request);
    if (!userPractice) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { practiceId, expenseId } = await params;
    const pId = parseInt(practiceId);
    const eId = parseInt(expenseId);
    if (pId !== parseInt(userPractice.practiceId)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    if (!eId) return NextResponse.json({ error: 'Invalid expense id' }, { status: 400 });
    const tenantDb = await getCurrentTenantDb();
    const deleted = await tenantDb.delete(expenses).where(and(eq(expenses.practiceId, pId), eq(expenses.id, eId))).returning({ id: expenses.id });
    if (!deleted.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Error deleting expense', e);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}