// src/app/api/payments/webhook/paystack/route.ts
// Paystack webhook handler for payment notifications

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { invoices, payments, practicePaymentProviders } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// Disable body parsing, we need the raw body
export const runtime = 'nodejs';

// Decrypt secret key (used for webhook verification)
async function decryptWebhookSecret(encryptedSecret: string): Promise<string> {
  const algorithm = 'aes-256-cbc';
  const encryptionKey = process.env.APP_KEY;
  if (!encryptionKey) {
    throw new Error('APP_KEY environment variable is required');
  }
  
  const parts = encryptedSecret.split(':');
  const iv = Buffer.from(parts.shift()!, 'hex');
  const encryptedText = Buffer.from(parts.join(':'), 'hex');
  const keyBuffer = Buffer.from(encryptionKey, 'hex');
  
  const decipher = crypto.createDecipheriv(algorithm, keyBuffer, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted.toString();
}

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('x-paystack-signature');
    
    if (!signature) {
      console.error('[PAYSTACK WEBHOOK] Missing signature');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // Get raw body
    const body = await req.text();
    const event = JSON.parse(body);

    console.log('[PAYSTACK WEBHOOK] Event received:', {
      event: event.event,
      data: event.data?.reference,
    });

    // Extract practice ID from metadata
    const practiceId = event.data?.metadata?.practiceId;
    if (!practiceId) {
      console.error('[PAYSTACK WEBHOOK] Missing practiceId in metadata');
      return NextResponse.json(
        { error: 'Missing practice ID' },
        { status: 400 }
      );
    }

    // Get tenant DB
    const tenantDb = await getCurrentTenantDb();

    // Get practice's Paystack configuration to verify signature using secret key
    const providerConfig = await tenantDb
      .select()
      .from(practicePaymentProviders)
      .where(
        and(
          eq(practicePaymentProviders.practiceId, parseInt(practiceId)),
          eq(practicePaymentProviders.providerCode, 'paystack')
        )
      )
      .limit(1);

    if (!providerConfig.length || !providerConfig[0].secretKey) {
      console.error('[PAYSTACK WEBHOOK] Paystack not configured for practice');
      return NextResponse.json(
        { error: 'Paystack not configured' },
        { status: 400 }
      );
    }

    // Decrypt and verify using the secret key (Paystack uses SK for webhook signatures)
    const secretKey = await decryptWebhookSecret(providerConfig[0].secretKey);
    const hash = crypto
      .createHmac('sha512', secretKey)
      .update(body)
      .digest('hex');

    if (hash !== signature) {
      console.error('[PAYSTACK WEBHOOK] Invalid signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    console.log('[PAYSTACK WEBHOOK] Signature verified');

    // Handle successful payment
    if (event.event === 'charge.success') {
      const reference = event.data.reference;
      const amount = event.data.amount / 100; // Paystack sends amount in kobo
      const invoiceId = event.data.metadata?.invoiceId;

      console.log('[PAYSTACK WEBHOOK] Processing successful payment:', {
        reference,
        amount,
        invoiceId,
      });

      if (!invoiceId) {
        console.error('[PAYSTACK WEBHOOK] Missing invoiceId in metadata');
        return NextResponse.json(
          { error: 'Missing invoice ID' },
          { status: 400 }
        );
      }

      // Check if payment already exists
      const existingPayment = await tenantDb
        .select()
        .from(payments)
        .where(eq(payments.transactionReference, reference))
        .limit(1);

      if (existingPayment.length > 0) {
        console.log('[PAYSTACK WEBHOOK] Payment already processed');
        return NextResponse.json({ message: 'Payment already processed' });
      }

      // Get invoice
      const invoice = await tenantDb
        .select()
        .from(invoices)
        .where(eq(invoices.id, parseInt(invoiceId)))
        .limit(1);

      if (!invoice.length) {
        console.error('[PAYSTACK WEBHOOK] Invoice not found');
        return NextResponse.json(
          { error: 'Invoice not found' },
          { status: 404 }
        );
      }

      // Create payment record
      await tenantDb.insert(payments).values({
        invoiceId: parseInt(invoiceId),
        practiceId: parseInt(practiceId),
        clientId: invoice[0].clientId,
        amount: amount.toString(),
        paymentMethod: 'paystack',
        paymentDate: new Date(),
        status: 'completed',
        transactionReference: reference,
        notes: `Paystack payment - ${event.data.channel}`,
      });

      // Update invoice status to paid
      await tenantDb
        .update(invoices)
        .set({
          status: 'paid',
          paidAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, parseInt(invoiceId)));

      console.log('[PAYSTACK WEBHOOK] Payment processed successfully');

      return NextResponse.json({
        success: true,
        message: 'Payment processed successfully',
      });
    }

    // Handle failed payment
    if (event.event === 'charge.failed') {
      console.log('[PAYSTACK WEBHOOK] Payment failed:', event.data.reference);
      // You can log this or notify the user
    }

    return NextResponse.json({ message: 'Webhook received' });
  } catch (error) {
    console.error('[PAYSTACK WEBHOOK] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
