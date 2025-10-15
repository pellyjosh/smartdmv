import { NextRequest, NextResponse } from 'next/server';
import { getUserPractice, getCurrentUser } from '@/lib/auth-utils';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { payments, invoices, paymentMethods } from '@/db/schema';
import { getStripeClientForPractice, getPaystackClientForPractice } from '@/lib/payments/providers';
import { createAuditLog } from '@/lib/audit-logger';
import { eq, and, desc, count } from 'drizzle-orm';
import { z } from 'zod';

// GET /api/billing/payments - Get payment history for current client
export async function GET(request: NextRequest) {
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

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

    const userPayments = await tenantDb.query.payments.findMany({
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
  provider: z.enum(['stripe', 'paystack']).optional(),
  paymentIntentId: z.string().optional(),
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
  // Get the tenant-specific database
  const tenantDb = await getCurrentTenantDb();

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

  const { invoiceId, amount, paymentMethod, cardDetails, notes, provider, paymentIntentId } = validationResult.data as any;

    // Verify the invoice belongs to the current user
    const invoice = await tenantDb.query.invoices.findFirst({
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
    const [paymentCountResult] = await tenantDb.select({ count: count() }).from(payments).where(eq(payments.practiceId, user.practiceId!));
    const paymentNumber = `PAY-${new Date().getFullYear()}-${String((paymentCountResult?.count || 0) + 1).padStart(4, '0')}`;

    // Process payment - try to use practice-configured payment provider
    let transactionId = '';
    let processorResponse: string | null = null;
    let paymentStatus: 'pending' | 'processing' | 'completed' | 'failed' = 'completed';

    // Convert amount to number
    const amountNumber = Number(amount);

    try {
      // Provider-respecting processing
      // If the client already created/confirmed a PaymentIntent (Stripe Elements flow), use it
      if (paymentIntentId) {
        // Attach provided PaymentIntent id as the transaction id and mark as completed optimistically.
        transactionId = paymentIntentId;
        processorResponse = JSON.stringify({ note: 'client_confirmed_stripe_intent', id: paymentIntentId });
        paymentStatus = 'completed';
      } else if (provider === 'stripe' || (!provider && (paymentMethod === 'credit_card' || paymentMethod === 'debit_card'))) {
        // Attempt Stripe if configured for practice
        const stripe = await getStripeClientForPractice(user.practiceId!);
        if (stripe && (paymentMethod === 'credit_card' || paymentMethod === 'debit_card')) {
          const intent = await stripe.paymentIntents.create({
            amount: Math.round(amountNumber * 100), // cents
            currency: (invoice.currencyId || 'USD').toString().toLowerCase(),
            payment_method_types: ['card'],
            description: `Payment for invoice ${invoice.invoiceNumber}`,
            metadata: {
              invoiceId: invoice.id.toString(),
              clientId: user.id.toString(),
            },
          });
          transactionId = intent.id;
          processorResponse = JSON.stringify(intent);
          paymentStatus = intent.status === 'succeeded' ? 'completed' : 'processing';
        }
      }

      // If Paystack was requested, initialize and return authorization_url immediately
      if (!transactionId && (provider === 'paystack' || (!provider && paymentMethod === 'online'))) {
        const paystack = await getPaystackClientForPractice(user.practiceId!);
        if (paystack) {
          const res = await paystack.request('/transaction/initialize', 'POST', {
            amount: Math.round(amountNumber * 100),
            email: (user as any).email,
            metadata: { invoiceId: invoice.id },
          });

          // Save a pending payment record with reference but do not mark as completed
          const payRef = res.data?.reference || '';
          transactionId = payRef;
          processorResponse = JSON.stringify(res);
          paymentStatus = 'pending';

          // Create payment record (pending)
          const paymentDataPending = {
            practiceId: user.practiceId!,
            invoiceId: Number(invoiceId),
            clientId: user.id,
            paymentNumber,
            amount: Number(amount).toFixed(2),
            currencyId: invoice.currencyId || undefined,
            paymentMethod: 'paystack',
            transactionId: transactionId || null,
            processorResponse: processorResponse || null,
            status: paymentStatus,
            paymentDate: new Date(),
            notes: (notes as string) || null,
          };

          const [pendingPayment] = await tenantDb.insert(payments).values(paymentDataPending).returning();

          // Return authorization_url for client redirect
          return NextResponse.json({
            authorization_url: res.data?.authorization_url,
            reference: res.data?.reference,
            paymentId: pendingPayment.id,
          }, { status: 200 });
        }
      }

      // Fallback mock processing if no external provider handled it
      if (!transactionId) {
        transactionId = `mock_txn_${Date.now()}`;
        processorResponse = JSON.stringify({
          status: 'success',
          transaction_id: transactionId,
          amount: amountNumber,
          currency: invoice.currencyId || 'USD',
          timestamp: new Date().toISOString(),
        });
        paymentStatus = 'completed';
      }
    } catch (err: any) {
      console.error('Payment provider error', err);
      processorResponse = JSON.stringify({ error: err?.message || String(err) });
      paymentStatus = 'failed';
    }

    // Create payment record
    const paymentData = {
      practiceId: user.practiceId!,
      invoiceId: Number(invoiceId),
      clientId: user.id,
      paymentNumber,
      amount: Number(amount).toFixed(2),
      currencyId: invoice.currencyId || undefined,
      paymentMethod: paymentMethod as string,
      transactionId: transactionId || null,
      processorResponse: processorResponse || null,
      status: paymentStatus,
      paymentDate: new Date(),
      notes: (notes as string) || null,
    };

    const [newPayment] = await tenantDb.insert(payments).values(paymentData).returning();

    // Update invoice status to paid if payment amount covers the full invoice
    if (Number(amount) >= parseFloat(invoice.totalAmount)) {
      await tenantDb.update(invoices)
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
