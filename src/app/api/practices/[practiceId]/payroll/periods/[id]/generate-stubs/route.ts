import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { 
  payPeriods, 
  payroll, 
  workHours, 
  payRates, 
  employeeDeductions, 
  deductionTypes,
  payrollDeductions 
} from '@/db/schemas/financeSchema';
import { currencies } from '@/db/schemas/currencySchema';
import { users } from '@/db/schemas/usersSchema';
import { and, eq } from 'drizzle-orm';

// Enhanced stub generation with proper deductions calculation
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

    // Get all employees with active pay rates for this practice
    const allEmployeeRates = await tenantDb.select({
      userId: payRates.userId,
      rateType: payRates.rateType,
      rate: payRates.rate,
      effectiveDate: payRates.effectiveDate,
      userName: users.name,
      userEmail: users.email
    })
    .from(payRates)
    .leftJoin(users, eq(users.id, payRates.userId))
    .where(eq(payRates.practiceId, practiceId))
    .orderBy(payRates.effectiveDate);

    // Get unique employees and their latest rates
    const employeeRatesMap = new Map<number, any>();
    allEmployeeRates.forEach((rate: any) => {
      if (rate.effectiveDate <= period.endDate) {
        employeeRatesMap.set(rate.userId, rate);
      }
    });

    // Fetch approved hours within range for hourly employees
    const hoursRows = await tenantDb.select({
      userId: workHours.userId,
      hoursWorked: workHours.hoursWorked,
      payRateId: workHours.payRateId,
      date: workHours.date
    }).from(workHours)
      .where(and(eq(workHours.practiceId, practiceId), eq(workHours.isApproved, true)));
    
    const withinRange = hoursRows.filter((h: { date: Date }) => h.date >= period.startDate && h.date <= period.endDate);

    // Group by user and calculate regular vs overtime hours
    const employeeHours = new Map<number, { 
      totalHours: number; 
      regularHours: number; 
      overtimeHours: number; 
      userId: number 
    }>();
    
    withinRange.forEach((h: any) => {
      const current = employeeHours.get(h.userId) || { 
        totalHours: 0, 
        regularHours: 0, 
        overtimeHours: 0, 
        userId: h.userId 
      };
      const hours = parseFloat(h.hoursWorked as unknown as string);
      current.totalHours += hours;
      employeeHours.set(h.userId, current);
    });

    // Calculate overtime (40+ hours = overtime)
    for (const [userId, data] of employeeHours) {
      if (data.totalHours > 40) {
        data.regularHours = 40;
        data.overtimeHours = data.totalHours - 40;
      } else {
        data.regularHours = data.totalHours;
        data.overtimeHours = 0;
      }
    }

    const created: any[] = [];
    
    // Process all employees with active pay rates
    for (const [userId, rateInfo] of employeeRatesMap) {
      const empData = employeeHours.get(userId) || { 
        totalHours: 0, 
        regularHours: 0, 
        overtimeHours: 0, 
        userId 
      };
      // Use the already fetched rate info
      const latest = rateInfo;
      if (!latest) continue;

      // Calculate gross pay based on actual pay period duration
      let grossPay = 0;
      const rate = parseFloat(latest.rate as unknown as string);
      
      // Calculate the actual duration of this pay period
      const periodStart = new Date(period.startDate);
      const periodEnd = new Date(period.endDate);
      const periodDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const periodWeeks = periodDays / 7;
      const periodMonths = periodDays / 30.44; // Average days per month
      
      console.log(`Payroll calculation for employee ${empData.userId}:`, {
        rateType: latest.rateType,
        rate,
        periodStart: periodStart.toISOString().split('T')[0],
        periodEnd: periodEnd.toISOString().split('T')[0],
        periodDays,
        periodWeeks,
        periodMonths
      });
      
      if (latest.rateType === 'hourly') {
        // For hourly employees, require approved hours OR allow manual override
        if (empData.totalHours > 0) {
          grossPay = (empData.regularHours * rate) + (empData.overtimeHours * rate * 1.5);
        } else {
          // Hourly employee with no tracked hours - calculate 0 pay or skip
          console.log(`Hourly employee ${empData.userId} (${latest.userName}) has no approved hours for this period`);
          grossPay = 0; // You might want to skip these employees instead
        }
      } else if (latest.rateType === 'daily') {
        // Calculate based on working days in the period (assuming 5 days per week)
        const workingDays = Math.floor(periodWeeks * 5);
        grossPay = rate * workingDays;
      } else if (latest.rateType === 'weekly') {
        // Calculate based on actual weeks in the period
        grossPay = rate * periodWeeks;
      } else if (latest.rateType === 'monthly') {
        // Calculate based on actual months in the period
        grossPay = rate * periodMonths;
      } else if (latest.rateType === 'yearly') {
        // Calculate based on actual days in the period
        grossPay = (rate / 365) * periodDays;
      } else {
        // Default fallback - treat as yearly
        grossPay = (rate / 365) * periodDays;
      }
      
      console.log(`Calculated gross pay: ${grossPay}`);

      // Calculate deductions
      const deductionsResult = await calculateDeductions(tenantDb, practiceId, empData.userId, grossPay, period.startDate);
      const totalDeductions = deductionsResult.total;
      const netPay = grossPay - totalDeductions;

      // Create payroll record
        // Determine practice default currency
        const practiceRec = await tenantDb.query.practices.findFirst({ where: (p: any, { eq }: any) => eq(p.id, practiceId) });
        const defaultCurrencyId = (practiceRec as any)?.defaultCurrencyId || undefined;

        // Resolve currency code for legacy `currency` text field
        let currencyText = 'USD';
        if (defaultCurrencyId) {
          const currencyRow = await tenantDb.query.currencies.findFirst({ where: (c: any, { eq }: any) => eq(c.id, defaultCurrencyId) }).catch(() => null);
          if (currencyRow && (currencyRow as any).code) currencyText = (currencyRow as any).code;
        }

        const [stub] = await tenantDb.insert(payroll).values({
        practiceId,
        employeeId: empData.userId,
        payPeriodId: period.id,
        periodStart: period.startDate,
        periodEnd: period.endDate,
        payDate: period.payDate,
        grossAmount: grossPay.toFixed(2),
        netAmount: netPay.toFixed(2),
    currency: currencyText,
          currencyId: defaultCurrencyId,
        deductions: JSON.stringify(deductionsResult.breakdown),
        taxes: JSON.stringify(deductionsResult.taxes),
        status: 'pending'
      }).returning();

      // Create individual deduction records
      for (const deduction of deductionsResult.deductions) {
        await tenantDb.insert(payrollDeductions).values({
          payrollId: stub.id,
          deductionTypeId: deduction.deductionTypeId,
          employeeDeductionId: deduction.employeeDeductionId,
          description: deduction.description,
          amount: deduction.amount.toFixed(2),
          isEmployerPaid: deduction.isEmployerPaid,
          calculationDetails: JSON.stringify(deduction.calculationDetails)
        });
      }

      created.push(stub);
    }

    return NextResponse.json({ generated: created.length });
  } catch (e) {
    console.error('Generate pay stubs error', e);
    return NextResponse.json({ error: 'Failed to generate pay stubs' }, { status: 500 });
  }
}

