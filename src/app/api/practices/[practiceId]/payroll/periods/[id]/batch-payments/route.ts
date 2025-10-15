import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { 
  payroll,
  payPeriods,
  payrollPayments,
  payrollTransactions
} from '@/db/schemas/financeSchema';
import { users } from '@/db/schemas/usersSchema';
import { eq, and, inArray } from 'drizzle-orm';

// Batch process payments for all pending payroll records in a pay period
export async function POST(req: NextRequest, context: { params: Promise<{ practiceId: string; id: string }> | { practiceId: string; id: string } }) {
  try {
    const resolvedParams = await context.params as { practiceId: string; id: string };
    const userPractice = await getUserPractice(req);
    if (!userPractice) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const practiceId = Number(resolvedParams.practiceId);
    if (practiceId !== parseInt(userPractice.practiceId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    const periodId = Number(resolvedParams.id);
    const body = await req.json();
    const { paymentMethod, bankAccountId, selectedEmployees, notes } = body;

    if (!paymentMethod) {
      return NextResponse.json({ error: 'Payment method is required' }, { status: 400 });
    }

    const tenantDb = await getCurrentTenantDb();

    // Verify pay period exists
    const [period] = await tenantDb.select()
      .from(payPeriods)
      .where(and(
        eq(payPeriods.id, periodId),
        eq(payPeriods.practiceId, practiceId)
      ));

    if (!period) {
      return NextResponse.json({ error: 'Pay period not found' }, { status: 404 });
    }

    // Get pending payroll records for the period
    let payrollQuery = tenantDb.select({
      id: payroll.id,
      employeeId: payroll.employeeId,
      netAmount: payroll.netAmount,
      status: payroll.status,
      employeeName: users.name,
      employeeEmail: users.email
    })
    .from(payroll)
    .leftJoin(users, eq(users.id, payroll.employeeId))
    .where(and(
      eq(payroll.payPeriodId, periodId),
      eq(payroll.practiceId, practiceId),
      eq(payroll.status, 'pending')
    ));

    // Filter by selected employees if provided
    if (selectedEmployees && selectedEmployees.length > 0) {
      payrollQuery = payrollQuery.where(inArray(payroll.employeeId, selectedEmployees));
    }

    const payrollRecords = await payrollQuery;

    if (payrollRecords.length === 0) {
      return NextResponse.json({ 
        error: 'No pending payroll records found for the specified criteria' 
      }, { status: 400 });
    }

    const processedPayments = [];
    const batchRef = `BATCH-${practiceId}-${periodId}-${Date.now()}`;
    let successCount = 0;
    let failureCount = 0;

    // Process each payroll record
    for (const record of payrollRecords) {
      try {
        const paymentRef = `${batchRef}-${record.id}`;
        
        // Mock payment processing
        let transactionId = '';
        let processorResponse = '';
        let paymentStatus: 'pending' | 'processing' | 'completed' | 'failed' = 'processing';

        switch (paymentMethod) {
          case 'direct_deposit':
            transactionId = `ach_${Date.now()}_${record.id}`;
            processorResponse = JSON.stringify({
              ach_transaction_id: transactionId,
              employee_id: record.employeeId,
              amount: record.netAmount,
              status: 'pending_settlement',
              batch_id: batchRef
            });
            paymentStatus = 'processing';
            break;

          case 'check':
            transactionId = `CHK${String(Date.now()).slice(-6)}${record.id}`;
            processorResponse = JSON.stringify({
              check_number: transactionId,
              employee_id: record.employeeId,
              amount: record.netAmount,
              status: 'printed',
              batch_id: batchRef
            });
            paymentStatus = 'completed';
            break;

          case 'payroll_card':
            transactionId = `PC_${Date.now()}_${record.id}`;
            processorResponse = JSON.stringify({
              card_deposit_id: transactionId,
              employee_id: record.employeeId,
              amount: record.netAmount,
              status: 'deposited',
              batch_id: batchRef
            });
            paymentStatus = 'completed';
            break;

          default:
            throw new Error(`Unsupported batch payment method: ${paymentMethod}`);
        }

        // Create payment record
        const [payment] = await tenantDb.insert(payrollPayments).values({
          practiceId,
          payrollId: record.id,
          employeeId: record.employeeId,
          amount: record.netAmount,
          paymentMethod,
          paymentReference: paymentRef,
          transactionId,
          processorResponse,
          status: paymentStatus,
          bankAccountId: bankAccountId || null,
          notes: notes || `Batch payment - ${batchRef}`,
          processedBy: Number(userPractice.userId),
          paymentDate: new Date()
        }).returning();

        // Create transaction record
        await tenantDb.insert(payrollTransactions).values({
          practiceId,
          payrollId: record.id,
          paymentId: payment.id,
          transactionType: 'batch_payment',
          amount: record.netAmount,
          description: `Batch payroll payment to ${record.employeeName} via ${paymentMethod}`,
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
          .where(eq(payroll.id, record.id));

        processedPayments.push({
          payrollId: record.id,
          employeeName: record.employeeName,
          amount: record.netAmount,
          paymentId: payment.id,
          status: paymentStatus
        });

        successCount++;

      } catch (error) {
        console.error(`Failed to process payment for payroll ${record.id}:`, error);
        failureCount++;
      }
    }

    // Update pay period status if all payments are completed
    const allCompleted = processedPayments.every(p => p.status === 'completed');
    if (allCompleted && failureCount === 0) {
      await tenantDb.update(payPeriods)
        .set({ 
          status: 'paid',
          updatedAt: new Date()
        })
        .where(eq(payPeriods.id, periodId));
    }

    return NextResponse.json({
      success: true,
      batchReference: batchRef,
      totalProcessed: successCount,
      totalFailed: failureCount,
      payments: processedPayments,
      message: `Batch payment ${successCount > 0 ? 'completed' : 'failed'}. Processed: ${successCount}, Failed: ${failureCount}`
    });

  } catch (error) {
    console.error('Batch process payments error:', error);
    return NextResponse.json(
      { error: 'Failed to process batch payments' },
      { status: 500 }
    );
  }
}