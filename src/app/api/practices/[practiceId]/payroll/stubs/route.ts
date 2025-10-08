import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { payroll, payPeriods, payrollDeductions, deductionTypes } from '@/db/schemas/financeSchema';
import { users } from '@/db/schemas/usersSchema';
import { eq, and, desc, sum } from 'drizzle-orm';

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
      deductions: payroll.deductions,
      taxes: payroll.taxes,
      status: payroll.status,
      userName: users.name,
      payPeriodName: payPeriods.name
    }).from(payroll)
      .leftJoin(users, eq(users.id, payroll.employeeId))
      .leftJoin(payPeriods, eq(payPeriods.id, payroll.payPeriodId))
      .where(payPeriodId ? and(baseWhere, eq(payroll.payPeriodId, Number(payPeriodId))) : baseWhere)
      .orderBy(desc(payroll.payDate));

    // Get detailed deductions for each payroll record
    const enhancedRows = await Promise.all(rows.map(async (row: any) => {
      const deductionDetails = await tenantDb.select({
        id: payrollDeductions.id,
        amount: payrollDeductions.amount,
        description: payrollDeductions.description,
        isEmployerPaid: payrollDeductions.isEmployerPaid,
        calculationDetails: payrollDeductions.calculationDetails,
        deductionCategory: deductionTypes.category,
        deductionCode: deductionTypes.code
      })
      .from(payrollDeductions)
      .leftJoin(deductionTypes, eq(deductionTypes.id, payrollDeductions.deductionTypeId))
      .where(eq(payrollDeductions.payrollId, row.id));

      // Calculate total deductions (excluding employer-paid items)
      const totalDeductions = deductionDetails
        .filter((d: any) => !d.isEmployerPaid)
        .reduce((sum: number, d: any) => sum + parseFloat(d.amount || '0'), 0);

      // Group deductions by category
      const deductionsByCategory = {
        taxes: deductionDetails.filter((d: any) => d.deductionCategory === 'tax'),
        benefits: deductionDetails.filter((d: any) => d.deductionCategory === 'benefit'),
        voluntary: deductionDetails.filter((d: any) => d.deductionCategory === 'voluntary'),
        garnishments: deductionDetails.filter((d: any) => d.deductionCategory === 'garnishment')
      };

      return {
        ...row,
        totalDeductions,
        deductionDetails,
        deductionsByCategory,
        // Parse stored JSON if available
        deductionsBreakdown: row.deductions ? JSON.parse(row.deductions) : null,
        taxesBreakdown: row.taxes ? JSON.parse(row.taxes) : null
      };
    }));

    return NextResponse.json(enhancedRows);
  } catch (e) {
    console.error('List pay stubs error', e);
    return NextResponse.json({ error: 'Failed to list pay stubs' }, { status: 500 });
  }
}
