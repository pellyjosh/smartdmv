import { NextRequest, NextResponse } from "next/server";
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { payrollAnalytics, payroll, payrollDeductions, workHours } from "@/db/schemas/financeSchema";
import { eq, and, gte, lte, sum, count, avg, desc, sql } from "drizzle-orm";
import { z } from "zod";

const analyticsQuerySchema = z.object({
  metricType: z.enum(['cost_per_employee', 'overtime_trends', 'department_costs', 'tax_compliance', 'deduction_analysis']).optional(),
  period: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// GET /api/practices/[practiceId]/payroll/analytics
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ practiceId: string }> | { practiceId: string } }
) {
  try {
    const resolvedParams = await context.params as { practiceId: string };
    const userPractice = await getUserPractice(request);
    if (!userPractice) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const practiceId = Number(resolvedParams.practiceId);
    if (practiceId !== parseInt(userPractice.practiceId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const tenantDb = await getCurrentTenantDb();
    
    const { searchParams } = new URL(request.url);
    const query = analyticsQuerySchema.parse({
      metricType: searchParams.get('metricType'),
      period: searchParams.get('period') || 'monthly',
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
    });

    const analytics = await generateAnalyticsData(tenantDb, practiceId, query);

    return NextResponse.json(analytics);
  } catch (error: any) {
    console.error('Error fetching payroll analytics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

// POST /api/practices/[practiceId]/payroll/analytics/generate
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ practiceId: string }> | { practiceId: string } }
) {
  try {
    const resolvedParams = await context.params as { practiceId: string };
    const userPractice = await getUserPractice(request);
    if (!userPractice) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const practiceId = Number(resolvedParams.practiceId);
    if (practiceId !== parseInt(userPractice.practiceId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const tenantDb = await getCurrentTenantDb();
    
    // Generate analytics for all metric types
    const metricTypes = ['cost_per_employee', 'overtime_trends', 'department_costs', 'tax_compliance', 'deduction_analysis'];
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12); // Last 12 months

    const generatedAnalytics = [];

    for (const metricType of metricTypes) {
      const analyticsData = await generateMetricData(tenantDb, practiceId, metricType, startDate, endDate);
      
      for (const data of analyticsData) {
        const [analytic] = await tenantDb.insert(payrollAnalytics).values({
          practiceId: practiceId,
          metricType: metricType,
          period: 'monthly',
          date: data.date,
          value: data.value.toString(),
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
          createdAt: new Date(),
        }).returning();
        
        generatedAnalytics.push(analytic);
      }
    }

    return NextResponse.json({ 
      message: 'Analytics generated successfully',
      count: generatedAnalytics.length,
      analytics: generatedAnalytics 
    });
  } catch (error: any) {
    console.error('Error generating payroll analytics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate analytics' },
      { status: 500 }
    );
  }
}

async function generateAnalyticsData(db: any, practiceId: number, query: any) {
  const { metricType, period, startDate, endDate } = query;
  
  if (metricType) {
    return await getSpecificMetric(db, practiceId, metricType, period, startDate, endDate);
  }

  // Return dashboard overview with multiple metrics
  const [
    costTrends,
    overtimeTrends,
    deductionAnalysis,
    payrollSummary
  ] = await Promise.all([
    getSpecificMetric(db, practiceId, 'cost_per_employee', period, startDate, endDate),
    getSpecificMetric(db, practiceId, 'overtime_trends', period, startDate, endDate),
    getSpecificMetric(db, practiceId, 'deduction_analysis', period, startDate, endDate),
    getPayrollSummary(db, practiceId, startDate, endDate)
  ]);

  return {
    overview: payrollSummary,
    trends: {
      costPerEmployee: costTrends,
      overtime: overtimeTrends,
      deductions: deductionAnalysis,
    },
    period: period,
    dateRange: { startDate, endDate }
  };
}

async function getSpecificMetric(db: any, practiceId: number, metricType: string, period: string, startDate?: string, endDate?: string) {
  let whereConditions = [eq(payrollAnalytics.practiceId, practiceId)];
  
  if (metricType) {
    whereConditions.push(eq(payrollAnalytics.metricType, metricType));
  }
  
  if (period) {
    whereConditions.push(eq(payrollAnalytics.period, period));
  }
  
  if (startDate) {
    whereConditions.push(gte(payrollAnalytics.date, startDate));
  }
  
  if (endDate) {
    whereConditions.push(lte(payrollAnalytics.date, endDate));
  }

  const analytics = await db.select()
    .from(payrollAnalytics)
    .where(and(...whereConditions))
    .orderBy(desc(payrollAnalytics.date));

  return analytics.map((a: any) => ({
    ...a,
    metadata: a.metadata ? JSON.parse(a.metadata) : null
  }));
}

async function getPayrollSummary(db: any, practiceId: number, startDate?: string, endDate?: string) {
  const defaultEndDate = endDate || new Date().toISOString().split('T')[0];
  const defaultStartDate = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const summaryQuery = await db.select({
    totalGross: sum(payroll.grossAmount),
    totalNet: sum(payroll.netAmount),
    employeeCount: sql`count(distinct ${payroll.employeeId})`,
    payrollCount: count(payroll.id),
    avgGrossPerEmployee: avg(payroll.grossAmount),
  }).from(payroll)
    .where(and(
      eq(payroll.practiceId, practiceId),
      gte(payroll.periodStart, new Date(defaultStartDate)),
      lte(payroll.periodEnd, new Date(defaultEndDate))
    ));

  const [summary] = summaryQuery;

  const deductionsQuery = await db.select({
    totalDeductions: sum(payrollDeductions.amount),
  }).from(payrollDeductions)
    .innerJoin(payroll, eq(payrollDeductions.payrollId, payroll.id))
    .where(and(
      eq(payroll.practiceId, practiceId),
      gte(payroll.periodStart, new Date(defaultStartDate)),
      lte(payroll.periodEnd, new Date(defaultEndDate))
    ));

  const [deductions] = deductionsQuery;

  const overtimeQuery = await db.select({
    totalHoursWorked: sum(workHours.hoursWorked),
    employeeCount: sql`count(distinct ${workHours.userId})`,
  }).from(workHours)
    .where(and(
      eq(workHours.practiceId, practiceId),
      gte(workHours.date, new Date(defaultStartDate)),
      lte(workHours.date, new Date(defaultEndDate))
    ));

  const [overtime] = overtimeQuery;

  return {
    totalGross: parseFloat(summary?.totalGross || '0'),
    totalNet: parseFloat(summary?.totalNet || '0'),
    totalDeductions: parseFloat(deductions?.totalDeductions || '0'),
    employeeCount: summary?.employeeCount || 0,
    payrollCount: summary?.payrollCount || 0,
    avgGrossPerEmployee: parseFloat(summary?.avgGrossPerEmployee || '0'),
    totalHoursWorked: parseFloat(overtime?.totalHoursWorked || '0'),
    avgHoursPerEmployee: overtime?.employeeCount 
      ? parseFloat(overtime.totalHoursWorked || '0') / parseInt(overtime.employeeCount)
      : 0,
    period: { startDate: defaultStartDate, endDate: defaultEndDate }
  };
}

async function generateMetricData(db: any, practiceId: number, metricType: string, startDate: Date, endDate: Date) {
  const monthlyData = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
    const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
    
    let value = 0;
    let metadata = {};

    switch (metricType) {
      case 'cost_per_employee':
        const costData = await db.select({
          avgCost: avg(payroll.grossAmount),
          employeeCount: sql`count(distinct ${payroll.employeeId})`,
        }).from(payroll)
          .where(and(
            eq(payroll.practiceId, practiceId),
            gte(payroll.periodStart, monthStart),
            lte(payroll.periodEnd, monthEnd)
          ));
        
        value = parseFloat(costData[0]?.avgCost || '0');
        metadata = { employeeCount: costData[0]?.employeeCount || 0 };
        break;

      case 'overtime_trends':
        const overtimeData = await db.select({
          totalHours: sum(workHours.hoursWorked),
          employeeCount: sql`count(distinct ${workHours.userId})`,
        }).from(workHours)
          .where(and(
            eq(workHours.practiceId, practiceId),
            gte(workHours.date, monthStart),
            lte(workHours.date, monthEnd)
          ));
        
        const totalHours = parseFloat(overtimeData[0]?.totalHours || '0');
        const empCount = parseInt(overtimeData[0]?.employeeCount || '0');
        value = empCount > 0 ? totalHours / empCount : 0;
        metadata = { totalHours, employeeCount: empCount };
        break;

      case 'deduction_analysis':
        const deductionData = await db.select({
          totalDeductions: sum(payrollDeductions.amount),
        }).from(payrollDeductions)
          .innerJoin(payroll, eq(payrollDeductions.payrollId, payroll.id))
          .where(and(
            eq(payroll.practiceId, practiceId),
            gte(payroll.periodStart, monthStart),
            lte(payroll.periodEnd, monthEnd)
          ));
        
        value = parseFloat(deductionData[0]?.totalDeductions || '0');
        break;

      default:
        value = 0;
    }

    monthlyData.push({
      date: monthStart.toISOString().split('T')[0],
      value: parseFloat(value.toFixed(2)),
      metadata
    });

    current.setMonth(current.getMonth() + 1);
  }

  return monthlyData;
}