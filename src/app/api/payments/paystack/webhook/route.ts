// src/app/api/payments/paystack/webhook/route.ts
// Webhook handler for Paystack payment notifications

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { invoices, payments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export const runtime = 'nodejs';

/**
 * POST /api/payments/paystack/webhook
 * 
 * Handles webhook notifications from Paystack
 * Updates invoice status and records payment
 */
export async function POST(req: NextRequest) {
  try {
    // Verify webhook signature
    const signature = req.headers.get('x-paystack-signature');
    const body = await req.text();
    
    // Get webhook secret from environment
    const secret = process.env.PAYSTACK_WEBHOOK_SECRET || process.env.APP_KEY;
    
    if (!secret) {
      console.error('[PAYSTACK WEBHOOK] No webhook secret configured');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    // Verify signature
    const hash = crypto
      .createHmac('sha512', secret)
      .update(body)
      .digest('hex');

    if (hash !== signature) {
      console.error('[PAYSTACK WEBHOOK] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse webhook data
    const event = JSON.parse(body);
    console.log('[PAYSTACK WEBHOOK] Event received:', event.event);

    // Handle charge.success event
    if (event.event === 'charge.success') {
      const data = event.data;
      
      console.log('[PAYSTACK WEBHOOK] Payment successful:', {
        reference: data.reference,
        amount: data.amount / 100,
        currency: data.currency,
        status: data.status,
      });

      // Extract metadata
      const metadata = data.metadata || {};
      const invoiceId = metadata.invoiceId;
      
      if (!invoiceId) {
        console.error('[PAYSTACK WEBHOOK] No invoiceId in metadata');
        return NextResponse.json({ error: 'Invoice ID not found' }, { status: 400 });
      }

      // Get tenant database
      const db = await getCurrentTenantDb();

      // Fetch invoice
      const invoice = await db.query.invoices.findFirst({
        where: (inv: any, { eq }: any) => eq(inv.id, parseInt(invoiceId)),
      });

      if (!invoice) {
        console.error('[PAYSTACK WEBHOOK] Invoice not found:', invoiceId);
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }

      // Update invoice status to paid
      await db
        .update(invoices)
        .set({
          status: 'paid',
          paidAt: new Date(data.paid_at),
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, parseInt(invoiceId)));

      console.log('[PAYSTACK WEBHOOK] Invoice marked as paid:', invoiceId);

      // Record payment
      const paymentNumber = `PAY-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
      
      await db.insert(payments).values({
        invoiceId: parseInt(invoiceId),
        amount: (data.amount / 100).toString(),
        paymentMethod: 'paystack',
        paymentDate: new Date(data.paid_at),
        paymentNumber,
        status: 'completed',
        transactionId: data.reference,
        notes: `Paystack payment - ${data.channel} - ${data.currency}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log('[PAYSTACK WEBHOOK] Payment recorded:', paymentNumber);

      return NextResponse.json({ 
        success: true,
        message: 'Payment processed successfully',
      });
    }

    // Handle other events
    console.log('[PAYSTACK WEBHOOK] Unhandled event type:', event.event);
    return NextResponse.json({ 
      success: true,
      message: 'Event received',
    });

  } catch (error) {
    console.error('[PAYSTACK WEBHOOK] Error:', error);
    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
