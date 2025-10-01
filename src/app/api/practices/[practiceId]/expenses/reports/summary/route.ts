import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { expenses } from '@/db/schemas/financeSchema';
import { and, eq, gte, lte, sql, sum } from 'drizzle-orm';

export async function GET(request: NextRequest, context: { params: Promise<{ practiceId: string }> | { practiceId: string } }) {
  try {
    const { practiceId } = await (context.params as any);
    const userPractice = await getUserPractice(request);
    if (!userPractice) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (parseInt(practiceId) !== parseInt(userPractice.practiceId)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const groupBy = searchParams.get('groupBy') || 'category'; // category | month

    const tenantDb = await getCurrentTenantDb();
    const clauses: any[] = [eq(expenses.practiceId, Number(practiceId))];
    if (start) clauses.push(gte(expenses.expenseDate, new Date(start)));
    if (end) clauses.push(lte(expenses.expenseDate, new Date(end)));

    if (groupBy === 'month') {
      const rows = await tenantDb.execute(sql`SELECT to_char(expense_date, 'YYYY-MM') AS label, SUM(CAST(amount AS DECIMAL)) AS total FROM expenses WHERE practice_id = ${practiceId} ${start ? sql`AND expense_date >= ${new Date(start)}` : sql``} ${end ? sql`AND expense_date <= ${new Date(end)}` : sql``} GROUP BY 1 ORDER BY 1`);
      return NextResponse.json(rows.rows);
    } else {
      const rows = await tenantDb.execute(sql`SELECT category AS label, SUM(CAST(amount AS DECIMAL)) AS total FROM expenses WHERE practice_id = ${practiceId} ${start ? sql`AND expense_date >= ${new Date(start)}` : sql``} ${end ? sql`AND expense_date <= ${new Date(end)}` : sql``} GROUP BY category ORDER BY total DESC`);
      return NextResponse.json(rows.rows);
    }
  } catch (e) {
    console.error('Error generating summary report', e);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
