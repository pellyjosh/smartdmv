// src/app/api/owner/webhooks/stripe/route.ts
// Stripe webhook handler for OWNER marketplace payments
// This is separate from tenant payment webhooks

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { ownerDb } from '@/owner/db/config';
import { tenantBillingTransactions, ownerPaymentConfigurations } from '@/owner/db/schema';
import { eq } from 'drizzle-orm';
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

// Verify Stripe webhook signature
function verifyStripeSignature(
  body: string,
  signature: string,
  webhookSecret: string
): boolean {
  try {
    const elements = signature.split(',');
    const timestamp = elements.find(e => e.startsWith('t='))?.split('=')[1];
    const signatures = elements.filter(e => e.startsWith('v1='));

    if (!timestamp || signatures.length === 0) {
      return false;
    }

    // Construct signed payload
    const signedPayload = `${timestamp}.${body}`;
    
    // Compute expected signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(signedPayload)
      .digest('hex');

    // Compare signatures (constant-time comparison)
    const receivedSignatures = signatures.map(s => s.split('=')[1]);
    return receivedSignatures.some(sig => 
      crypto.timingSafeEqual(
        Buffer.from(sig),
        Buffer.from(expectedSignature)
      )
    );
  } catch (error) {
    console.error('[STRIPE WEBHOOK] Signature verification error:', error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('stripe-signature');
    
    if (!signature) {
      console.error('[OWNER STRIPE WEBHOOK] Missing signature');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // Get raw body
    const body = await req.text();
    const event = JSON.parse(body);

    console.log('[OWNER STRIPE WEBHOOK] Event received:', {
      type: event.type,
      id: event.id,
    });

    // Extract transaction ID from metadata
    const transactionId = event.data?.object?.metadata?.transactionId;
    if (!transactionId) {
      console.error('[OWNER STRIPE WEBHOOK] Missing transactionId in metadata');
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
      console.error('[OWNER STRIPE WEBHOOK] Transaction not found:', transactionId);
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

    if (!paymentConfig?.webhookSecret) {
      console.error('[OWNER STRIPE WEBHOOK] Webhook secret not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 400 }
      );
    }

    // Decrypt and verify signature
    const webhookSecret = await decryptWebhookSecret(paymentConfig.webhookSecret);
    const isValid = verifyStripeSignature(body, signature, webhookSecret);

    if (!isValid) {
      console.error('[OWNER STRIPE WEBHOOK] Invalid signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    console.log('[OWNER STRIPE WEBHOOK] Signature verified');

    // Handle payment intent succeeded
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const amount = paymentIntent.amount / 100; // Stripe sends amount in cents
      const currency = paymentIntent.currency.toUpperCase();

      console.log('[OWNER STRIPE WEBHOOK] Processing successful payment:', {
        paymentIntentId: paymentIntent.id,
        amount,
        currency,
        transactionId,
      });

      // Check if already processed
      if (transaction.status === 'succeeded') {
        console.log('[OWNER STRIPE WEBHOOK] Payment already processed');
        return NextResponse.json({ received: true });
      }

      // Extract payment method details
      const paymentMethod = paymentIntent.payment_method_details || {};
      const card = paymentMethod.card || {};

      // Update billing transaction
      await ownerDb
        .update(tenantBillingTransactions)
        .set({
          status: 'succeeded',
          providerResponse: paymentIntent as any,
          paymentMethod: paymentMethod.type || 'card',
          paymentMethodDetails: {
            brand: card.brand,
            last4: card.last4,
            expiryMonth: card.exp_month?.toString(),
            expiryYear: card.exp_year?.toString(),
          },
          updatedAt: new Date(),
        })
        .where(eq(tenantBillingTransactions.id, transaction.id));

      console.log('[OWNER STRIPE WEBHOOK] Transaction updated to succeeded');

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

          console.log('[OWNER STRIPE WEBHOOK] Addon subscription activated:', transaction.subscriptionId);
        } catch (tenantError) {
          console.error('[OWNER STRIPE WEBHOOK] Error activating subscription:', tenantError);
          // Don't fail webhook, payment is processed
        }
      }

      // TODO: Send confirmation email to practice admin
      // TODO: Trigger any post-purchase automation

      return NextResponse.json({ received: true });
    }

    // Handle payment intent failed
    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object;
      
      console.log('[OWNER STRIPE WEBHOOK] Payment failed:', paymentIntent.id);
      
      await ownerDb
        .update(tenantBillingTransactions)
        .set({
          status: 'failed',
          failureCode: paymentIntent.last_payment_error?.code || 'PAYMENT_FAILED',
          failureMessage: paymentIntent.last_payment_error?.message || 'Payment failed',
          providerResponse: paymentIntent as any,
          updatedAt: new Date(),
        })
        .where(eq(tenantBillingTransactions.id, transaction.id));

      return NextResponse.json({ received: true });
    }

    // Handle payment intent canceled
    if (event.type === 'payment_intent.canceled') {
      console.log('[OWNER STRIPE WEBHOOK] Payment canceled:', event.data.object.id);
      
      await ownerDb
        .update(tenantBillingTransactions)
        .set({
          status: 'canceled',
          failureCode: 'PAYMENT_CANCELED',
          failureMessage: 'Payment was canceled',
          updatedAt: new Date(),
        })
        .where(eq(tenantBillingTransactions.id, transaction.id));

      return NextResponse.json({ received: true });
    }

    // Acknowledge other events
    console.log('[OWNER STRIPE WEBHOOK] Unhandled event type:', event.type);
    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('[OWNER STRIPE WEBHOOK] Error processing webhook:', error);
    return NextResponse.json(
      { 
        error: 'Webhook handler failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
