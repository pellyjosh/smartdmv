import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { payPeriods, payroll, workHours, payRates } from '@/db/schemas/financeSchema';
import { users } from '@/db/schemas/usersSchema';
import { and, eq } from 'drizzle-orm';

// Very simplified stub generation: aggregate approved work hours within period * latest hourly rate
export async function POST(req: NextRequest, context: { params: Promise<{ practiceId: string; id: string }> | { practiceId: string; id: string } }) {
  try {
    const resolvedParams = await context.params as { practiceId: string; id: string };
    const userPractice = await getUserPractice(req);
    if (!userPractice) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const practiceId = Number(resolvedParams.practiceId);
    if (practiceId !== parseInt(userPractice.practiceId)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    const periodId = Number(resolvedParams.id);
  const tenantDb = await getCurrentTenantDb();
  const [period] = await tenantDb.select().from(payPeriods).where(and(eq(payPeriods.id, periodId), eq(payPeriods.practiceId, practiceId)));
    if (!period) return NextResponse.json({ error: 'Pay period not found' }, { status: 404 });

    // Fetch approved hours within range
    const hoursRows = await tenantDb.select({
      userId: workHours.userId,
      hoursWorked: workHours.hoursWorked,
      payRateId: workHours.payRateId,
      date: workHours.date
    }).from(workHours)
      .where(and(eq(workHours.practiceId, practiceId), eq(workHours.isApproved, true)));
    const withinRange = hoursRows.filter((h: { date: Date }) => h.date >= period.startDate && h.date <= period.endDate);

    // Group by user
    const map = new Map<number, { totalHours: number; userId: number }>();
    withinRange.forEach((h: any) => {
      const current = map.get(h.userId) || { totalHours: 0, userId: h.userId };
      current.totalHours += parseFloat(h.hoursWorked as unknown as string);
      map.set(h.userId, current);
    });

    const created: any[] = [];
    for (const [, agg] of map) {
      // Fetch latest rate for user before or on period end
      const rateRows = await tenantDb.select().from(payRates)
        .where(and(eq(payRates.userId, agg.userId), eq(payRates.practiceId, practiceId)))
        .orderBy(payRates.effectiveDate);
      // pick latest effective <= period.endDate
      const latest = [...rateRows].reverse().find((r: any) => r.effectiveDate <= period.endDate);
      let gross = 0;
      if (latest) {
        if (latest.rateType === 'hourly') gross = agg.totalHours * parseFloat(latest.rate as unknown as string);
        else gross = (parseFloat(latest.rate as unknown as string) / 12) * ((period.endDate.getMonth() - period.startDate.getMonth() + 1));
      }
      const net = gross; // no deductions logic yet
      const [stub] = await tenantDb.insert(payroll).values({
        practiceId,
        employeeId: agg.userId,
        payPeriodId: period.id,
        periodStart: period.startDate,
        periodEnd: period.endDate,
        payDate: period.payDate,
        grossAmount: gross.toFixed(2),
        netAmount: net.toFixed(2),
        currency: 'USD',
        deductions: null,
        taxes: null,
        status: 'pending'
      }).returning();
      created.push(stub);
    }

    return NextResponse.json({ generated: created.length });
  } catch (e) {
    console.error('Generate pay stubs error', e);
    return NextResponse.json({ error: 'Failed to generate pay stubs' }, { status: 500 });
  }
}
