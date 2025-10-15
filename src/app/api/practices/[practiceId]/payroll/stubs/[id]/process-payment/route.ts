import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { 
  payroll,
  payrollPayments,
  bankAccounts,
  payrollTransactions
} from '@/db/schemas/financeSchema';
import { users } from '@/db/schemas/usersSchema';
import { eq, and } from 'drizzle-orm';

// Process payment for a specific payroll stub
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
    const body = await req.json();
    const { paymentMethod, bankAccountId, notes } = body;

    if (!paymentMethod) {
      return NextResponse.json({ error: 'Payment method is required' }, { status: 400 });
    }

    const tenantDb = await getCurrentTenantDb();

    // Get payroll record
    const [payrollRecord] = await tenantDb.select({
      id: payroll.id,
      employeeId: payroll.employeeId,
      netAmount: payroll.netAmount,
      status: payroll.status,
      payDate: payroll.payDate,
      employeeName: users.name,
      employeeEmail: users.email
    })
    .from(payroll)
    .leftJoin(users, eq(users.id, payroll.employeeId))
    .where(and(
      eq(payroll.id, payrollId),
      eq(payroll.practiceId, practiceId)
    ));

    if (!payrollRecord) {
      return NextResponse.json({ error: 'Payroll record not found' }, { status: 404 });
    }

    if (payrollRecord.status === 'paid') {
      return NextResponse.json({ error: 'Payroll already paid' }, { status: 400 });
    }

    // Generate payment reference
    const paymentRef = `PAY-${practiceId}-${payrollId}-${Date.now()}`;
    
    // Mock payment processing based on method
    let transactionId = '';
    let processorResponse = '';
    let paymentStatus: 'pending' | 'processing' | 'completed' | 'failed' = 'processing';

    switch (paymentMethod) {
      case 'direct_deposit':
        // In real implementation, integrate with ACH/bank transfer service
        transactionId = `ach_${Date.now()}`;
        processorResponse = JSON.stringify({
          ach_transaction_id: transactionId,
          routing_number: '***1234',
          account_number: '***5678',
          amount: payrollRecord.netAmount,
          status: 'pending_settlement'
        });
        paymentStatus = 'processing';
        break;

      case 'check':
        // Generate check number
        transactionId = `CHK${String(Date.now()).slice(-6)}`;
        processorResponse = JSON.stringify({
          check_number: transactionId,
          amount: payrollRecord.netAmount,
          status: 'printed'
        });
        paymentStatus = 'completed';
        break;

      case 'cash':
        transactionId = `CASH_${Date.now()}`;
        processorResponse = JSON.stringify({
          payment_type: 'cash',
          amount: payrollRecord.netAmount,
          status: 'completed'
        });
        paymentStatus = 'completed';
        break;

      case 'payroll_card':
        // Mock payroll card deposit
        transactionId = `PC_${Date.now()}`;
        processorResponse = JSON.stringify({
          card_number: '***1234',
          amount: payrollRecord.netAmount,
          status: 'deposited'
        });
        paymentStatus = 'completed';
        break;

      default:
        return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
    }

    // Create payment record
    const [payment] = await tenantDb.insert(payrollPayments).values({
      practiceId,
      payrollId,
      employeeId: payrollRecord.employeeId,
      amount: payrollRecord.netAmount,
      paymentMethod,
      paymentReference: paymentRef,
      transactionId,
      processorResponse,
      status: paymentStatus,
      bankAccountId: bankAccountId || null,
      notes: notes || null,
      processedBy: Number(userPractice.userId),
      paymentDate: new Date()
    }).returning();

    // Create transaction record for audit trail
    await tenantDb.insert(payrollTransactions).values({
      practiceId,
      payrollId,
      paymentId: payment.id,
      transactionType: 'payment',
      amount: payrollRecord.netAmount,
      description: `Payroll payment to ${payrollRecord.employeeName} via ${paymentMethod}`,
      reference: paymentRef,
      processedBy: Number(userPractice.userId),
      transactionDate: new Date()
    });

    // Update payroll status
    await tenantDb.update(payroll)
      .set({ 
        status: paymentStatus === 'completed' ? 'paid' : 'processing',
        updatedAt: new Date()
      })
      .where(eq(payroll.id, payrollId));

    return NextResponse.json({
      success: true,
      payment,
      message: `Payment ${paymentStatus === 'completed' ? 'completed' : 'initiated'} successfully`
    });

  } catch (error) {
    console.error('Process payroll payment error:', error);
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    );
  }
}

// Get payment details for a payroll record
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

    // Get payment details
    const payments = await tenantDb.select({
      id: payrollPayments.id,
      amount: payrollPayments.amount,
      paymentMethod: payrollPayments.paymentMethod,
      paymentReference: payrollPayments.paymentReference,
      transactionId: payrollPayments.transactionId,
      status: payrollPayments.status,
      paymentDate: payrollPayments.paymentDate,
      notes: payrollPayments.notes,
      processorResponse: payrollPayments.processorResponse
    })
    .from(payrollPayments)
    .where(and(
      eq(payrollPayments.payrollId, payrollId),
      eq(payrollPayments.practiceId, practiceId)
    ));

    return NextResponse.json(payments);

  } catch (error) {
    console.error('Get payroll payment details error:', error);
    return NextResponse.json(
      { error: 'Failed to get payment details' },
      { status: 500 }
    );
  }
}