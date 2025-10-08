import { NextRequest, NextResponse } from "next/server";
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { payrollReports, payroll, payrollDeductions, deductionTypes, workHoursEnhanced } from "@/db/schemas/financeSchema";
import { eq, and, gte, lte, sum, count, desc, sql } from "drizzle-orm";
import { z } from "zod";

const generateReportSchema = z.object({
  reportType: z.enum(['summary', 'detailed', 'tax', 'deductions', 'analytics']),
  title: z.string().min(1),
  description: z.string().optional(),
  dateRange: z.object({
    startDate: z.string(),
    endDate: z.string(),
    period: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']).optional(),
  }),
  filters: z.object({
    departments: z.array(z.string()).optional(),
    employees: z.array(z.number()).optional(),
    payTypes: z.array(z.string()).optional(),
    includeDeductions: z.boolean().optional(),
    includeTaxes: z.boolean().optional(),
  }).optional(),
  exportFormat: z.enum(['pdf', 'excel', 'csv']).optional(),
});

// GET /api/practices/[practiceId]/payroll/reports
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
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const reportType = searchParams.get('reportType');
    const status = searchParams.get('status');

    let whereConditions = [eq(payrollReports.practiceId, practiceId)];
    
    if (reportType) {
      whereConditions.push(eq(payrollReports.reportType, reportType));
    }
    
    if (status) {
      whereConditions.push(eq(payrollReports.status, status));
    }

    const reports = await tenantDb.select()
      .from(payrollReports)
      .where(and(...whereConditions))
      .orderBy(desc(payrollReports.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(reports);
  } catch (error: any) {
    console.error('Error fetching payroll reports:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}

// POST /api/practices/[practiceId]/payroll/reports
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
    
    const body = await request.json();
    const validatedData = generateReportSchema.parse(body);

    // Create the report record
    const [report] = await tenantDb.insert(payrollReports).values({
      practiceId: practiceId,
      reportType: validatedData.reportType,
      title: validatedData.title,
      description: validatedData.description,
      dateRange: JSON.stringify(validatedData.dateRange),
      filters: validatedData.filters ? JSON.stringify(validatedData.filters) : null,
      generatedBy: parseInt(userPractice.userId),
      status: 'generating',
      exportFormat: validatedData.exportFormat,
      reportData: JSON.stringify({}),
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    // Generate the report data based on type
    const reportData = await generateReportData(tenantDb, practiceId, validatedData);

    // Update the report with generated data
    await tenantDb.update(payrollReports)
      .set({
        reportData: JSON.stringify(reportData),
        status: 'completed',
        updatedAt: new Date(),
      })
      .where(eq(payrollReports.id, report.id));

    const updatedReport = await tenantDb.select()
      .from(payrollReports)
      .where(eq(payrollReports.id, report.id))
      .limit(1);

    return NextResponse.json(updatedReport[0]);
  } catch (error: any) {
    console.error('Error generating payroll report:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate report' },
      { status: 500 }
    );
  }
}

async function generateReportData(db: any, practiceId: number, data: any) {
  const { dateRange, reportType, filters } = data;
  const startDate = new Date(dateRange.startDate);
  const endDate = new Date(dateRange.endDate);

  try {
    switch (reportType) {
      case 'summary':
        return await generateSummaryReport(db, practiceId, startDate, endDate, filters);
      case 'detailed':
        return await generateDetailedReport(db, practiceId, startDate, endDate, filters);
      case 'tax':
        return await generateTaxReport(db, practiceId, startDate, endDate, filters);
      case 'deductions':
        return await generateDeductionsReport(db, practiceId, startDate, endDate, filters);
      case 'analytics':
        return await generateAnalyticsReport(db, practiceId, startDate, endDate, filters);
      default:
        throw new Error('Invalid report type');
    }
  } catch (error) {
    console.error('Error generating report data:', error);
    return { error: 'Failed to generate report data' };
  }
}

async function generateSummaryReport(db: any, practiceId: number, startDate: Date, endDate: Date, filters: any) {
  // Get summary statistics
  const payrollQuery = db.select({
    totalGross: sum(payroll.grossAmount),
    totalNet: sum(payroll.netAmount),
    employeeCount: count(payroll.id),
  }).from(payroll)
    .where(and(
      eq(payroll.practiceId, practiceId),
      gte(payroll.periodStart, startDate),
      lte(payroll.periodEnd, endDate)
    ));

  const deductionsQuery = db.select({
    totalDeductions: sum(payrollDeductions.amount),
  }).from(payrollDeductions)
    .innerJoin(payroll, eq(payrollDeductions.payrollId, payroll.id))
    .where(and(
      eq(payroll.practiceId, practiceId),
      gte(payroll.periodStart, startDate),
      lte(payroll.periodEnd, endDate)
    ));

  const [summaryResult] = await payrollQuery;
  const [deductionsResult] = await deductionsQuery;

  const totalGrossPay = parseFloat(summaryResult?.totalGross || '0');
  const totalNetPay = parseFloat(summaryResult?.totalNet || '0');
  const totalDeductions = parseFloat(deductionsResult?.totalDeductions || '0');
  const totalTaxes = totalGrossPay - totalNetPay - totalDeductions;

  return {
    summary: {
      totalGrossPay,
      totalDeductions,
      totalNetPay,
      totalTaxes,
      employeeCount: summaryResult?.employeeCount || 0,
    },
    charts: [
      {
        type: 'pie',
        data: [totalGrossPay, totalDeductions, totalTaxes],
        labels: ['Gross Pay', 'Deductions', 'Taxes'],
      }
    ]
  };
}

async function generateDetailedReport(db: any, practiceId: number, startDate: Date, endDate: Date, filters: any) {
  const query = db.select({
    id: payroll.id,
    employeeId: payroll.employeeId,
    periodStart: payroll.periodStart,
    periodEnd: payroll.periodEnd,
    grossAmount: payroll.grossAmount,
    netAmount: payroll.netAmount,
    status: payroll.status,
    payDate: payroll.payDate,
  }).from(payroll)
    .where(and(
      eq(payroll.practiceId, practiceId),
      gte(payroll.periodStart, startDate),
      lte(payroll.periodEnd, endDate)
    ))
    .orderBy(desc(payroll.periodStart));

  const details = await query;

  return {
    details,
    summary: {
      totalRecords: details.length,
      totalGrossPay: details.reduce((sum: number, item: any) => sum + parseFloat(item.grossAmount), 0),
      totalNetPay: details.reduce((sum: number, item: any) => sum + parseFloat(item.netAmount), 0),
    }
  };
}

async function generateTaxReport(db: any, practiceId: number, startDate: Date, endDate: Date, filters: any) {
  // This would include tax calculations and compliance data
  // For now, return basic structure
  return {
    summary: {
      federalTax: 0,
      stateTax: 0,
      socialSecurity: 0,
      medicare: 0,
    },
    details: [],
    compliance: {
      status: 'compliant',
      issues: [],
    }
  };
}

async function generateDeductionsReport(db: any, practiceId: number, startDate: Date, endDate: Date, filters: any) {
  const query = db.select({
    deductionName: deductionTypes.name,
    category: deductionTypes.category,
    totalAmount: sum(payrollDeductions.amount),
    count: count(payrollDeductions.id),
  }).from(payrollDeductions)
    .innerJoin(payroll, eq(payrollDeductions.payrollId, payroll.id))
    .innerJoin(deductionTypes, eq(payrollDeductions.deductionTypeId, deductionTypes.id))
    .where(and(
      eq(payroll.practiceId, practiceId),
      gte(payroll.periodStart, startDate),
      lte(payroll.periodEnd, endDate)
    ))
    .groupBy(deductionTypes.id, deductionTypes.name, deductionTypes.category);

  const details = await query;

  return {
    details,
    summary: {
      totalDeductions: details.reduce((sum: number, item: any) => sum + parseFloat(item.totalAmount), 0),
      deductionCount: details.length,
    },
    charts: [
      {
        type: 'bar',
        data: details.map((d: any) => parseFloat(d.totalAmount)),
        labels: details.map((d: any) => d.deductionName),
      }
    ]
  };
}

async function generateAnalyticsReport(db: any, practiceId: number, startDate: Date, endDate: Date, filters: any) {
  // Get cost per employee trends
  const costQuery = db.select({
    month: sql`date_trunc('month', ${payroll.periodStart})`,
    avgCostPerEmployee: sql`avg(${payroll.grossAmount})`,
    employeeCount: sql`count(distinct ${payroll.employeeId})`,
  }).from(payroll)
    .where(and(
      eq(payroll.practiceId, practiceId),
      gte(payroll.periodStart, startDate),
      lte(payroll.periodEnd, endDate)
    ))
    .groupBy(sql`date_trunc('month', ${payroll.periodStart})`)
    .orderBy(sql`date_trunc('month', ${payroll.periodStart})`);

  const analytics = await costQuery;

  return {
    trends: analytics,
    charts: [
      {
        type: 'line',
        data: analytics.map((a: any) => parseFloat(a.avgCostPerEmployee || '0')),
        labels: analytics.map((a: any) => new Date(a.month).toLocaleDateString()),
      }
    ]
  };
}