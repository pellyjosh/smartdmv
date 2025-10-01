import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { payroll, payPeriods } from '@/db/schemas/financeSchema';
import { users } from '@/db/schemas/usersSchema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(req: NextRequest, context: { params: Promise<{ practiceId: string }> | { practiceId: string } }) {
  try {
    const resolvedParams = await context.params as { practiceId: string };
    const userPractice = await getUserPractice(req);
    if (!userPractice) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const practiceId = Number(resolvedParams.practiceId);
    if (practiceId !== parseInt(userPractice.practiceId)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const payPeriodId = searchParams.get('payPeriodId');
  const tenantDb = await getCurrentTenantDb();
    const baseWhere = eq(payroll.practiceId, practiceId);
  const rows = await tenantDb.select({
      id: payroll.id,
      employeeId: payroll.employeeId,
      payPeriodId: payroll.payPeriodId,
      periodStart: payroll.periodStart,
      periodEnd: payroll.periodEnd,
      payDate: payroll.payDate,
      grossPay: payroll.grossAmount,
      netPay: payroll.netAmount,
      status: payroll.status,
      userName: users.name,
      payPeriodName: payPeriods.name,
      totalDeductions: payroll.deductions
    }).from(payroll)
      .leftJoin(users, eq(users.id, payroll.employeeId))
      .leftJoin(payPeriods, eq(payPeriods.id, payroll.payPeriodId))
      .where(payPeriodId ? and(baseWhere, eq(payroll.payPeriodId, Number(payPeriodId))) : baseWhere)
      .orderBy(desc(payroll.payDate));
  return NextResponse.json(rows.map((r: any) => ({ ...r, totalDeductions: 0 })));
  } catch (e) {
    console.error('List pay stubs error', e);
    return NextResponse.json({ error: 'Failed to list pay stubs' }, { status: 500 });
  }
}
