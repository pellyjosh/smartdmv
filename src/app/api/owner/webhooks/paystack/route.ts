// src/app/api/owner/webhooks/paystack/route.ts
// Paystack webhook handler for OWNER marketplace payments
// This is separate from tenant payment webhooks

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { ownerDb } from '@/owner/db/config';
import { tenantBillingTransactions, ownerPaymentConfigurations } from '@/owner/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentTenantDb } from '@/lib/tenant-db-resolver';
import { practiceAddons } from '@/db/schema';

export const runtime = 'nodejs';

// Decrypt webhook secret
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
      console.error('[OWNER PAYSTACK WEBHOOK] Missing signature');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // Get raw body
    const body = await req.text();
    const event = JSON.parse(body);

    console.log('[OWNER PAYSTACK WEBHOOK] Event received:', {
      event: event.event,
      reference: event.data?.reference,
      metadata: event.data?.metadata,
    });

    // Extract transaction ID from metadata
    const transactionId = event.data?.metadata?.transactionId;
    if (!transactionId) {
      console.error('[OWNER PAYSTACK WEBHOOK] Missing transactionId in metadata');
      return NextResponse.json(
        { error: 'Missing transaction ID' },
        { status: 400 }
      );
    }

    // Get billing transaction from owner DB
    const [transaction] = await ownerDb
      .select()
      .from(tenantBillingTransactions)
      .where(eq(tenantBillingTransactions.id, parseInt(transactionId)))
      .limit(1);

    if (!transaction) {
      console.error('[OWNER PAYSTACK WEBHOOK] Transaction not found:', transactionId);
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Get payment configuration to verify webhook signature
    const [paymentConfig] = await ownerDb
      .select()
      .from(ownerPaymentConfigurations)
      .where(eq(ownerPaymentConfigurations.id, transaction.paymentConfigId))
      .limit(1);

    if (!paymentConfig?.secretKey) {
      console.error('[OWNER PAYSTACK WEBHOOK] Payment config not found');
      return NextResponse.json(
        { error: 'Payment configuration not found' },
        { status: 400 }
      );
    }

    // Decrypt and verify signature using secret key
    const secretKey = await decryptWebhookSecret(paymentConfig.secretKey);
    const hash = crypto
      .createHmac('sha512', secretKey)
      .update(body)
      .digest('hex');

    if (hash !== signature) {
      console.error('[OWNER PAYSTACK WEBHOOK] Invalid signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    console.log('[OWNER PAYSTACK WEBHOOK] Signature verified');

    // Handle successful payment
    if (event.event === 'charge.success') {
      const reference = event.data.reference;
      const amount = event.data.amount / 100; // Paystack sends amount in kobo
      const currency = event.data.currency;

      console.log('[OWNER PAYSTACK WEBHOOK] Processing successful payment:', {
        reference,
        amount,
        currency,
        transactionId,
      });

      // Check if already processed
      if (transaction.status === 'succeeded') {
        console.log('[OWNER PAYSTACK WEBHOOK] Payment already processed');
        return NextResponse.json({ message: 'Payment already processed' });
      }

      // Update billing transaction
      await ownerDb
        .update(tenantBillingTransactions)
        .set({
          status: 'succeeded',
          providerResponse: event.data as any,
          paymentMethod: event.data.channel || 'card',
          paymentMethodDetails: {
            brand: event.data.authorization?.card_type,
            last4: event.data.authorization?.last4,
            expiryMonth: event.data.authorization?.exp_month,
            expiryYear: event.data.authorization?.exp_year,
            bankName: event.data.authorization?.bank,
          },
          updatedAt: new Date(),
        })
        .where(eq(tenantBillingTransactions.id, transaction.id));

      console.log('[OWNER PAYSTACK WEBHOOK] Transaction updated to succeeded');

      // Activate addon subscription in tenant DB
      if (transaction.addonId && transaction.subscriptionId) {
        try {
          const tenantDb = await getCurrentTenantDb();
          
          await tenantDb
            .update(practiceAddons)
            .set({
              paymentStatus: 'ACTIVE',
              isActive: true,
              lastActivatedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(practiceAddons.id, transaction.subscriptionId));

          console.log('[OWNER PAYSTACK WEBHOOK] Addon subscription activated:', transaction.subscriptionId);
        } catch (tenantError) {
          console.error('[OWNER PAYSTACK WEBHOOK] Error activating subscription:', tenantError);
          // Don't fail webhook, payment is processed
        }
      }

      // TODO: Send confirmation email to practice admin
      // TODO: Trigger any post-purchase automation

      return NextResponse.json({
        success: true,
        message: 'Payment processed successfully',
      });
    }

    // Handle failed payment
    if (event.event === 'charge.failed') {
      console.log('[OWNER PAYSTACK WEBHOOK] Payment failed:', event.data.reference);
      
      await ownerDb
        .update(tenantBillingTransactions)
        .set({
          status: 'failed',
          failureCode: event.data.gateway_response || 'CHARGE_FAILED',
          failureMessage: event.data.message || 'Payment failed',
          providerResponse: event.data as any,
          updatedAt: new Date(),
        })
        .where(eq(tenantBillingTransactions.id, transaction.id));

      return NextResponse.json({
        success: true,
        message: 'Failed payment recorded',
      });
    }

    return NextResponse.json({ message: 'Webhook received' });
  } catch (error) {
    console.error('[OWNER PAYSTACK WEBHOOK] Error processing webhook:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
