import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { payments, invoices, paymentMethods } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth-utils';
import { createAuditLog } from '@/lib/audit-logger';
import { eq, and, desc, count } from 'drizzle-orm';
import { z } from 'zod';

// GET /api/billing/payments - Get payment history for current client
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only clients can view their own payment history
    if (user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Access denied. Client access required.' }, { status: 403 });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status');

    let whereConditions = [eq(payments.clientId, user.id)];
    
    if (status) {
      whereConditions.push(eq(payments.status, status as any));
    }

    const userPayments = await db.query.payments.findMany({
      where: and(...whereConditions),
      with: {
        invoice: {
          columns: {
            invoiceNumber: true,
            description: true,
          }
        }
      },
      orderBy: [desc(payments.paymentDate)],
    });

    return NextResponse.json(userPayments);

  } catch (error) {
    console.error('[API] Error fetching payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}

// POST /api/billing/payments - Process payment
const createPaymentSchema = z.object({
  invoiceId: z.number(),
  amount: z.number(),
  paymentMethod: z.enum(['cash', 'credit_card', 'debit_card', 'check', 'bank_transfer', 'online', 'other']),
  paymentMethodId: z.number().optional(), // For saved payment methods
  cardDetails: z.object({
    cardNumber: z.string(),
    expiryDate: z.string(),
    cvv: z.string(),
    nameOnCard: z.string(),
  }).optional(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only clients can make payments
    if (user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Access denied. Client access required.' }, { status: 403 });
    }

    const data = await request.json();
    const validationResult = createPaymentSchema.safeParse(data);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { invoiceId, amount, paymentMethod, cardDetails, notes } = validationResult.data;

    // Verify the invoice belongs to the current user
    const invoice = await db.query.invoices.findFirst({
      where: and(
        eq(invoices.id, Number(invoiceId)),
        eq(invoices.clientId, user.id)
      ),
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found or access denied' },
        { status: 404 }
      );
    }

    // Verify invoice is not already paid
    if (invoice.status === 'paid') {
      return NextResponse.json(
        { error: 'Invoice is already paid' },
        { status: 400 }
      );
    }

    // Generate payment number
    const [paymentCountResult] = await db.select({ count: count() }).from(payments).where(eq(payments.practiceId, user.practiceId!));
    const paymentNumber = `PAY-${new Date().getFullYear()}-${String((paymentCountResult?.count || 0) + 1).padStart(4, '0')}`;

    // Process payment (in a real app, this would integrate with Stripe, PayPal, etc.)
    let transactionId = '';
    let processorResponse = '';
    let paymentStatus: 'pending' | 'processing' | 'completed' | 'failed' = 'completed';

    // Mock payment processing
    if (paymentMethod === 'credit_card' || paymentMethod === 'debit_card') {
      // In real implementation, you would call your payment processor here
      transactionId = `mock_txn_${Date.now()}`;
      processorResponse = JSON.stringify({
        status: 'success',
        transaction_id: transactionId,
        amount: amount,
        currency: 'USD',
        timestamp: new Date().toISOString(),
      });
    }

    // Create payment record
    const paymentData = {
      practiceId: user.practiceId!,
      invoiceId: Number(invoiceId),
      clientId: user.id,
      paymentNumber,
      amount: Number(amount).toFixed(2),
      paymentMethod: paymentMethod as string,
      transactionId: transactionId || null,
      processorResponse: processorResponse || null,
      status: paymentStatus,
      paymentDate: new Date(),
      notes: (notes as string) || null,
    };

    const [newPayment] = await db.insert(payments).values(paymentData).returning();

    // Update invoice status to paid if payment amount covers the full invoice
    if (Number(amount) >= parseFloat(invoice.totalAmount)) {
      await db.update(invoices)
        .set({ 
          status: 'paid', 
          paidDate: new Date() 
        })
        .where(eq(invoices.id, Number(invoiceId)));
    }

    // Create audit log
    await createAuditLog({
      userId: user.id.toString(),
      practiceId: user.practiceId!.toString(),
      action: 'CREATE',
      recordType: 'BILLING',
      recordId: newPayment.id.toString(),
      description: `Processed payment ${paymentNumber} for invoice ${invoice.invoiceNumber}`,
      metadata: {
        amount,
        paymentMethod,
        invoiceId,
      }
    });

    return NextResponse.json({
      ...newPayment,
      message: 'Payment processed successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('[API] Error processing payment:', error);
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    );
  }
}
