import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { budgets, expenses } from '@/db/schemas/financeSchema';
import { and, eq, gte, lte, sql, desc, sum } from 'drizzle-orm';

function parseParams(context: { params: Promise<{ practiceId: string }> | { practiceId: string } }) {
  return context.params as any;
}

export async function GET(request: NextRequest, context: { params: Promise<{ practiceId: string }> | { practiceId: string } }) {
  try {
    const { practiceId } = await parseParams(context);
    const userPractice = await getUserPractice(request);
    if (!userPractice) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (parseInt(practiceId) !== parseInt(userPractice.practiceId)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    const tenantDb = await getCurrentTenantDb();
    const rows = await tenantDb.select().from(budgets).where(eq(budgets.practiceId, Number(practiceId))).orderBy(desc(budgets.periodStart));

    // Compute current spend vs allocation for each budget (simple sum of expenses overlapping period and matching category if specified)
    const enriched = [] as any[];
    for (const b of rows) {
      const clauses: any[] = [eq(expenses.practiceId, b.practiceId), gte(expenses.expenseDate, b.periodStart), lte(expenses.expenseDate, b.periodEnd)];
      if (b.category) clauses.push(eq(expenses.category, b.category));
      const [agg] = await tenantDb.select({ spent: sum(sql`CAST(${expenses.amount} AS DECIMAL)`) }).from(expenses).where(and(...clauses));
      const spent = agg?.spent ? Number(agg.spent) : 0;
      enriched.push({
        ...b,
        spent,
        remaining: Number(b.amountAllocated) - spent,
        utilization: Number(b.amountAllocated) > 0 ? (spent / Number(b.amountAllocated)) : 0,
      });
    }
    return NextResponse.json(enriched);
  } catch (e) {
    console.error('Error listing budgets', e);
    return NextResponse.json({ error: 'Failed to list budgets' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ practiceId: string }> | { practiceId: string } }) {
  try {
    const { practiceId } = await parseParams(context);
    const userPractice = await getUserPractice(request);
    if (!userPractice) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (parseInt(practiceId) !== parseInt(userPractice.practiceId)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    const body = await request.json();
    const { name, category, periodStart, periodEnd, amountAllocated, notes } = body;
    if (!name || !periodStart || !periodEnd || !amountAllocated) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    const tenantDb = await getCurrentTenantDb();
    const [created] = await tenantDb.insert(budgets).values({
      practiceId: Number(practiceId),
      name,
      category: category || null,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      amountAllocated: amountAllocated.toString(),
      notes: notes || null,
    }).returning();
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error('Error creating budget', e);
    return NextResponse.json({ error: 'Failed to create budget' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ practiceId: string }> | { practiceId: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const { practiceId } = await parseParams(context);
    const userPractice = await getUserPractice(request);
    if (!userPractice) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (parseInt(practiceId) !== parseInt(userPractice.practiceId)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    const tenantDb = await getCurrentTenantDb();
    await tenantDb.delete(budgets).where(and(eq(budgets.practiceId, Number(practiceId)), eq(budgets.id, Number(id))));
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Error deleting budget', e);
    return NextResponse.json({ error: 'Failed to delete budget' }, { status: 500 });
  }
}
