import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { 
  payroll, 
  workHours, 
  payRates, 
  employeeDeductions, 
  deductionTypes,
  payrollDeductions 
} from '@/db/schemas/financeSchema';
import { users } from '@/db/schemas/usersSchema';
import { and, eq } from 'drizzle-orm';

// Regenerate a specific payslip with updated calculations
export async function POST(req: NextRequest, context: { params: Promise<{ practiceId: string; id: string }> | { practiceId: string; id: string } }) {
  try {
    const resolvedParams = await context.params as { practiceId: string; id: string };
    const userPractice = await getUserPractice(req);
    if (!userPractice) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const practiceId = Number(resolvedParams.practiceId);
    if (practiceId !== parseInt(userPractice.practiceId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    const payrollId = Number(resolvedParams.id);
    const tenantDb = await getCurrentTenantDb();

    // Get existing payroll record
    const [existingPayroll] = await tenantDb.select({
      id: payroll.id,
      employeeId: payroll.employeeId,
      payPeriodId: payroll.payPeriodId,
      periodStart: payroll.periodStart,
      periodEnd: payroll.periodEnd,
      payDate: payroll.payDate,
      status: payroll.status
    })
    .from(payroll)
    .where(and(
      eq(payroll.id, payrollId),
      eq(payroll.practiceId, practiceId)
    ));

    if (!existingPayroll) {
      return NextResponse.json({ error: 'Payslip not found' }, { status: 404 });
    }

    if (existingPayroll.status !== 'pending') {
      return NextResponse.json({ 
        error: 'Can only regenerate pending payslips' 
      }, { status: 400 });
    }

    // Delete existing deduction records
    await tenantDb.delete(payrollDeductions)
      .where(eq(payrollDeductions.payrollId, payrollId));

    // Recalculate the payslip using the same logic as generation
    const grossPay = await calculateGrossPayForEmployee(
      tenantDb, 
      practiceId, 
      existingPayroll.employeeId, 
      existingPayroll.periodStart, 
      existingPayroll.periodEnd
    );

    const deductionsResult = await calculateDeductions(
      tenantDb, 
      practiceId, 
      existingPayroll.employeeId, 
      grossPay, 
      existingPayroll.periodStart
    );

    const netPay = grossPay - deductionsResult.total;

    // Update payroll record
    const [updatedPayroll] = await tenantDb.update(payroll)
      .set({
        grossAmount: grossPay.toFixed(2),
        netAmount: netPay.toFixed(2),
        deductions: JSON.stringify(deductionsResult.breakdown),
        taxes: JSON.stringify(deductionsResult.taxes),
        updatedAt: new Date()
      })
      .where(eq(payroll.id, payrollId))
      .returning();

    // Recreate deduction records
    for (const deduction of deductionsResult.deductions) {
      await tenantDb.insert(payrollDeductions).values({
        payrollId: payrollId,
        deductionTypeId: deduction.deductionTypeId,
        employeeDeductionId: deduction.employeeDeductionId,
        description: deduction.description,
        amount: deduction.amount.toFixed(2),
        isEmployerPaid: deduction.isEmployerPaid,
        calculationDetails: JSON.stringify(deduction.calculationDetails)
      });
    }

    return NextResponse.json({
      success: true,
      payroll: updatedPayroll,
      message: 'Payslip regenerated successfully'
    });

  } catch (error) {
    console.error('Regenerate payslip error:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate payslip' },
      { status: 500 }
    );
  }
}

// Helper function to calculate gross pay for an employee
async function calculateGrossPayForEmployee(
  tenantDb: any,
  practiceId: number,
  employeeId: number,
  periodStart: Date,
  periodEnd: Date
) {
  // Get approved hours within the period
  const hoursRows = await tenantDb.select({
    hoursWorked: workHours.hoursWorked,
    payRateId: workHours.payRateId,
    date: workHours.date
  })
  .from(workHours)
  .where(and(
    eq(workHours.practiceId, practiceId),
    eq(workHours.userId, employeeId),
    eq(workHours.isApproved, true)
  ));

  const withinRange = hoursRows.filter((h: any) => {
    const workDate = new Date(h.date);
    return workDate >= periodStart && workDate <= periodEnd;
  });

  // Calculate total hours
  const totalHours = withinRange.reduce((sum: number, h: any) => {
    return sum + parseFloat(h.hoursWorked as unknown as string);
  }, 0);

  // Get latest pay rate for the employee
  const rateRows = await tenantDb.select()
    .from(payRates)
    .where(and(
      eq(payRates.userId, employeeId),
      eq(payRates.practiceId, practiceId)
    ))
    .orderBy(payRates.effectiveDate);

  const latest = [...rateRows].reverse().find((r: any) => 
    r.effectiveDate <= periodEnd
  );

  if (!latest) {
    throw new Error(`No pay rate found for employee ${employeeId}`);
  }

  let grossPay = 0;
  const rate = parseFloat(latest.rate as unknown as string);

  // Calculate based on rate type
  if (latest.rateType === 'hourly') {
    // Handle case where no hours are tracked but employee should still get paid
    if (totalHours === 0) {
      // For hourly employees with no tracked hours, assume 0 pay
      grossPay = 0;
    } else {
      const regularHours = Math.min(totalHours, 40);
      const overtimeHours = Math.max(totalHours - 40, 0);
      grossPay = (regularHours * rate) + (overtimeHours * rate * 1.5);
    }
  } else {
    // For salary employees, calculate based on period length
    const periodDays = Math.ceil(
      (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    if (latest.rateType === 'daily') {
      const workingDays = Math.floor((periodDays / 7) * 5); // Assume 5 day work week
      grossPay = rate * workingDays;
    } else if (latest.rateType === 'weekly') {
      grossPay = rate * (periodDays / 7);
    } else if (latest.rateType === 'monthly') {
      grossPay = rate * (periodDays / 30.44);
    } else if (latest.rateType === 'yearly') {
      grossPay = (rate / 365) * periodDays;
    } else {
      grossPay = (rate / 365) * periodDays; // Default to yearly
    }
  }

  return Math.max(grossPay, 0); // Ensure non-negative
}

// Helper function to calculate deductions (reuse from generate-stubs)
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

  // Get active employee deductions
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
      
      if (empDed.maxAmount) {
        const maxAmount = parseFloat(empDed.maxAmount);
        if (deductionAmount > maxAmount) {
          deductionAmount = maxAmount;
          calculationDetails.cappedAtMax = true;
          calculationDetails.maxAmount = maxAmount;
        }
      }
    }

    // Standard tax calculations
    if (empDed.deductionCategory === 'tax') {
      if (empDed.deductionCode === 'FICA_SS') {
        deductionAmount = Math.min(grossPay * 0.062, 160200 * 0.062 / 26);
        taxes.socialSecurity = deductionAmount;
      } else if (empDed.deductionCode === 'FICA_MED') {
        deductionAmount = grossPay * 0.0145;
        taxes.medicare = deductionAmount;
      } else if (empDed.deductionCode === 'FIT') {
        deductionAmount = grossPay * 0.12; // Simplified
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