// Helper function to calculate deductions for an employee
async function calculateDeductions(
  tenantDb: any, 
  practiceId: number, 
  employeeId: number, 
  grossPay: number, 
  payDate: Date
) {
  const deductions: any[] = [];
  const taxes: any = {};
  let total = 0;

  // Get active employee deductions for the pay period
  const empDeductions = await tenantDb.select({
    id: employeeDeductions.id,
    deductionTypeId: employeeDeductions.deductionTypeId,
    amount: employeeDeductions.amount,
    percentage: employeeDeductions.percentage,
    maxAmount: employeeDeductions.maxAmount,
    deductionName: deductionTypes.name,
    deductionCode: deductionTypes.code,
    deductionCategory: deductionTypes.category,
    calculationType: deductionTypes.calculationType,
    isEmployerContribution: deductionTypes.isEmployerContribution
  })
  .from(employeeDeductions)
  .leftJoin(deductionTypes, eq(deductionTypes.id, employeeDeductions.deductionTypeId))
  .where(and(
    eq(employeeDeductions.practiceId, practiceId),
    eq(employeeDeductions.employeeId, employeeId),
    eq(employeeDeductions.isActive, true),
    eq(deductionTypes.isActive, true)
  ));

  // Calculate each deduction
  for (const empDed of empDeductions) {
    let deductionAmount = 0;
    const calculationDetails: any = {};

    if (empDed.calculationType === 'fixed') {
      deductionAmount = parseFloat(empDed.amount || '0');
      calculationDetails.type = 'fixed';
      calculationDetails.amount = deductionAmount;
    } else if (empDed.calculationType === 'percentage') {
      const percentage = parseFloat(empDed.percentage || '0');
      deductionAmount = grossPay * (percentage / 100);
      calculationDetails.type = 'percentage';
      calculationDetails.percentage = percentage;
      calculationDetails.grossPay = grossPay;
      
      // Apply max amount limit if set
      if (empDed.maxAmount) {
        const maxAmount = parseFloat(empDed.maxAmount);
        if (deductionAmount > maxAmount) {
          deductionAmount = maxAmount;
          calculationDetails.cappedAtMax = true;
          calculationDetails.maxAmount = maxAmount;
        }
      }
    }

    // Add standard tax deductions
    if (empDed.deductionCategory === 'tax') {
      if (empDed.deductionCode === 'FICA_SS') {
        // Social Security: 6.2% up to wage base
        deductionAmount = Math.min(grossPay * 0.062, 160200 * 0.062 / 26); // 2024 wage base
        taxes.socialSecurity = deductionAmount;
      } else if (empDed.deductionCode === 'FICA_MED') {
        // Medicare: 1.45%
        deductionAmount = grossPay * 0.0145;
        taxes.medicare = deductionAmount;
      } else if (empDed.deductionCode === 'FIT') {
        // Federal Income Tax (simplified - would need proper tax tables)
        deductionAmount = grossPay * 0.12; // Simplified 12% rate
        taxes.federalIncome = deductionAmount;
      }
    }

    if (deductionAmount > 0) {
      deductions.push({
        deductionTypeId: empDed.deductionTypeId,
        employeeDeductionId: empDed.id,
        description: empDed.deductionName,
        amount: deductionAmount,
        isEmployerPaid: empDed.isEmployerContribution,
        calculationDetails
      });
      
      if (!empDed.isEmployerContribution) {
        total += deductionAmount;
      }
    }
  }

  // Create breakdown summary
  const breakdown = {
    taxes: Object.keys(taxes).length > 0 ? taxes : null,
    benefits: deductions.filter(d => d.description?.toLowerCase().includes('health') || 
                                  d.description?.toLowerCase().includes('dental') ||
                                  d.description?.toLowerCase().includes('vision')),
    voluntary: deductions.filter(d => !d.description?.toLowerCase().includes('tax') &&
                                    !d.description?.toLowerCase().includes('health') &&
                                    !d.description?.toLowerCase().includes('dental') &&
                                    !d.description?.toLowerCase().includes('vision')),
    total
  };

  return {
    deductions,
    taxes,
    breakdown,
    total
  };
}
