import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { payroll, payrollDeductions } from '@/db/schemas/financeSchema';
import { and, eq } from 'drizzle-orm';

// Void a specific payslip
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
    const [existingPayroll] = await tenantDb.select()
      .from(payroll)
      .where(and(
        eq(payroll.id, payrollId),
        eq(payroll.practiceId, practiceId)
      ));

    if (!existingPayroll) {
      return NextResponse.json({ error: 'Payslip not found' }, { status: 404 });
    }

    if (existingPayroll.status === 'voided') {
      return NextResponse.json({ 
        error: 'Payslip is already voided' 
      }, { status: 400 });
    }

    if (existingPayroll.status === 'processed') {
      return NextResponse.json({ 
        error: 'Cannot void processed payslips. Contact administrator.' 
      }, { status: 400 });
    }

    // Get request body for void reason
    const body = await req.json();
    const { reason } = body;

    if (!reason || reason.trim().length < 5) {
      return NextResponse.json({ 
        error: 'Void reason is required (minimum 5 characters)' 
      }, { status: 400 });
    }

    // Update payroll record to voided status
    const [voidedPayroll] = await tenantDb.update(payroll)
      .set({
        status: 'voided',
        notes: reason.trim(),
        grossAmount: '0.00',
        netAmount: '0.00',
        deductions: JSON.stringify({ voided: true, reason }),
        taxes: JSON.stringify({ voided: true }),
        updatedAt: new Date()
      })
      .where(eq(payroll.id, payrollId))
      .returning();

    // Delete all deduction records for this payroll
    await tenantDb.delete(payrollDeductions)
      .where(eq(payrollDeductions.payrollId, payrollId));

    return NextResponse.json({
      success: true,
      payroll: voidedPayroll,
      message: `Payslip voided successfully. Reason: ${reason}`
    });

  } catch (error) {
    console.error('Void payslip error:', error);
    return NextResponse.json(
      { error: 'Failed to void payslip' },
      { status: 500 }
    );
  }
}

// Get void confirmation requirements
export async function GET(req: NextRequest, context: { params: Promise<{ practiceId: string; id: string }> | { practiceId: string; id: string } }) {
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

    const [payrollRecord] = await tenantDb.select({
      id: payroll.id,
      status: payroll.status,
      grossAmount: payroll.grossAmount,
      netAmount: payroll.netAmount,
      payDate: payroll.payDate
    })
    .from(payroll)
    .where(and(
      eq(payroll.id, payrollId),
      eq(payroll.practiceId, practiceId)
    ));

    if (!payrollRecord) {
      return NextResponse.json({ error: 'Payslip not found' }, { status: 404 });
    }

    const canVoid = payrollRecord.status === 'pending' || payrollRecord.status === 'generated';
    let message: string | undefined = undefined;
    if (!canVoid) {
      message = 'Cannot void this payslip';
      if (payrollRecord.status === 'processed') {
        message = 'Cannot void processed payslips. Contact system administrator.';
      } else if (payrollRecord.status === 'voided') {
        message = 'Payslip is already voided.';
      }
    }

    const requirements = {
      canVoid,
      currentStatus: payrollRecord.status,
      grossAmount: payrollRecord.grossAmount,
      netAmount: payrollRecord.netAmount,
      payDate: payrollRecord.payDate,
      voidRules: {
        requiresReason: true,
        minimumReasonLength: 5,
        allowedStatuses: ['pending', 'generated'],
        message
      }
    };

    return NextResponse.json(requirements);

  } catch (error) {
    console.error('Get void requirements error:', error);
    return NextResponse.json(
      { error: 'Failed to check void requirements' },
      { status: 500 }
    );
  }
}